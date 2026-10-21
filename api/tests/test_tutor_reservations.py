"""Transaction and actual FastAPI route regressions; no AI/provider calls.

Opt in only with TUTOR_RESERVATION_TEST_DSN pointing to the task's dedicated DB.
Every connection asserts its identity before touching a random, test-owned schema.
"""
import ast
import json
import logging
import os
import queue
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import List, Optional
from unittest.mock import Mock
from uuid import uuid4

import psycopg
import pytest
from fastapi import BackgroundTasks, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.testclient import TestClient
from starlette.concurrency import run_in_threadpool

from api import chat_requests
from api.models import UsageIncrementResponse
from api.sse import queue_sse_events

# On the old revision the route tests still load the old endpoint implementations,
# while the test support module is explicitly supplied from the working change.
from api import tutor_reservations as reservations


HERE = Path(__file__).resolve().parents[1]
MAIN = Path(os.environ.get('TUTOR_MAIN_SOURCE', HERE / 'api' / 'main.py'))
TODAY = date(2026, 10, 22)
ID = 'logical_send_abcdefgh'


@pytest.fixture
def db(monkeypatch):
    dsn = os.environ.get('TUTOR_RESERVATION_TEST_DSN')
    if not dsn:
        pytest.skip('Dedicated local Tutor reservation test DB was not explicitly supplied')
    schema = 'tutor_test_' + uuid4().hex

    def connect():
        conn = psycopg.connect(dsn)
        assert conn.info.host in ('localhost', '127.0.0.1', '/tmp'), 'Local DB only'
        assert conn.execute('select current_database()').fetchone()[0] == 'hafagpt_pr2_20261022'
        conn.execute(f'SET search_path TO "{schema}"')
        conn.commit()
        return conn

    with connect() as conn:
        conn.execute(f'CREATE SCHEMA "{schema}"')
        conn.execute('''CREATE TABLE user_daily_usage (
            user_id text NOT NULL, usage_date date NOT NULL,
            chat_count integer NOT NULL DEFAULT 0, game_count integer NOT NULL DEFAULT 0,
            quiz_count integer NOT NULL DEFAULT 0, updated_at timestamptz DEFAULT now(),
            UNIQUE(user_id, usage_date))''')
        migration = HERE / 'alembic' / 'versions' / 't4u5v6w7x8y9_add_tutor_usage_reservations.py'
        source = ast.parse(migration.read_text())
        upgrade = next(node for node in source.body if isinstance(node, ast.FunctionDef) and node.name == 'upgrade')
        namespace = {'op': SimpleNamespace(execute=conn.execute)}
        exec(compile(ast.Module(body=[upgrade], type_ignores=[]), str(migration), 'exec'), namespace)
        namespace['upgrade']()
        # Minimal tracker shape exercises retry's early-Stop cleanup.
        conn.execute('''CREATE TABLE chat_requests (pending_id text PRIMARY KEY,
            user_id text NOT NULL, registered boolean NOT NULL DEFAULT false)''')
    monkeypatch.setattr(reservations, 'get_db_connection_with_retry', lambda **kwargs: connect())
    try:
        yield connect
    finally:
        with connect() as conn:
            conn.execute(f'DROP SCHEMA "{schema}" CASCADE')


def reserve(db, logical_id=ID, owner='learner-a', usage_type='chat', today=TODAY, limit=10):
    return reservations.reserve_usage(owner, usage_type, logical_id, today=today,
        limit=limit, is_premium=False, connect=db)


def count(db, owner='learner-a', day=TODAY, kind='chat'):
    with db() as conn:
        row = conn.execute(f'SELECT {kind}_count FROM user_daily_usage WHERE user_id=%s AND usage_date=%s',
            (owner, day)).fetchone()
        return row[0] if row else 0


def test_concurrent_reservations_and_duplicate_dispatch_charge_and_generate_once(db):
    with ThreadPoolExecutor(max_workers=8) as pool:
        approvals = list(pool.map(lambda _: reserve(db), range(12)))
    assert all(item['success'] for item in approvals)
    assert len({item['dispatch_token'] for item in approvals}) == 1
    assert count(db) == 1
    token = approvals[0]['dispatch_token']
    with ThreadPoolExecutor(max_workers=8) as pool:
        claims = list(pool.map(lambda _: reservations.claim_send('learner-a', ID, token, 'conv-a', connect=db), range(12)))
    assert sum(item['claimed'] for item in claims) == 1
    assert count(db) == 1


def test_different_logical_sends_cannot_race_past_free_limit(db):
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda i: reserve(db, f'logical_limit_{i:08}', limit=3), range(12)))
    assert sum(result['success'] for result in results) == 3
    assert count(db) == 3


def test_reconcile_fences_late_original_and_refunds_once_before_safe_retry(db):
    first = reserve(db)
    outcome = reservations.reconcile_send('learner-a', ID, today=TODAY, connect=db)
    assert outcome == dict(status='retryable', conversation_id=None, generation_started=False)
    reservations.reconcile_send('learner-a', ID, today=TODAY, connect=db)
    assert count(db) == 0
    with db() as conn:
        conn.execute('INSERT INTO chat_requests VALUES (%s,%s,false)', (ID, 'learner-a'))
    retry = reserve(db)
    assert retry['dispatch_token'] != first['dispatch_token']
    assert not reservations.claim_send('learner-a', ID, first['dispatch_token'], 'conv-a', connect=db)['claimed']
    # A late HTTP validation failure cannot invalidate this retry's new token.
    reservations.reconcile_send('learner-a', ID, today=TODAY,
        expected_token=first['dispatch_token'], connect=db)
    assert reservations.claim_send('learner-a', ID, retry['dispatch_token'], 'conv-a', connect=db)['claimed']
    assert count(db) == 1
    with db() as conn:
        assert conn.execute('SELECT count(*) FROM chat_requests').fetchone()[0] == 0


def test_missing_dispatch_fence_and_abandon_cannot_be_reopened_accidentally(db):
    assert reservations.reconcile_send('learner-a', ID, today=TODAY, connect=db)['status'] == 'retryable'
    assert not reservations.claim_send('learner-a', ID, 'old-token', 'conv-a', connect=db)['claimed']
    reserve(db)
    assert reservations.reconcile_send('learner-a', ID, today=TODAY, abandon=True, connect=db)['status'] == 'abandoned'
    assert not reserve(db)['success']
    assert count(db) == 0


@pytest.mark.parametrize('terminal', ['complete', 'failed', 'cancelled'])
def test_started_send_never_refunds_or_generates_twice_even_after_terminal_failure(db, terminal):
    approval = reserve(db)
    assert reservations.claim_send('learner-a', ID, approval['dispatch_token'], 'conv-a', connect=db)['claimed']
    reservations.finish_send('learner-a', ID, terminal, connect=db)
    assert reservations.reconcile_send('learner-a', ID, today=TODAY, abandon=True, connect=db)['status'] == terminal
    assert reserve(db)['success']
    assert not reservations.claim_send('learner-a', ID, approval['dispatch_token'], 'conv-a', connect=db)['claimed']
    assert count(db) == 1


def test_refund_targets_original_guam_day_and_account_not_current_day(db):
    previous = TODAY - timedelta(days=1)
    reserve(db, today=previous)
    other = reserve(db, owner='learner-b')
    reservations.reconcile_send('learner-a', ID, today=TODAY, connect=db)
    assert count(db, day=previous) == 0
    assert count(db) == 0
    assert count(db, owner='learner-b') == 1
    assert reservations.claim_send('learner-b', ID, other['dispatch_token'], 'conv-b', connect=db)['claimed']
    assert reserve(db)['success'] and count(db) == 1


def test_generic_game_reservation_contract_is_idempotent(db):
    first = reserve(db, usage_type='game')
    assert reserve(db, usage_type='game')['dispatch_token'] == first['dispatch_token']
    assert count(db, kind='game') == 1


@pytest.fixture
def endpoint(db):
    app = FastAPI()
    generator = Mock(return_value=iter([{'type': 'chunk', 'content': 'Local fixture'}, {'type': 'done', 'saved': True}]))
    tracker = Mock()
    async def verify(authorization):
        if authorization != 'Bearer development-test':
            raise HTTPException(status_code=401)
        return 'learner-a'
    namespace = dict(app=app, Request=Request, BackgroundTasks=BackgroundTasks,
        Optional=Optional, List=List, Header=Header, Form=Form, File=File, Query=Query,
        UploadFile=UploadFile, HTTPException=HTTPException, JSONResponse=JSONResponse,
        StreamingResponse=StreamingResponse, UsageIncrementResponse=UsageIncrementResponse,
        verify_user=verify, run_in_threadpool=run_in_threadpool,
        tutor_reservations=reservations, conversations=SimpleNamespace(
            conversation_belongs_to_user=lambda conversation, owner: conversation == 'conv-a',
            get_db_connection_with_retry=db),
        chat_requests=SimpleNamespace(valid_pending_id=chat_requests.valid_pending_id,
            RequestTracker=Mock(return_value=tracker), terminal_status=chat_requests.terminal_status,
            get_request_status=Mock(return_value=None)),
        get_chatbot_response_stream=generator, cancel_pending_message=Mock(), cleanup_cancelled_message=Mock(),
        get_guam_date=lambda: TODAY, get_site_setting=lambda key: False,
        is_promo_active=lambda: False, is_promo_active_from_db=lambda: False,
        FREE_TIER_LIMITS={'chat': 10, 'game': 10, 'quiz': 10},
        set_user_context=Mock(), set_request_context=Mock(), os=os,
        queue=queue, threading=threading, queue_sse_events=queue_sse_events,
        MAX_UPLOAD_FILES=10, MAX_UPLOAD_TOTAL_SIZE_MB=50, MAX_UPLOAD_TOTAL_BYTES=50*1024*1024,
        logger=logging.getLogger(__name__))
    tree = ast.parse(MAIN.read_text())
    for name in ('increment_usage', 'chat_stream', 'reconcile_chat_send'):
        node = next((node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == name), None)
        if node is not None:  # Old revision has no reconciliation route: 404 is regression proof.
            exec(compile(ast.Module(body=[node], type_ignores=[]), str(MAIN), 'exec'), namespace)
    with TestClient(app) as client:
        yield client, generator


AUTH = {'Authorization': 'Bearer development-test'}


def api_reserve(client):
    response = client.post(f'/api/usage/increment/chat?logical_send_id={ID}', headers=AUTH)
    assert response.status_code == 200
    return response.json()


def payload(approval, **overrides):
    return dict(message='English local fixture', mode='english', conversation_id='conv-a',
        pending_id=ID, logical_send_id=ID, dispatch_token=approval.get('dispatch_token'), **overrides)


def test_api_duplicate_reserve_and_dispatch_never_recharge_or_regenerate(endpoint, db):
    client, generator = endpoint
    first, second = api_reserve(client), api_reserve(client)
    assert count(db) == 1
    assert first['dispatch_token'] == second['dispatch_token']
    first_response = client.post('/api/chat/stream', headers=AUTH, json=payload(first))
    second_response = client.post('/api/chat/stream', headers=AUTH, json=payload(second))
    assert 'Local fixture' in first_response.text
    assert 'send_already_started' in second_response.text
    assert generator.call_count == 1
    assert count(db) == 1


def test_api_dropped_before_registration_reconcile_retry_and_delayed_old_dispatch(endpoint, db):
    client, generator = endpoint
    first = api_reserve(client)
    response = client.post(f'/api/chat/reconcile/{ID}', headers=AUTH)
    assert response.status_code == 200
    assert response.json()['status'] == 'retryable'
    assert count(db) == 0
    retry = api_reserve(client)
    late = client.post('/api/chat/stream', headers=AUTH, json=payload(first))
    assert 'send_already_started' in late.text
    assert generator.call_count == 0
    response = client.post('/api/chat/stream', headers=AUTH, json=payload(retry))
    assert 'Local fixture' in response.text
    assert generator.call_count == 1
    assert count(db) == 1


def test_api_authoritative_validation_failure_refunds_and_requires_new_token(endpoint, db):
    client, generator = endpoint
    approval = api_reserve(client)
    bad_payload = payload(approval)
    bad_payload['mode'] = 'invalid'
    response = client.post('/api/chat/stream', headers=AUTH, json=bad_payload)
    assert response.status_code == 400
    assert count(db) == 0
    retry = api_reserve(client)
    assert retry['dispatch_token'] != approval['dispatch_token']
    assert 'Local fixture' in client.post('/api/chat/stream', headers=AUTH, json=payload(retry)).text
    assert generator.call_count == 1 and count(db) == 1


def test_api_reconcile_requires_auth_and_does_not_touch_another_account(endpoint, db):
    client, _ = endpoint
    reserve(db, owner='learner-b')
    assert client.post(f'/api/chat/reconcile/{ID}').status_code == 401
    assert client.post(f'/api/chat/reconcile/{ID}', headers=AUTH).json()['status'] == 'retryable'
    assert count(db, owner='learner-b') == 1
