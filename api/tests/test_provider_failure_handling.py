"""A provider outage is a retry message and one alert, never an answer.

Every test simulates the real OpenRouter 402 that exhausted credit on Sep 14.
Each chat path must show the learner a short message with none of the provider's
text, fire exactly one alert however many learners hit it, and store nothing.
"""
import ast
import asyncio
import json
import logging
import queue
import threading
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Optional
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

import sentry_sdk

from api import atomic_regeneration, conversations, provider_errors
from api.atomic_regeneration import atomic_regeneration_events
from api.provider_errors import (
    PROVIDER_BUSY_MESSAGE, PROVIDER_RETRY_MESSAGE, MalformedProviderResponse, TurnFailed,
    classify_provider_error, report_if_provider_error, report_provider_failure,
)
from test_atomic_regeneration import TransactionConnection, deferred_stream_namespace, saved_row, snapshot
from test_multi_image_message import _load_image_helpers

ROOT = Path(__file__).resolve().parents[1] / 'api'
RAW_TEXT = "Error code: 402 - {'error': {'message': 'Insufficient credits. Add more using https://openrouter.ai/settings/credits', 'code': 402}}"
LEAKS = ('402', 'insufficient', 'credits', 'openrouter', 'Error code')


class ProviderPaymentRequired(Exception):
    """Shape of openai.APIStatusError for the 402 OpenRouter returned."""
    status_code = 402


def payment_required() -> Exception:
    return ProviderPaymentRequired(RAW_TEXT)


def assert_friendly(text: str) -> None:
    assert text in (PROVIDER_RETRY_MESSAGE, provider_errors.PROVIDER_INTERRUPTED_MESSAGE)
    assert not any(leak.lower() in text.lower() for leak in LEAKS)


@pytest.fixture(autouse=True)
def alerts(monkeypatch):
    provider_errors.reset_alert_state()
    sent = Mock()
    monkeypatch.setattr(provider_errors, '_send_alert', sent)
    yield sent
    provider_errors.reset_alert_state()


def load(name: str, namespace: dict[str, Any], filename: str = 'chatbot_service.py', kind=ast.FunctionDef):
    path = ROOT / filename
    node = next(n for n in ast.parse(path.read_text()).body if isinstance(n, kind) and n.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(path), 'exec'), namespace)
    return namespace[name]


def failing_client(error: Exception):
    def create(**_kwargs):
        raise error
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))


def stream_namespace(error: Exception | None = None):
    namespace = deferred_stream_namespace('success')
    namespace['get_conversation_history'] = lambda _: []
    if error is not None:
        namespace['get_client_for_request'] = lambda **_: (failing_client(error), 'fake')
    return namespace


def nonstream_namespace(error: Exception):
    namespace = stream_namespace(error)
    namespace['_extract_non_stream_response_text'] = lambda response: response.choices[0].message.content
    return namespace


def run_stream(namespace, **kwargs):
    stream = load('get_chatbot_response_stream', namespace)
    return list(stream('Hafa adai', conversation_id='conv-a', pending_id='pending_abcdefgh', **kwargs))


# --- text chat, streaming and not -------------------------------------------------

def test_streaming_402_shows_friendly_message_alerts_once_and_stores_nothing(alerts):
    for _ in range(3):
        namespace = stream_namespace(payment_required())
        events = run_stream(namespace)
        assert events[-1]['type'] == 'error'
        assert_friendly(events[-1]['content'])
        assert events[-1]['retryable'] is True
        assert not any(leak.lower() in json.dumps(events).lower() for leak in LEAKS)
        namespace['log_conversation'].assert_not_called()
        namespace['cleanup_cancelled_message'].assert_called_once()
    alerts.assert_called_once()
    assert alerts.call_args.args[0] == 'credit'


def test_nonstream_402_raises_friendly_failure_alerts_once_and_stores_nothing(alerts):
    for _ in range(3):
        namespace = nonstream_namespace(payment_required())
        respond = load('get_chatbot_response', namespace)
        with pytest.raises(TurnFailed) as raised:
            respond('Hafa adai', conversation_id='conv-a', pending_id='pending_abcdefgh')
        assert_friendly(raised.value.message)
        assert raised.value.status_code == 503
        assert raised.value.__cause__ is None and raised.value.__suppress_context__
        namespace['log_conversation'].assert_not_called()
    alerts.assert_called_once()


@pytest.mark.parametrize('error', [
    type('ServerError', (Exception,), {'status_code': 503})('upstream said: secret prompt text'),
    TimeoutError('read timed out while holding secret prompt text'),
    MalformedProviderResponse('LLM response had no text content'),
    ConnectionError('connection reset: secret prompt text'),
    RuntimeError('anything else the provider SDK raises'),
])
def test_other_failures_are_just_as_quiet_in_both_chat_paths(error):
    stream = stream_namespace(error)
    events = run_stream(stream)
    assert events[-1]['type'] == 'error' and events[-1]['content'] == PROVIDER_RETRY_MESSAGE
    assert 'secret' not in json.dumps(events)
    stream['log_conversation'].assert_not_called()

    nonstream = nonstream_namespace(error)
    with pytest.raises(TurnFailed) as raised:
        load('get_chatbot_response', nonstream)('Hafa adai', conversation_id='conv-a', pending_id='pending_abcdefgh')
    assert raised.value.message == PROVIDER_RETRY_MESSAGE
    nonstream['log_conversation'].assert_not_called()


def test_rate_limit_gets_the_busy_message():
    error = type('RateLimitError', (Exception,), {'status_code': 429})('Rate limit exceeded: free-models-per-day')
    events = run_stream(stream_namespace(error))
    assert events[-1]['content'] == PROVIDER_BUSY_MESSAGE


def test_stream_that_dies_midway_stores_no_partial_answer():
    namespace = deferred_stream_namespace('interrupted')
    namespace['get_conversation_history'] = lambda _: []
    events = run_stream(namespace)
    assert [event['type'] for event in events if event['type'] in ('chunk', 'error', 'done')] == ['chunk', 'error']
    assert events[-1]['content'] == provider_errors.PROVIDER_INTERRUPTED_MESSAGE
    assert 'Interrupted provider stream' not in json.dumps(events)
    namespace['log_conversation'].assert_not_called()


def test_over_long_conversation_is_not_stored_either():
    namespace = stream_namespace()
    namespace['TokenBudget']().total = 1
    events = run_stream(namespace)
    assert events[-1]['type'] == 'error' and events[-1]['code'] == 'conversation_too_long'
    namespace['log_conversation'].assert_not_called()

    namespace = nonstream_namespace(RuntimeError('unused'))
    namespace['TokenBudget']().total = 1
    with pytest.raises(TurnFailed) as raised:
        load('get_chatbot_response', namespace)('Hafa adai', conversation_id='conv-a', pending_id='pending_abcdefgh')
    assert raised.value.status_code == 422
    namespace['log_conversation'].assert_not_called()


# --- vision -----------------------------------------------------------------------

def vision_namespace(error: Exception):
    namespace = stream_namespace(error)
    namespace['_normalize_image_inputs'] = lambda **_: [{'data': 'image', 'content_type': 'image/png'}]
    detect = _load_image_helpers(detector_error=error)[3]
    namespace['detect_image_context'] = detect
    return namespace


def test_photo_read_failing_with_402_stops_the_turn_before_any_answer(alerts):
    namespace = vision_namespace(payment_required())
    events = run_stream(namespace)
    assert [event['type'] for event in events if event['type'] != 'status'] == ['error']
    assert_friendly(events[-1]['content'])
    namespace['log_conversation'].assert_not_called()
    alerts.assert_called_once()


def test_nonstream_photo_read_failing_with_402_raises_and_stores_nothing(alerts):
    namespace = nonstream_namespace(payment_required())
    namespace['_normalize_image_inputs'] = lambda **_: [{'data': 'image', 'content_type': 'image/png'}]
    detect = _load_image_helpers(detector_error=payment_required())[3]
    namespace['detect_image_context'] = detect
    with pytest.raises(TurnFailed) as raised:
        load('get_chatbot_response', namespace)('Hafa adai', conversation_id='conv-a', pending_id='pending_abcdefgh')
    assert_friendly(raised.value.message)
    namespace['log_conversation'].assert_not_called()
    alerts.assert_called_once()


def photo_translation_events(client, translate, persist=True):
    namespace = stream_namespace()
    namespace['log_conversation'].return_value = True
    namespace.update({
        'ImageTranslationContext': object, 'Any': object,
        'photo_translation_streaming_enabled': lambda: True,
        'transcription_image_detail': lambda model: 'original',
        'get_client_for_request': lambda **_: (client, 'fake'),
        'translate_image_pages': translate, 'translate_image_pages_legacy': translate,
    })
    events = load('_image_translation_events', namespace)(
        image_context=SimpleNamespace(school_announcement=False, card_ids=[]), images=[],
        message='Translate this', message_for_logging='Translate this', mode='english', session_id=None,
        user_id='learner-a', conversation_id='conv-a', image_url=None, file_urls=None,
        pending_id='pending_abcdefgh', start_time=namespace['time'].time(), past_messages=[],
        skill_level=None, persist=persist)
    return namespace, list(events)


def swallowing_translator(calls):
    """Like the real pipelines: a failed call becomes a visible gap, not an exception."""
    def translate(**kwargs):
        for call in calls:
            try:
                if call == 'stream':
                    list(kwargs['stream_text'](messages=[]))
                else:
                    kwargs['complete'](messages=[])
            except Exception:
                yield {'type': 'chunk', 'content': 'Translation unavailable for this item. Please try this page again.\n\n'}
        yield {'type': 'metadata', 'sources': [], 'translation_incomplete': True, 'generation_complete': False}
    return translate


@pytest.mark.parametrize('calls', [['stream', 'complete'], ['complete']])
def test_photo_translation_where_every_call_gets_402_is_an_error_not_a_saved_gap_notice(alerts, calls):
    namespace, events = photo_translation_events(failing_client(payment_required()), swallowing_translator(calls))
    assert events[-1]['type'] == 'error'
    assert_friendly(events[-1]['content'])
    namespace['log_conversation'].assert_not_called()
    alerts.assert_called_once()


def test_photo_translation_with_some_pages_done_keeps_its_honest_partial_reply():
    outcomes = iter([RuntimeError('page two failed'), None])

    def create(**_kwargs):
        outcome = next(outcomes)
        if outcome:
            raise outcome
        return SimpleNamespace(choices=[])
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    namespace, events = photo_translation_events(client, swallowing_translator(['complete', 'complete']))
    assert events[-1]['type'] == 'done' and events[-1]['saved'] is True
    namespace['log_conversation'].assert_called_once()


# --- edit / regenerate ------------------------------------------------------------

def test_failed_regeneration_leaves_the_saved_conversation_and_its_revision_alone(alerts):
    original = snapshot()
    namespace = stream_namespace(payment_required())
    stream = load('get_chatbot_response_stream', namespace)
    store, replace = Mock(), Mock()
    events = list(atomic_regeneration_events(
        lambda: stream('Edited question', conversation_id='conv-a', pending_id='pending_abcdefgh',
                       history_override=[], persist=False),
        store, replace, lambda: False))
    assert events[-1]['type'] == 'error'
    assert_friendly(events[-1]['content'])
    store.assert_not_called(); replace.assert_not_called()
    namespace['log_conversation'].assert_not_called()
    namespace['cleanup_cancelled_message'].assert_not_called()  # the edit owner cleans up
    assert conversations._transcript_revision(original.rows) == original.revision
    alerts.assert_called_once()


# --- HTTP surface -----------------------------------------------------------------

def chat_endpoint(service):
    class DummyApp:
        @staticmethod
        def post(*args, **kwargs):
            return lambda function: function

    async def verify_user(_authorization):
        return 'learner-a'

    namespace = {
        'app': DummyApp(), 'Request': object, 'ChatResponse': object, 'Optional': Optional,
        'Header': lambda value=None: value, 'Form': lambda value=None: value, 'File': lambda default=None: default,
        'UploadFile': object, 'HTTPException': HTTPException, 'verify_user': verify_user,
        'conversations': SimpleNamespace(conversation_belongs_to_user=lambda *_: True),
        'asyncio': asyncio, 'logger': logging.getLogger(__name__), 'normalize_tutor_intent_unused': None,
        'get_chatbot_response': service, 'TurnFailed': TurnFailed,
        'report_if_provider_error': report_if_provider_error,
    }
    return load('chat', namespace, 'main.py', ast.AsyncFunctionDef)


def post_chat(endpoint):
    request = SimpleNamespace(headers={'content-type': 'application/json'}, json=_json_body)
    return asyncio.run(endpoint(request=request, authorization='Bearer token'))


async def _json_body():
    return {'message': 'Hafa adai', 'mode': 'english', 'conversation_id': 'c', 'pending_id': 'pending_abcdefgh'}


def test_chat_endpoint_turns_a_failed_turn_into_a_friendly_503(alerts):
    def service(**_kwargs):
        raise TurnFailed(PROVIDER_RETRY_MESSAGE)
    with pytest.raises(HTTPException) as raised:
        post_chat(chat_endpoint(service))
    assert raised.value.status_code == 503 and raised.value.detail == PROVIDER_RETRY_MESSAGE


def test_chat_endpoint_never_forwards_a_raw_provider_exception_that_escapes(alerts):
    def service(**_kwargs):
        raise payment_required()
    with pytest.raises(HTTPException) as raised:
        post_chat(chat_endpoint(service))
    assert raised.value.status_code == 503 and raised.value.detail == PROVIDER_RETRY_MESSAGE
    alerts.assert_called_once()


def test_chat_endpoint_does_not_echo_unexpected_internal_errors():
    def service(**_kwargs):
        raise ValueError('database password is hunter2')
    with pytest.raises(HTTPException) as raised:
        post_chat(chat_endpoint(service))
    assert raised.value.status_code == 500 and raised.value.detail == 'Internal server error'


def test_stream_worker_reports_an_escaping_402_as_the_friendly_message(alerts):
    path = ROOT / 'main.py'
    tree = ast.parse(path.read_text())
    endpoint = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'chat_stream')
    node = next(n for n in ast.walk(endpoint) if isinstance(n, ast.FunctionDef) and n.name == 'run_sync_generator')
    tracker = Mock()
    event_queue = queue.Queue()

    def generator(**_kwargs):
        raise payment_required()
        yield
    namespace = {key: None for key in ('mode', 'session_id', 'image_base64', 'file_url', 'skill_level', 'intent', 'learning_topic_id')}
    namespace.update({
        'pending_id': 'pending_abcdefgh', 'user_id': 'learner-a', 'conversation_id': 'conv-a',
        'final_message': 'Hafa adai', 'message': 'Hafa adai', 'all_image_inputs': [],
        'chat_requests': SimpleNamespace(valid_pending_id=lambda pending: True, RequestTracker=Mock(return_value=tracker),
                                         terminal_status=lambda types: 'failed'),
        'cancel_pending_message': Mock(), 'get_chatbot_response_stream': generator,
        'event_queue': event_queue, 'stream_done': threading.Event(), 'cleanup_cancelled_message': Mock(),
        'logger': logging.getLogger(__name__), 'report_if_provider_error': report_if_provider_error,
    })
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(path), 'exec'), namespace)
    namespace['run_sync_generator']()
    event = event_queue.get_nowait()
    assert event['type'] == 'error' and event['content'] == PROVIDER_RETRY_MESSAGE
    tracker.finish.assert_called_once_with('failed')
    alerts.assert_called_once()


# --- legacy rows -----------------------------------------------------------------

def test_failed_turns_saved_by_earlier_versions_are_hidden_but_do_not_change_the_revision(monkeypatch):
    rows = [saved_row(1), saved_row(2), saved_row(3)]
    failed = list(rows[2])
    failed[3] = f'[Error: {RAW_TEXT}]'
    rows[2] = tuple(failed)
    connection = TransactionConnection(rows)
    monkeypatch.setattr(conversations, 'get_db_connection_with_retry', lambda: connection)
    response = conversations.get_conversation_messages('conv-a', user_id='learner-a')
    assert provider_errors.STORED_FAILURE_PLACEHOLDER in [m.content for m in response.messages]
    assert not any(leak.lower() in response.model_dump_json().lower() for leak in LEAKS)
    revisions = {m.edit_revision for m in response.messages if m.edit_revision}
    assert revisions == {conversations._transcript_revision(rows)}
    assert conversations.get_regeneration_snapshot('conv-a', 2, 'learner-a').revision in revisions


# --- classification and alert throttling ---------------------------------------------

@pytest.mark.parametrize('error,kind', [
    (payment_required(), 'credit'),
    (RuntimeError('Payment Required: add more credits'), 'credit'),
    (type('E', (Exception,), {'status_code': 429})('slow down'), 'rate_limit'),
    (type('E', (Exception,), {'status_code': 502})('bad gateway'), 'server'),
    (type('APITimeoutError', (Exception,), {})('Request timed out.'), 'timeout'),
    (type('APIConnectionError', (Exception,), {})('Connection error.'), 'server'),
    (MalformedProviderResponse('no text'), 'malformed'),
    (KeyError('choices'), 'other'),
])
def test_classification(error, kind):
    assert classify_provider_error(error).kind == kind


def test_hundreds_of_credit_failures_alert_once_until_the_cooldown_passes(alerts, monkeypatch):
    clock = {'now': 1000.0}
    monkeypatch.setattr(provider_errors.time, 'monotonic', lambda: clock['now'])
    for _ in range(300):
        report_provider_failure(payment_required(), source='chat_stream', model='m')
    assert alerts.call_count == 1
    clock['now'] += provider_errors.DEFAULT_COOLDOWN_SECONDS + 1
    report_provider_failure(payment_required(), source='chat_stream', model='m')
    assert alerts.call_count == 2


def test_server_errors_alert_only_as_a_burst_and_then_only_once(alerts, monkeypatch):
    clock = {'now': 0.0}
    monkeypatch.setattr(provider_errors.time, 'monotonic', lambda: clock['now'])
    error = type('E', (Exception,), {'status_code': 503})('overloaded')
    for _ in range(provider_errors.DEFAULT_BURST_THRESHOLD - 1):
        report_provider_failure(error, source='chat', model='m')
    alerts.assert_not_called()
    report_provider_failure(error, source='chat', model='m')
    assert alerts.call_count == 1
    summary, details = alerts.call_args.args[1:]
    assert 'burst' in summary and details['kinds'] == {'server': provider_errors.DEFAULT_BURST_THRESHOLD}
    for _ in range(200):
        report_provider_failure(error, source='chat', model='m')
    assert alerts.call_count == 1


def test_failures_spread_beyond_the_window_never_alert(alerts, monkeypatch):
    clock = {'now': 0.0}
    monkeypatch.setattr(provider_errors.time, 'monotonic', lambda: clock['now'])
    error = type('E', (Exception,), {'status_code': 500})('oops')
    for _ in range(50):
        report_provider_failure(error, source='chat', model='m')
        clock['now'] += provider_errors.DEFAULT_BURST_WINDOW_SECONDS / 2 + 1
    alerts.assert_not_called()


def test_non_provider_exceptions_are_not_reported():
    assert report_if_provider_error(ValueError('bug'), source='x') is None


@pytest.fixture
def sentry_events():
    events = []
    sentry_sdk.init(dsn='https://publickey@o1.ingest.sentry.io/1', default_integrations=False,
                    before_send=lambda event, hint: events.append(event) or None)
    yield events
    sentry_sdk.get_global_scope().set_client(None)


def test_alert_reaches_sentry_with_no_user_request_or_message_content(sentry_events, monkeypatch):
    monkeypatch.undo()  # use the real _send_alert
    sentry_sdk.set_user({'id': 'learner-a', 'email': 'learner@example.com'})
    sentry_sdk.set_context('chat_request', {'conversation_id': 'conv-secret', 'mode': 'english'})
    sentry_sdk.set_tag('conversation', 'conv-secret')
    sentry_sdk.get_isolation_scope().add_event_processor(
        lambda event, hint: {**event, 'request': {'data': {'message': 'my private question'}}})
    report_provider_failure(payment_required(), source='chat_stream', model='fake-model')
    report_provider_failure(payment_required(), source='chat_stream', model='fake-model')

    assert len(sentry_events) == 1
    event = sentry_events[0]
    assert event['level'] == 'error' and event['fingerprint'] == ['provider-alert', 'credit']
    assert 'user' not in event and 'request' not in event
    assert set(event['contexts']) >= {'provider_alert'} and 'chat_request' not in event['contexts']
    text = json.dumps(event, default=str).lower()
    for secret in ('learner', 'conv-secret', 'private question', 'insufficient', 'openrouter.ai'):
        assert secret not in text


def test_alert_without_sentry_is_one_error_log_line(caplog, monkeypatch):
    monkeypatch.undo()
    sentry_sdk.get_global_scope().set_client(None)
    with caplog.at_level(logging.WARNING):
        report_provider_failure(payment_required(), source='chat', model='m')
        report_provider_failure(payment_required(), source='chat', model='m')
    alerts = [r for r in caplog.records if 'PROVIDER_ALERT' in r.getMessage()]
    assert len(alerts) == 1 and alerts[0].levelno == logging.ERROR
    assert 'Insufficient' not in caplog.text


@pytest.mark.parametrize('stored', [
    "[Error: Error code: 402 - {'error': {'message': 'Insufficient credits.'}}]",
    '[Error: ' + 'x' * 200 + ']',
    '[Token limit exceeded: 99999 tokens]',
    '  [Error: this reply could not be completed]\n',
])
def test_stored_failure_markers_are_recognized(stored):
    assert provider_errors.is_stored_failure_marker(stored)


@pytest.mark.parametrize('answer', [
    '[Error: means an error label in this programming example] Here is the translation.',
    '[Token limit exceeded is an English phrase.] Its meaning is explained below.',
    '[Error: ' + 'x' * 400 + ']',
    'The tutor said [Error: this] in passing.',
])
def test_a_real_answer_with_the_same_opening_is_kept(answer):
    assert not provider_errors.is_stored_failure_marker(answer)


def test_retry_logs_name_the_error_without_its_text():
    error = TimeoutError('SECRET_USER_PROMPT provider response body')
    assert provider_errors.safe_error_label(error) == 'TimeoutError'
    source = (ROOT / 'chatbot_service.py').read_text()
    assert source.count('{safe_error_label(retry_error)}') == 2
    assert '{retry_error}' not in source
