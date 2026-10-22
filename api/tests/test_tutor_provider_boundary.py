"""The real service/route refund boundary, without paid model requests."""
import ast
import os
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from test_atomic_regeneration import deferred_stream_namespace
from test_multi_image_message import _load_image_helpers
from test_tutor_reservations import (AUTH, ID, TODAY, api_reserve, count, db, endpoint,
                                     payload, reservations, reserve)


def service(namespace, name='get_chatbot_response_stream'):
    path = Path(os.environ.get('TUTOR_SERVICE_SOURCE', Path(__file__).resolve().parents[1] / 'api/chatbot_service.py'))
    node = next(n for n in ast.parse(path.read_text()).body if isinstance(n, ast.FunctionDef) and n.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(path), 'exec'), namespace)
    return namespace[name]


def configured(case):
    ns = deferred_stream_namespace('provider' if case == 'provider_error' else 'success')
    ns['get_conversation_history'] = lambda _: []
    ns['log_conversation'].return_value = True
    ns['IMAGE_FOLLOWUP_GUIDANCE'] = ''
    if case == 'budget':
        ns['TokenBudget']().total = 1
        ns['get_rag_context'] = Mock(return_value=('', []))
    if case == 'retrieval':
        ns['get_rag_context'] = Mock(side_effect=RuntimeError('reference lookup failed'))
    if case == 'request_setup':
        ns['optional_chat_completion_kwargs'] = Mock(side_effect=RuntimeError('request configuration failed'))
    if case == 'early_cancel':
        ns['is_message_cancelled'] = lambda _: True
    if case in ('vision_then_budget', 'vision_setup'):
        ns['_normalize_image_inputs'] = lambda **_: [{'data': 'image', 'content_type': 'image/png'}]
        detect = _load_image_helpers()[3]
        if case == 'vision_setup':
            detect.__globals__['get_client_for_request'] = Mock(side_effect=RuntimeError('vision client unavailable'))
            ns['get_client_for_request'] = detect.__globals__['get_client_for_request']
        else:
            ns['TokenBudget']().total = 1
        ns['detect_image_context'] = detect
    return ns


@pytest.mark.parametrize('case,charged', [
    ('budget', False), ('retrieval', False), ('early_cancel', False),
    ('vision_setup', False), ('request_setup', False), ('provider_error', True), ('vision_then_budget', True),
])
def test_real_service_and_route_refund_only_before_chat_or_vision_request(endpoint, db, case, charged):
    client, generator = endpoint
    ns = configured(case)
    generate = service(ns)
    generator.side_effect = generate
    first = api_reserve(client)
    response = client.post('/api/chat/stream', headers=AUTH, json=payload(first))
    assert response.status_code == 200
    assert 'error' in response.text or 'cancelled' in response.text
    assert count(db) == int(charged)
    if case == 'budget':
        ns['get_rag_context'].assert_called_once()  # Lookup already ran; still refundable.
    status = client.post(f'/api/chat/reconcile/{ID}', headers=AUTH).json()
    assert status['status'] == ('failed' if charged else 'retryable')
    if not charged:
        ns['log_conversation'].assert_not_called()
        retry = api_reserve(client)
        assert retry['dispatch_token'] != first['dispatch_token']
        # A delayed first dispatch cannot run or release the new reservation.
        assert 'send_already_started' in client.post('/api/chat/stream', headers=AUTH, json=payload(first)).text
        generator.side_effect = service(configured('success'))
        assert 'Edited reply' in client.post('/api/chat/stream', headers=AUTH, json=payload(retry)).text
        assert count(db) == 1


def test_finished_owner_refunds_original_day_once_and_cannot_refund_new_dispatch(db):
    from datetime import timedelta
    yesterday = TODAY - timedelta(days=1)
    first = reserve(db, today=yesterday)
    reservations.claim_send('learner-a', ID, first['dispatch_token'], 'conv-a', connect=db)
    # Public recovery must not release a running worker, even before its callback.
    assert reservations.reconcile_send('learner-a', ID, today=TODAY, connect=db)['status'] == 'running'
    with db() as conn:
        conn.execute('INSERT INTO chat_requests VALUES (%s,%s,true)', (ID, 'learner-a'))
    finish = lambda: reservations.finish_send('learner-a', ID, 'failed', provider_started=False,
        expected_token=first['dispatch_token'], connect=db)
    finish(); finish()
    assert count(db, day=yesterday) == 0
    with db() as conn:
        assert conn.execute('SELECT count(*) FROM chat_requests').fetchone()[0] == 0
    retry = reserve(db)
    assert reservations.claim_send('learner-a', ID, retry['dispatch_token'], 'conv-a', connect=db)['claimed']
    finish()
    assert count(db) == 1
    assert reservations.get_send_status('learner-a', ID, connect=db)['status'] == 'running'


def test_service_signal_is_monotonic_and_precedes_immediate_provider_exception():
    ns = configured('provider_error')
    starts = Mock()
    client, _ = ns['get_client_for_request']()
    client.chat.completions.create.side_effect = lambda **_: (starts.assert_called_once(), (_ for _ in ()).throw(RuntimeError('provider failed')))[1]
    events = list(service(ns)('Question', history_override=[], on_provider_start=starts))
    starts.assert_called_once()
    assert events[-1]['type'] == 'error'


@pytest.mark.parametrize('streaming', [False, True])
def test_image_translation_signals_before_completion_and_stream_requests(streaming):
    ns = configured('success')
    starts = Mock()
    client, _ = ns['get_client_for_request']()
    client.chat.completions.create.side_effect = lambda **_: (starts.assert_called_once(), (_ for _ in ()).throw(RuntimeError('provider failed')))[1]
    def translate(**kwargs):
        if streaming:
            list(kwargs['stream_text'](messages=[]))
        else:
            kwargs['complete'](messages=[])
        yield {'type': 'chunk', 'content': 'unreachable'}
    ns.update(ImageTranslationContext=object, Any=object,
        photo_translation_streaming_enabled=lambda: streaming,
        transcription_image_detail=lambda _: 'original',
        translate_image_pages=translate, translate_image_pages_legacy=translate)
    generate = service(ns, '_image_translation_events')
    with pytest.raises(RuntimeError, match='provider failed'):
        list(generate(image_context=SimpleNamespace(school_announcement=False, card_ids=[]), images=[],
            message='Question', message_for_logging='Question', mode='english', session_id=None,
            user_id='learner-a', conversation_id='conv-a', image_url=None, file_urls=None,
            pending_id=ID, start_time=ns['time'].time(), past_messages=[], skill_level=None,
            on_provider_start=starts))
    starts.assert_called_once()


def test_vision_then_text_calls_signal_only_once():
    ns = configured('success')
    ns['_normalize_image_inputs'] = lambda **_: [{'data': 'image', 'content_type': 'image/png'}]
    ns['detect_image_context'] = _load_image_helpers()[3]
    starts = Mock()
    events = list(service(ns)('Question', history_override=[], on_provider_start=starts))
    assert events[-1]['type'] == 'done'
    starts.assert_called_once()
