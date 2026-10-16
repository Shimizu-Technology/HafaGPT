import ast
import logging
import threading
from pathlib import Path
from typing import Optional
from unittest.mock import Mock

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
from starlette.concurrency import run_in_threadpool

from api import chat_requests
from api.chat_requests import RequestTracker, get_request_status, request_cancel, terminal_status, valid_pending_id

ROOT = Path(__file__).resolve().parents[1] / 'api'


class FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows); self.executed = []
    def execute(self, sql, params=None):
        self.executed.append((' '.join(sql.split()), params))
    def fetchone(self):
        return self.rows.pop(0) if self.rows else None
    def close(self):
        pass


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor; self.commits = 0; self.closed = False; self.autocommit = False
    def cursor(self):
        return self._cursor
    def commit(self):
        self.commits += 1
    def close(self):
        self.closed = True


def connections(*cursors):
    pool = [FakeConnection(cursor) for cursor in cursors]
    made = []
    def connect():
        connection = pool.pop(0); made.append(connection); return connection
    return connect, made


@pytest.mark.parametrize('pending_id,valid', [
    ('pending_1760000000000_abc123def', True), ('short', False), ('has space in it', False),
    ('x' * 201, False), (None, False), ("pending_1'; DROP", False),
])
def test_pending_ids_are_validated_before_storage(pending_id, valid):
    assert valid_pending_id(pending_id) is valid


@pytest.mark.parametrize('events,status', [
    (['done'], 'complete'), (['cancelled'], 'cancelled'), (['error'], 'failed'), ([], 'failed'),
    (['error', 'done'], 'complete'),
])
def test_terminal_status_follows_last_terminal_event(events, status):
    assert terminal_status(events) == status


def test_start_registers_owned_running_request_and_preserves_an_early_cancel():
    start_cursor = FakeCursor([(True,)])
    finish_cursor = FakeCursor([])
    connect, made = connections(start_cursor, finish_cursor)
    cancelled = Mock()
    tracker = RequestTracker('pending_abcdefgh', 'learner-a', 'conv-a', cancelled, connect=connect, heartbeat_seconds=60)
    assert tracker.start() is True
    cancelled.assert_called_once()
    retention, upsert = start_cursor.executed
    assert retention[0].startswith('DELETE FROM chat_requests WHERE created_at <')
    assert 'ON CONFLICT (pending_id) DO UPDATE' in upsert[0] and 'registered = true' in upsert[0]
    assert 'chat_requests.user_id = EXCLUDED.user_id' in upsert[0] and "chat_requests.status = 'running'" in upsert[0]
    assert 'cancel_requested =' not in upsert[0].split('DO UPDATE')[1]
    assert upsert[1] == ('pending_abcdefgh', 'learner-a', 'conv-a')
    tracker.finish('complete')
    sql, params = finish_cursor.executed[0]
    assert "SET status = %s" in sql and "status = 'running'" in sql
    assert params == ('complete', 'pending_abcdefgh', 'learner-a')
    assert all(connection.closed for connection in made)


def test_request_owned_by_another_account_is_never_tracked_or_finished():
    connect, made = connections(FakeCursor([None]))
    tracker = RequestTracker('pending_abcdefgh', 'learner-b', 'conv-b', Mock(), connect=connect, heartbeat_seconds=60)
    assert tracker.start() is False
    tracker.finish('complete')
    assert len(made) == 1


def test_database_outage_never_blocks_the_reply():
    def unavailable():
        raise OSError('database down')
    tracker = RequestTracker('pending_abcdefgh', 'learner-a', None, Mock(), connect=unavailable, heartbeat_seconds=60)
    assert tracker.start() is False
    tracker.finish('failed')


def test_heartbeat_delivers_a_cancel_recorded_by_another_worker():
    heartbeat_cursor = FakeCursor([(False,), (True,)])
    connect, made = connections(FakeCursor([(False,)]), heartbeat_cursor, FakeCursor([]))
    seen = threading.Event()
    tracker = RequestTracker('pending_abcdefgh', 'learner-a', 'conv-a', seen.set, connect=connect, heartbeat_seconds=0.01)
    assert tracker.start() is True
    assert seen.wait(2)
    tracker.finish('cancelled')
    sql, params = heartbeat_cursor.executed[0]
    assert sql.startswith('UPDATE chat_requests SET updated_at = now()') and 'RETURNING cancel_requested' in sql
    assert params == ('pending_abcdefgh', 'learner-a')
    assert made[1].autocommit is True and made[1].closed


def test_unknown_terminal_status_is_rejected():
    with pytest.raises(ValueError):
        RequestTracker('pending_abcdefgh', 'learner-a', None, Mock(), connect=Mock()).finish('running')


def test_cancel_is_scoped_to_the_owner():
    cursor = FakeCursor([('pending_abcdefgh',)])
    connect, _ = connections(cursor)
    assert request_cancel('pending_abcdefgh', 'learner-a', connect=connect) is True
    sql, params = cursor.executed[0]
    assert 'cancel_requested = true' in sql and 'WHERE chat_requests.user_id = EXCLUDED.user_id' in sql
    assert params == ('pending_abcdefgh', 'learner-a')
    connect, _ = connections(FakeCursor([None]))
    assert request_cancel('pending_abcdefgh', 'learner-b', connect=connect) is False


@pytest.mark.parametrize('row,expected', [
    (None, None),
    (('running', 'conv-a', False, True, False), {'status': 'running', 'conversation_id': 'conv-a'}),
    (('running', 'conv-a', False, True, True), {'status': 'interrupted', 'conversation_id': 'conv-a'}),
    (('running', None, True, True, True), {'status': 'cancelled', 'conversation_id': None}),
    (('complete', 'conv-a', False, True, True), {'status': 'complete', 'conversation_id': 'conv-a'}),
    # An early Stop for a message that never reached the server is not a saved outcome.
    (('running', None, True, False, True), None),
    (('running', None, True, False, False), None),
])
def test_status_reports_silent_running_requests_as_interrupted(row, expected):
    cursor = FakeCursor([row])
    connect, _ = connections(cursor)
    assert get_request_status('pending_abcdefgh', 'learner-a', connect=connect) == expected
    sql, params = cursor.executed[0]
    assert 'WHERE pending_id = %s AND user_id = %s' in sql
    assert params == (chat_requests.STALE_AFTER_SECONDS, 'pending_abcdefgh', 'learner-a')


def isolated(name, namespace):
    source = ROOT / 'main.py'
    node = next(node for node in ast.parse(source.read_text()).body
                if isinstance(node, ast.AsyncFunctionDef) and node.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), 'exec'), namespace)
    return namespace[name]


def endpoint_client(status=None, cancel_error=None, owned=True, local_owner=False):
    app = FastAPI()
    async def verify(authorization):
        if authorization != 'Bearer token-a':
            raise HTTPException(status_code=401, detail='Sign in required')
        return 'learner-a'
    store = Mock()
    store.valid_pending_id = valid_pending_id
    store.get_request_status = Mock(return_value=status)
    store.request_cancel = Mock(side_effect=cancel_error, return_value=owned)
    store.owns_local_stream = Mock(return_value=local_owner)
    local_cancel = Mock()
    namespace = {'app': app, 'Optional': Optional, 'Header': Header, 'HTTPException': HTTPException,
                 'run_in_threadpool': run_in_threadpool, 'verify_user': verify, 'chat_requests': store,
                 'cancel_pending_message': local_cancel, 'logger': logging.getLogger(__name__)}
    isolated('cancel_chat_message', namespace)
    isolated('get_chat_request_status', namespace)
    return TestClient(app), store, local_cancel


AUTH = {'Authorization': 'Bearer token-a'}


def test_cancel_requires_sign_in_and_records_owned_cancel_for_every_worker():
    client, store, local_cancel = endpoint_client(local_owner=True)
    assert client.post('/api/chat/cancel/pending_abcdefgh').status_code == 401
    local_cancel.assert_not_called()
    response = client.post('/api/chat/cancel/pending_abcdefgh', headers=AUTH)
    assert response.status_code == 200
    local_cancel.assert_called_once_with('pending_abcdefgh')
    store.request_cancel.assert_called_once_with('pending_abcdefgh', 'learner-a')


def test_cancel_never_stops_another_accounts_reply():
    client, store, local_cancel = endpoint_client(owned=False, local_owner=False)
    assert client.post('/api/chat/cancel/pending_abcdefgh', headers=AUTH).status_code == 200
    local_cancel.assert_not_called()
    store.owns_local_stream.assert_called_once_with('pending_abcdefgh', 'learner-a')


def test_cancel_for_a_stream_on_another_worker_leaves_no_local_flag():
    client, store, local_cancel = endpoint_client(owned=True, local_owner=False)
    assert client.post('/api/chat/cancel/pending_abcdefgh', headers=AUTH).status_code == 200
    store.request_cancel.assert_called_once_with('pending_abcdefgh', 'learner-a')
    local_cancel.assert_not_called()


def test_cancel_still_stops_an_owned_local_stream_when_recording_fails():
    client, _, local_cancel = endpoint_client(cancel_error=OSError('down'), local_owner=True)
    assert client.post('/api/chat/cancel/pending_abcdefgh', headers=AUTH).status_code == 200
    local_cancel.assert_called_once_with('pending_abcdefgh')


def test_cancel_reports_failure_when_neither_this_worker_nor_the_record_can_stop_the_reply():
    client, _, local_cancel = endpoint_client(cancel_error=OSError('down'), local_owner=False)
    assert client.post('/api/chat/cancel/pending_abcdefgh', headers=AUTH).status_code == 503
    local_cancel.assert_not_called()


def test_cancel_rejects_malformed_ids():
    client, store, local_cancel = endpoint_client()
    assert client.post('/api/chat/cancel/bad', headers=AUTH).status_code == 400
    local_cancel.assert_not_called(); store.request_cancel.assert_not_called()


def test_status_is_owner_scoped_and_hides_unknown_requests():
    client, store, _ = endpoint_client(status=None)
    assert client.get('/api/chat/requests/pending_abcdefgh').status_code == 401
    assert client.get('/api/chat/requests/pending_abcdefgh', headers=AUTH).status_code == 404
    store.get_request_status.assert_called_once_with('pending_abcdefgh', 'learner-a')
    client, _, _ = endpoint_client(status={'status': 'complete', 'conversation_id': 'conv-a'})
    response = client.get('/api/chat/requests/pending_abcdefgh', headers=AUTH)
    assert response.json() == {'status': 'complete', 'conversation_id': 'conv-a'}


def test_outcome_is_recorded_even_when_registration_finishes_after_the_reply():
    started = threading.Event()
    release = threading.Event()
    start_cursor, finish_cursor = FakeCursor([(False,)]), FakeCursor([])
    def connect():
        if not started.is_set():
            started.set()
            release.wait(2)
            return FakeConnection(start_cursor)
        return FakeConnection(finish_cursor)
    cancelled = Mock()
    tracker = RequestTracker('pending_abcdefgh', 'learner-a', 'conv-a', cancelled, connect=connect, heartbeat_seconds=60)
    assert chat_requests.owns_local_stream('pending_abcdefgh', 'learner-a')
    tracker.start_in_background()
    assert started.wait(2)
    # The reply finishes (and the client gets [DONE]) before registration connects.
    tracker.finish('complete')
    release.set()
    tracker._starter.join(5)
    assert len(start_cursor.executed) == 2 and finish_cursor.executed[0][1][0] == 'complete'
    cancelled.assert_not_called()
    assert not chat_requests.owns_local_stream('pending_abcdefgh', 'learner-a')


def test_finish_during_registration_never_joins_an_unstarted_heartbeat():
    release = threading.Event()
    class SlowStart(threading.Thread):
        def start(self):
            release.wait(2)
            super().start()
    original = threading.Thread
    connect, _ = connections(FakeCursor([(False,)]), FakeCursor([]))
    tracker = RequestTracker('pending_abcdefgh', 'learner-a', None, Mock(), connect=connect, heartbeat_seconds=60)
    chat_requests.threading.Thread = SlowStart
    try:
        starter = original(target=tracker.start)
        starter.start()
        finisher = original(target=tracker.finish, args=('complete',))
        finisher.start()
        release.set()
        finisher.join(5); starter.join(5)
        assert not finisher.is_alive() and not starter.is_alive()
    finally:
        chat_requests.threading.Thread = original
