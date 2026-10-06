"""Atomic edits keep the saved transcript intact until a complete replacement commits."""
import ast
import asyncio
import copy
import json
import logging
import queue
import threading
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any, AsyncIterator, Iterator, List, Optional
from unittest.mock import Mock

import pytest
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient
from starlette.concurrency import run_in_threadpool

from api import conversations
from api.atomic_regeneration import atomic_regeneration_events
from api.sse import queue_sse_events

ROOT = Path(__file__).resolve().parents[1] / 'api'


def saved_row(message_id: int, role: str = 'user') -> tuple[Any, ...]:
    return (message_id, role, f'Original {message_id}', f'Answer {message_id}', datetime(2026, 10, 6), [], False, False, None, 'english', 0.1, None, f'old-{message_id}')


def snapshot(rows: Optional[list[tuple[Any, ...]]] = None) -> conversations.RegenerationSnapshot:
    rows = rows or [saved_row(1), saved_row(2), saved_row(3)]
    return conversations.RegenerationSnapshot('conv-a', 'learner-a', 2, rows, conversations._transcript_revision(rows))


COMPLETE = [
    {'type': 'metadata', 'sources': [{'name': 'Reference'}], 'used_rag': True, 'used_web_search': False},
    {'type': 'chunk', 'content': 'Edited reply'}, {'type': 'done', 'response_time': 0.2, 'complete': True},
]


@pytest.mark.parametrize('events', [
    [{'type': 'error', 'content': 'Provider unavailable'}],
    [{'type': 'chunk', 'content': 'Partial'}, {'type': 'error', 'content': 'Disconnected'}],
    [{'type': 'chunk', 'content': 'Partial'}],
    [{'type': 'chunk', 'content': 'Partial'}, {'type': 'done', 'complete': False}],
    [{'type': 'cancelled', 'content': 'Stopped'}],
])
def test_generation_failure_incomplete_and_cancel_do_not_store_or_replace(events: list[dict[str, Any]]) -> None:
    store, replace = Mock(), Mock()
    result = list(atomic_regeneration_events(lambda: iter(events), store, replace, lambda: False))
    assert result[-1]['type'] in ('error', 'cancelled')
    assert not any(event['type'] == 'done' for event in result)
    store.assert_not_called(); replace.assert_not_called()


def test_success_terminal_follows_storage_and_single_replacement() -> None:
    actions = []
    files = [{'url': 's3://approved/new.txt', 'filename': 'new.txt', 'type': 'document'}]
    def store() -> list[dict[str, Any]]:
        actions.append('store'); return files
    def replace(text: str, metadata: dict[str, Any], attachments: list[dict[str, Any]]) -> int:
        assert text == 'Edited reply' and metadata['sources'] == COMPLETE[0]['sources'] and attachments == files
        actions.append('commit'); return 99
    events = atomic_regeneration_events(lambda: iter(COMPLETE), store, replace, lambda: False)
    assert next(events)['type'] == 'metadata' and actions == []
    assert next(events)['type'] == 'chunk' and actions == []
    assert next(events) == {'type': 'done', 'response_time': 0.2, 'complete': True, 'message_id': 99, 'edit_protocol': 'atomic-v1'}
    assert actions == ['store', 'commit']
    with pytest.raises(StopIteration): next(events)


@pytest.mark.parametrize('failure', ['storage', 'rollback', 'conflict'])
def test_storage_or_commit_failures_never_emit_terminal_success(failure: str) -> None:
    store = Mock(return_value=[])
    replace = Mock(return_value=99)
    if failure == 'storage': store.side_effect = RuntimeError('private bucket detail')
    elif failure == 'rollback': replace.side_effect = RuntimeError('private database detail')
    else: replace.side_effect = conversations.RegenerationConflict()
    result = list(atomic_regeneration_events(lambda: iter(COMPLETE), store, replace, lambda: False))
    assert result[-1]['type'] == 'error' and 'private' not in result[-1]['content']
    assert not any(event['type'] == 'done' for event in result)
    if failure == 'storage': replace.assert_not_called()


def test_cancel_after_generation_before_commit_preserves_original() -> None:
    cancelled = False
    def store() -> list[dict[str, Any]]:
        nonlocal cancelled
        cancelled = True; return []
    replace = Mock()
    result = list(atomic_regeneration_events(lambda: iter(COMPLETE), store, replace, lambda: cancelled))
    assert result[-1]['type'] == 'cancelled'; replace.assert_not_called()


class TransactionConnection:
    def __init__(self, rows: list[tuple[Any, ...]], owned: bool = True, fail: Optional[str] = None):
        self.live = copy.deepcopy(rows); self.staged = copy.deepcopy(rows)
        self.owned, self.fail = owned, fail
        self.executions = []; self.committed = self.rolled_back = self.closed = False
        self.cursor_closed = False; self.fetchone_value = None
    def cursor(self) -> 'TransactionConnection': return self
    def execute(self, query: str, params: tuple[Any, ...]) -> None:
        normalized = ' '.join(query.split()); self.executions.append((normalized, params))
        if normalized.startswith('SELECT id FROM conversations'):
            self.fetchone_value = ('conv-a',) if self.owned else None
        elif normalized.startswith('DELETE'):
            self.staged = [row for row in self.staged if row[0] not in params[2]]
        elif normalized.startswith('INSERT'):
            if self.fail == 'insert': raise RuntimeError('insert failed')
            self.staged.append(saved_row(99)); self.fetchone_value = (99,)
    def fetchone(self) -> Any: return self.fetchone_value
    def fetchall(self) -> list[tuple[Any, ...]]: return copy.deepcopy(self.staged)
    def commit(self) -> None:
        if self.fail == 'commit': raise RuntimeError('commit failed')
        self.live = self.staged; self.committed = True
    def rollback(self) -> None: self.staged = copy.deepcopy(self.live); self.rolled_back = True
    def close(self) -> None:
        if not self.cursor_closed: self.cursor_closed = True
        else: self.closed = True


def swap(snapshot_value: conversations.RegenerationSnapshot, cancelled: Any = lambda: False) -> int:
    return conversations.replace_regenerated_exchange(snapshot_value, 'Edited question', 'Edited reply', 'english', [], False, False, 0.2, 'session', 'new-pending', [{'url': 's3://approved/new.txt', 'filename': 'new.txt', 'type': 'document'}], cancelled)


def test_atomic_swap_removes_inclusive_suffix_and_inserts_replacement_once(monkeypatch: pytest.MonkeyPatch) -> None:
    original = snapshot(); conn = TransactionConnection(original.rows)
    monkeypatch.setattr(conversations, 'get_db_connection_with_retry', lambda: conn)
    assert swap(original) == 99
    assert [row[0] for row in conn.live] == [1, 99]
    assert conn.committed and not conn.rolled_back and conn.closed
    deletes = [entry for entry in conn.executions if entry[0].startswith('DELETE')]
    assert deletes[0][1] == ('conv-a', 'learner-a', [2, 3])
    assert len([entry for entry in conn.executions if entry[0].startswith('INSERT')]) == 1
    assert 'FOR UPDATE' in conn.executions[0][0]
    assert 'FOR UPDATE OF logs' in conn.executions[1][0]


@pytest.mark.parametrize('failure', ['insert', 'commit', 'cancel', 'owner', 'changed'])
def test_failed_atomic_swap_rolls_back_original_rows(monkeypatch: pytest.MonkeyPatch, failure: str) -> None:
    original = snapshot(); rows = original.rows + ([saved_row(4)] if failure == 'changed' else [])
    conn = TransactionConnection(rows, owned=failure != 'owner', fail=failure)
    monkeypatch.setattr(conversations, 'get_db_connection_with_retry', lambda: conn)
    checks = 0
    def cancelled() -> bool:
        nonlocal checks
        checks += 1; return failure == 'cancel' and checks == 2
    with pytest.raises((RuntimeError, conversations.RegenerationConflict, conversations.RegenerationCancelled)):
        swap(original, cancelled)
    assert conn.live == rows and conn.rolled_back and not conn.committed and conn.closed


def test_prefix_context_excludes_original_suffix_and_system_rows() -> None:
    original = snapshot([saved_row(1), saved_row(4, 'system'), saved_row(2), saved_row(3)])
    assert conversations.regeneration_prefix_rows(original) == [(original.rows[0][2], original.rows[0][3], None, None, original.rows[0][4])]


@pytest.mark.parametrize('role,missing', [('system', False), ('assistant', False), ('user', True)])
def test_snapshot_rejects_wrong_role_and_missing_boundary(monkeypatch: pytest.MonkeyPatch, role: str, missing: bool) -> None:
    rows = [saved_row(1)] if missing else [saved_row(2, role)]
    conn = TransactionConnection(rows)
    monkeypatch.setattr(conversations, 'get_db_connection_with_retry', lambda: conn)
    assert conversations.get_regeneration_snapshot('conv-a', 2, 'learner-a') is None
    query, params = conn.executions[0]
    assert params == ('conv-a', 'learner-a', 'learner-a') and 'deleted_at IS NULL' in query


def endpoint_namespace(snap: Any = None) -> dict[str, Any]:
    async def verify(authorization: Optional[str]) -> str:
        if authorization != 'Bearer token': raise HTTPException(401, 'Authentication required')
        return 'learner-a'
    return {
        'app': FastAPI(), 'Request': Request, 'Header': Header, 'Form': Form, 'File': File, 'UploadFile': UploadFile,
        'Optional': Optional, 'List': List, 'Any': Any, 'Iterator': Iterator, 'AsyncIterator': AsyncIterator, 'StreamingResponse': StreamingResponse,
        'HTTPException': HTTPException, 'verify_user': verify, 'run_in_threadpool': run_in_threadpool,
        'threading': threading, 'queue': queue, 'queue_sse_events': queue_sse_events,
        'atomic_regeneration_events': atomic_regeneration_events, 'MAX_UPLOAD_FILES': 10,
        'MAX_UPLOAD_TOTAL_BYTES': 50 * 1024 * 1024, 'MAX_UPLOAD_TOTAL_SIZE_MB': 50,
        'conversations': SimpleNamespace(get_regeneration_snapshot=Mock(return_value=snap), regeneration_prefix_rows=conversations.regeneration_prefix_rows, replace_regenerated_exchange=Mock(return_value=99), RegenerationCancelled=conversations.RegenerationCancelled),
        'conversation_rows_to_history': lambda rows: [{'role': 'user', 'content': row[0]} for row in rows],
        'read_upload_with_limit': Mock(), 'process_uploaded_file': Mock(), 'safe_upload_filename': lambda name: name,
        'upload_file_to_s3': Mock(return_value='s3://approved/new.txt'),
        'get_chatbot_response_stream': Mock(side_effect=lambda **kwargs: iter(COMPLETE)),
        'is_message_cancelled': lambda pending: False, 'cancel_pending_message': Mock(), 'cleanup_cancelled_message': Mock(),
    }


def load_endpoint(namespace: dict[str, Any]) -> Any:
    source = ROOT / 'main.py'
    node = next(node for node in ast.parse(source.read_text()).body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'regenerate_conversation_message')
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), 'exec'), namespace)
    return namespace['regenerate_conversation_message']


def request_body(revision: str) -> dict[str, Any]:
    return {'message': 'Edited', 'mode': 'english', 'pending_id': 'new-pending', 'conversation_id': 'conv-a', 'edit_revision': revision, 'intent': 'explain'}


@pytest.mark.parametrize('failure,status', [('auth', 401), ('missing', 404), ('cid', 400), ('revision', 409)])
def test_endpoint_guards_before_upload_provider_or_swap(failure: str, status: int) -> None:
    original = snapshot(); namespace = endpoint_namespace(None if failure == 'missing' else original)
    load_endpoint(namespace); client = TestClient(namespace['app']); body = request_body(original.revision)
    if failure == 'cid': body['conversation_id'] = 'conv-b'
    if failure == 'revision': body['edit_revision'] = 'stale-revision'
    response = client.post('/api/conversations/conv-a/messages/2/regenerate', json=body, headers={} if failure == 'auth' else {'Authorization': 'Bearer token'})
    assert response.status_code == status
    namespace['get_chatbot_response_stream'].assert_not_called(); namespace['upload_file_to_s3'].assert_not_called()
    namespace['conversations'].replace_regenerated_exchange.assert_not_called()


def test_endpoint_transports_prefix_deferred_persistence_and_done_after_swap() -> None:
    original = snapshot(); namespace = endpoint_namespace(original)
    load_endpoint(namespace); client = TestClient(namespace['app'])
    response = client.post('/api/conversations/conv-a/messages/2/regenerate', json=request_body(original.revision), headers={'Authorization': 'Bearer token'})
    assert response.status_code == 200 and '"message_id": 99' in response.text
    options = namespace['get_chatbot_response_stream'].call_args.kwargs
    assert options['persist'] is False and options['history_override'] == [{'role': 'user', 'content': 'Original 1'}]
    namespace['conversations'].replace_regenerated_exchange.assert_called_once()
    assert namespace['conversations'].replace_regenerated_exchange.call_args.args[1:3] == ('Edited', 'Edited reply')


def test_disconnect_before_completion_cancels_without_swap() -> None:
    original = snapshot(); namespace = endpoint_namespace(original); endpoint = load_endpoint(namespace)
    release = threading.Event(); finished = threading.Event()
    def provider(**kwargs: Any) -> Iterator[dict[str, Any]]:
        yield {'type': 'chunk', 'content': 'Partial'}
        release.wait(timeout=2)
        yield {'type': 'done', 'complete': True, 'response_time': 0.1}
    namespace['get_chatbot_response_stream'].side_effect = provider
    namespace['cleanup_cancelled_message'].side_effect = lambda pending: finished.set()
    async def run() -> None:
        async def body() -> dict[str, Any]: return request_body(original.revision)
        async def disconnected() -> bool: return True
        request = SimpleNamespace(headers={'content-type': 'application/json'}, json=body, is_disconnected=disconnected)
        response = await endpoint('conv-a', 2, request, authorization='Bearer token')
        assert [frame async for frame in response.body_iterator] == []
    asyncio.run(run()); release.set(); assert finished.wait(timeout=2)
    namespace['conversations'].replace_regenerated_exchange.assert_not_called()


@pytest.mark.parametrize('owned', [True, False])
def test_owner_message_dto_binds_atomic_edit_to_exact_read_revision(monkeypatch: pytest.MonkeyPatch, owned: bool) -> None:
    original = snapshot(); conn = TransactionConnection(original.rows)
    monkeypatch.setattr(conversations, 'get_db_connection_with_retry', lambda: conn)
    result = conversations.get_conversation_messages('conv-a', user_id='learner-a' if owned else None)
    user_message = next(message for message in result.messages if message.id == 2 and message.role == 'user')
    assert user_message.edit_protocol == ('atomic-v1' if owned else None)
    assert user_message.edit_revision == (original.revision if owned else None)


def deferred_stream_namespace(failure: str) -> dict[str, Any]:
    import time
    from types import SimpleNamespace as NS
    cancelled = {'value': False}
    def chunks() -> Iterator[Any]:
        yield NS(choices=[NS(finish_reason=None)], content='Edited reply')
        if failure == 'cancel': cancelled['value'] = True
        yield NS(choices=[NS(finish_reason='length' if failure == 'length' else 'stop')], content=None)
    create = Mock(side_effect=RuntimeError('provider detail')) if failure == 'provider' else Mock(side_effect=lambda **kwargs: chunks())
    budget = NS(rag_context=100, conversation_history=1000, current_message=1000, response_buffer=100, total=10000)
    return {
        'Iterator': Iterator, 'time': time, 'logger': logging.getLogger(__name__), 'LLM_MODEL_ID': 'fake',
        '_normalize_image_inputs': lambda **kwargs: [], 'TokenBudget': lambda: budget, 'TokenManager': lambda **kwargs: NS(budget=budget),
        'is_message_cancelled': lambda pending: cancelled['value'], 'cleanup_cancelled_message': Mock(),
        'get_conversation_history': Mock(side_effect=AssertionError('Atomic edit must not fetch full history')),
        'detect_image_context': lambda *args, **kwargs: NS(school_announcement=False, card_ids=[]),
        'is_full_image_translation_request': lambda *args, **kwargs: False,
        'build_image_translation_query': lambda message, context: (message, None),
        'build_contextual_retrieval_query': lambda message, history: message,
        'MODE_PROMPTS': {'english': {'prompt': ''}}, 'should_use_web_search': lambda message: (False, None),
        'resolve_school_message_context': lambda *args, **kwargs: ('', False, []), 'get_rag_context': lambda *args, **kwargs: ('', []),
        'tutor_task_guidance': lambda intent: '', 'SKILL_LEVEL_MODIFIERS': {}, '_history_has_images': lambda history: False,
        'build_translation_structure_hints': lambda message: '', 'translation_prompt_guidance': lambda *args, **kwargs: '',
        'is_passage_translation': lambda message: False, 'NO_REFERENCE_GUARD': '',
        'assemble_system_prompt': lambda prompt, rag, web, budget: (prompt, False),
        'count_message_tokens': lambda messages: 10, 'count_tokens': lambda message: 10,
        '_build_current_user_message': lambda message, images: {'role': 'user', 'content': message},
        'format_source_citations': lambda sources: sources,
        'get_client_for_request': lambda **kwargs: (NS(chat=NS(completions=NS(create=create))), 'fake'),
        '_get_max_llm_retries': lambda: 1, 'optional_chat_completion_kwargs': lambda model: {},
        '_extract_stream_chunk_content_and_empty_choice': lambda chunk: (chunk.content or '', False),
        '_is_retryable_llm_error': lambda error: False, '_is_context_length_error': lambda error: False,
        '_is_provider_credit_error': lambda error: False, 'log_conversation': Mock(),
    }


@pytest.mark.parametrize('failure', ['success', 'provider', 'cancel', 'length'])
def test_real_stream_pipeline_never_logs_tentative_atomic_edits(failure: str) -> None:
    namespace = deferred_stream_namespace(failure)
    source = ROOT / 'chatbot_service.py'
    node = next(node for node in ast.parse(source.read_text()).body if isinstance(node, ast.FunctionDef) and node.name == 'get_chatbot_response_stream')
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), 'exec'), namespace)
    events = list(namespace['get_chatbot_response_stream']('Edited question', conversation_id='conv-a', pending_id='pending', history_override=[], persist=False))
    namespace['log_conversation'].assert_not_called(); namespace['cleanup_cancelled_message'].assert_not_called()
    if failure == 'success': assert events[-1]['type'] == 'done' and events[-1]['complete'] is True
    elif failure == 'provider': assert events[-1]['type'] == 'error'
    elif failure == 'cancel': assert events[-1]['type'] == 'cancelled'
    else: assert events[-1]['type'] == 'done' and events[-1]['complete'] is False


def test_multipart_attachment_storage_failure_keeps_old_exchange(monkeypatch: pytest.MonkeyPatch) -> None:
    original = snapshot(); namespace = endpoint_namespace(original)
    async def read(upload: UploadFile) -> bytes: return await upload.read()
    namespace['read_upload_with_limit'] = read
    namespace['process_uploaded_file'] = lambda *args: {'text_content': 'Document text'}
    namespace['upload_file_to_s3'].return_value = None
    load_endpoint(namespace); client = TestClient(namespace['app'])
    response = client.post('/api/conversations/conv-a/messages/2/regenerate',
        data=request_body(original.revision), files={'files': ('note.txt', b'Document text', 'text/plain')},
        headers={'Authorization': 'Bearer token'})
    assert response.status_code == 200 and '"type": "error"' in response.text
    assert '"type": "done"' not in response.text
    namespace['conversations'].replace_regenerated_exchange.assert_not_called()
    assert namespace['get_chatbot_response_stream'].call_args.kwargs['message'].startswith('Edited\n\n--- Document Content ---')


@pytest.mark.parametrize('persist', [False, True])
def test_image_page_pipeline_defers_logging_only_for_atomic_edits(persist: bool) -> None:
    import time
    source = ROOT / 'chatbot_service.py'
    node = next(node for node in ast.parse(source.read_text()).body if isinstance(node, ast.FunctionDef) and node.name == '_image_translation_events')
    namespace = {
        'ImageTranslationContext': object, 'Iterator': Iterator, 'Any': Any, 'time': time,
        'get_client_for_request': lambda **kwargs: (SimpleNamespace(), 'fake'),
        'build_image_translation_query': lambda message, context: (message, None),
        'resolve_school_message_context': lambda *args, **kwargs: ('', False, []),
        'MODE_PROMPTS': {'english': {'prompt': ''}}, 'SKILL_LEVEL_MODIFIERS': {},
        'tutor_task_guidance': lambda intent: '', 'build_translation_structure_hints': lambda message: '',
        'translate_image_pages': lambda **kwargs: iter([
            {'type': 'metadata', 'sources': [], 'translation_incomplete': False},
            {'type': 'chunk', 'content': 'Complete page reply'},
        ]), 'get_rag_context': Mock(), 'format_source_citations': lambda sources: sources,
        'is_message_cancelled': lambda pending: False, 'log_conversation': Mock(), 'cleanup_cancelled_message': Mock(),
    }
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), 'exec'), namespace)
    context = SimpleNamespace(school_announcement=False, card_ids=[])
    events = list(namespace['_image_translation_events'](image_context=context, images=[], message='Edited', message_for_logging='Edited', mode='english', session_id=None, user_id='learner-a', conversation_id='conv-a', image_url=None, file_urls=None, pending_id='pending', start_time=time.time(), past_messages=[], skill_level=None, persist=persist))
    assert events[-1]['type'] == 'done'
    if persist:
        namespace['log_conversation'].assert_called_once(); namespace['cleanup_cancelled_message'].assert_called_once()
        assert 'complete' not in events[-1]
    else:
        namespace['log_conversation'].assert_not_called(); namespace['cleanup_cancelled_message'].assert_not_called()
        assert events[-1]['complete'] is True
