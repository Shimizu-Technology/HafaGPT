"""A generated answer is not a saved answer until its transaction commits."""
import ast
import logging
import queue
import threading
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api import chat_requests, conversations
from api.models import SharedConversationResponse
from test_atomic_regeneration import TransactionConnection, deferred_stream_namespace, snapshot
from test_conversation_recency import FakeConnection, _load_log_conversation

ROOT = Path(__file__).resolve().parents[1] / 'api'


def load_function(name, namespace):
    path = ROOT / 'chatbot_service.py'
    node = next(node for node in ast.parse(path.read_text()).body if isinstance(node, ast.FunctionDef) and node.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(path), 'exec'), namespace)
    return namespace[name]


def test_exact_request_identifier_is_available_on_both_owner_scoped_message_rows(monkeypatch):
    original = snapshot()
    connection = TransactionConnection(original.rows)
    monkeypatch.setattr(conversations, 'get_db_connection_with_retry', lambda: connection)
    response = conversations.get_conversation_messages('conv-a', user_id='learner-a')
    assert [(message.role, message.pending_id) for message in response.messages] == [
        (role, f'old-{number}') for number in (1, 2, 3) for role in ('user', 'assistant')
    ]
    query, params = next((query, params) for query, params in connection.executions if 'FROM conversation_logs' in query)
    assert 'pending_id' in query and 'AND user_id = %s' in query
    assert params == ('conv-a', 'learner-a')


def test_public_transcript_does_not_expose_owner_recovery_identifiers(monkeypatch):
    connection = TransactionConnection(snapshot().rows)
    monkeypatch.setattr(conversations, 'get_db_connection_with_retry', lambda: connection)
    response = conversations.get_conversation_messages('conv-a')
    assert len(response.messages) == 6
    assert all(message.pending_id is None for message in response.messages)
    assert 'old-' not in response.model_dump_json()


def test_public_share_response_keeps_transcript_without_owner_recovery_identifiers(monkeypatch):
    original = snapshot()
    share_connection = Mock()
    share_connection.cursor.return_value.fetchone.return_value = (
        'public-share', 'conv-a', None, 2, 'Shared learning chat', original.rows[0][4],
    )
    connections = iter([share_connection, TransactionConnection(original.rows)])
    monkeypatch.setattr(conversations, 'get_db_connection_with_retry', lambda: next(connections))
    path = ROOT / 'main.py'
    node = next(node for node in ast.parse(path.read_text()).body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'get_shared_conversation')
    app = FastAPI()
    namespace = {'app': app, 'conversations': conversations, 'HTTPException': HTTPException,
        'datetime': datetime, 'SharedConversationResponse': SharedConversationResponse, 'logger': logging.getLogger(__name__)}
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(path), 'exec'), namespace)
    response = TestClient(app).get('/api/share/public-share')
    assert response.status_code == 200
    assert response.json()['title'] == 'Shared learning chat'
    assert len(response.json()['messages']) == 6
    assert all(message['pending_id'] is None for message in response.json()['messages'])
    assert 'old-' not in response.text


@pytest.mark.parametrize('failure_at', ['connect', 'insert', 'commit'])
def test_save_failure_is_explicit_and_private_database_details_are_not_logged(failure_at, caplog):
    save = _load_log_conversation()
    connection = FakeConnection()
    if failure_at == 'insert':
        connection.cursor_instance.execute = Mock(side_effect=RuntimeError('private database credential'))
    if failure_at == 'commit':
        connection.commit = Mock(side_effect=RuntimeError('private database credential'))
    save.__globals__.update({
        '_get_db_connection_with_retry': Mock(side_effect=RuntimeError('private database credential')) if failure_at == 'connect' else lambda: connection,
        'logger': logging.getLogger(__name__),
    })
    with caplog.at_level(logging.ERROR):
        assert save('Question', 'Answer', 'english', [], False, False, .1) is False
    assert 'private database credential' not in caplog.text
    if failure_at != 'connect':
        assert connection.closed and connection.cursor_instance.closed


@pytest.mark.parametrize('saved', [True, False])
@pytest.mark.parametrize('case', ['success', 'cancel', 'early_cancel'])
def test_stream_preserves_answer_and_reports_actual_save_outcome(saved, case):
    namespace = deferred_stream_namespace('cancel' if case == 'cancel' else 'success')
    namespace['log_conversation'].return_value = saved
    if case == 'early_cancel':
        namespace['is_message_cancelled'] = lambda pending: True
    stream = load_function('get_chatbot_response_stream', namespace)
    events = list(stream('Question', conversation_id='conv-a', pending_id='pending_abcdefgh', history_override=[]))
    terminal = events[-1]
    assert terminal['type'] == ('done' if case == 'success' else 'cancelled')
    assert terminal['saved'] is saved
    assert bool(terminal.get('save_warning')) is (not saved)
    if case != 'early_cancel':
        assert any(event.get('content') == 'Edited reply' for event in events)
    namespace['log_conversation'].assert_called_once()
    namespace['cleanup_cancelled_message'].assert_called_once()


@pytest.mark.parametrize('saved', [True, False])
@pytest.mark.parametrize('cancelled', [True, False])
def test_nonstream_response_reports_save_outcome_without_losing_answer(saved, cancelled):
    namespace = deferred_stream_namespace('success')
    namespace['log_conversation'].return_value = saved
    namespace['get_conversation_history'] = lambda conversation: []
    namespace['_extract_non_stream_response_text'] = lambda response: response.choices[0].message.content
    namespace['get_client_for_request'] = lambda **kwargs: (
        SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **kwargs:
            SimpleNamespace(choices=[SimpleNamespace(finish_reason='stop', message=SimpleNamespace(content='Nonstream reply'))])))), 'fake')
    if cancelled:
        namespace['is_message_cancelled'] = lambda pending: True
    respond = load_function('get_chatbot_response', namespace)
    result = respond('Question', conversation_id='conv-a', pending_id='pending_abcdefgh')
    assert result['response'] == ('[Message was cancelled by user]' if cancelled else 'Nonstream reply')
    assert result['saved'] is saved and bool(result.get('save_warning')) is (not saved)


@pytest.mark.parametrize('saved', [True, False])
@pytest.mark.parametrize('cancelled', [True, False])
def test_photo_terminal_waits_for_persistence_and_preserves_chunks(saved, cancelled):
    namespace = deferred_stream_namespace('success')
    namespace.update({
        'ImageTranslationContext': object, 'Any': object,
        'photo_translation_streaming_enabled': lambda: True,
        'transcription_image_detail': lambda model: 'original',
        'translate_image_pages': lambda **kwargs: iter([
            {'type': 'metadata', 'sources': [], 'translation_incomplete': False, 'generation_complete': True},
            {'type': 'chunk', 'content': 'Photo reply'},
            *([{'type': 'cancelled'}] if cancelled else []),
        ]),
    })
    namespace['log_conversation'].return_value = saved
    stream = load_function('_image_translation_events', namespace)
    events = stream(image_context=SimpleNamespace(school_announcement=False, card_ids=[]), images=[],
        message='Question', message_for_logging='Question', mode='english', session_id=None,
        user_id='learner-a', conversation_id='conv-a', image_url=None, file_urls=None,
        pending_id='pending_abcdefgh', start_time=namespace['time'].time(), past_messages=[], skill_level=None)
    assert next(events)['type'] == 'metadata'
    assert next(events) == {'type': 'chunk', 'content': 'Photo reply'}
    namespace['log_conversation'].assert_not_called()
    terminal = next(events)
    assert terminal['type'] == ('cancelled' if cancelled else 'done')
    assert terminal['saved'] is saved and bool(terminal.get('save_warning')) is (not saved)
    namespace['log_conversation'].assert_called_once()


@pytest.mark.parametrize('terminal_type', ['done', 'cancelled'])
@pytest.mark.parametrize('saved', [True, False])
def test_request_tracker_records_failed_for_unsaved_terminal_without_losing_live_events(terminal_type, saved):
    path = ROOT / 'main.py'
    tree = ast.parse(path.read_text())
    endpoint = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'chat_stream')
    node = next(node for node in ast.walk(endpoint) if isinstance(node, ast.FunctionDef) and node.name == 'run_sync_generator')
    events = [{'type': 'chunk', 'content': 'Keep this reply'}, {'type': terminal_type, 'saved': saved}]
    tracker = Mock()
    event_queue = queue.Queue()
    namespace = {key: None for key in ('mode', 'session_id', 'image_base64', 'file_url', 'skill_level', 'intent', 'learning_topic_id')}
    namespace.update({
        'pending_id': 'pending_abcdefgh', 'user_id': 'learner-a', 'conversation_id': 'conv-a',
        'final_message': 'Question', 'message': 'Question', 'all_image_inputs': [],
        'chat_requests': SimpleNamespace(valid_pending_id=lambda pending: True, RequestTracker=Mock(return_value=tracker), terminal_status=chat_requests.terminal_status),
        'cancel_pending_message': Mock(), 'get_chatbot_response_stream': lambda **kwargs: iter(events),
        'event_queue': event_queue, 'stream_done': threading.Event(),
        'cleanup_cancelled_message': Mock(), 'logger': logging.getLogger(__name__),
    })
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(path), 'exec'), namespace)
    namespace['run_sync_generator']()
    assert [event_queue.get_nowait(), event_queue.get_nowait()] == events
    tracker.finish.assert_called_once_with('failed' if not saved else 'complete' if terminal_type == 'done' else 'cancelled')
    assert namespace['stream_done'].is_set()
