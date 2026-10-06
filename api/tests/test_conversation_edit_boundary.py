from starlette.concurrency import run_in_threadpool
"""Persisted edit boundaries must never depend on client time or another owner."""
import ast
import logging
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Optional
from unittest.mock import Mock

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1] / "api"


def isolated_function(filename, name, namespace):
    source = API_ROOT / filename
    module = ast.parse(source.read_text())
    function = next(node for node in module.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name)
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(source), "exec"), namespace)
    return namespace[name]


class Cursor:
    def __init__(self, rows, deleted=False, fail_delete=False):
        self.rows = rows.copy()
        self.deleted = deleted
        self.fail_delete = fail_delete
        self.executions = []
        self.rowcount = 0
        self.closed = False
        self.boundary = None

    def execute(self, sql, params):
        sql = " ".join(sql.split())
        self.executions.append((sql, params))
        if sql.startswith("SELECT"):
            conversation, owner, message_id, log_owner = params
            self.boundary = next((row for row in self.rows if row['id'] == message_id and row['conversation'] == conversation and row['owner'] == owner == log_owner and row.get('conversation_owner', owner) == owner and not self.deleted), None)
        elif sql.startswith("DELETE"):
            if self.fail_delete:
                raise RuntimeError("database write failed")
            conversation, owner = params[:2]
            boundary = self.boundary
            boundary_key = (boundary['timestamp'] is None, boundary['timestamp'] or datetime.min, boundary['id'])
            removed = [row for row in self.rows if row['conversation'] == conversation and row['owner'] == owner and (row['timestamp'] is None, row['timestamp'] or datetime.min, row['id']) >= boundary_key]
            self.rowcount = len(removed)
            self.rows = [row for row in self.rows if row not in removed]

    def fetchone(self):
        return (self.boundary['timestamp'], self.boundary['id']) if self.boundary else None

    def close(self):
        self.closed = True


class Connection:
    def __init__(self, rows, **kwargs):
        self.cursor_instance = Cursor(rows, **kwargs)
        self.committed = self.rolled_back = self.closed = False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


def fixture(rows, **kwargs):
    connection = Connection(rows, **kwargs)
    namespace = {"Optional": Optional, "get_db_connection_with_retry": lambda: connection, "logger": logging.getLogger(__name__)}
    return isolated_function('conversations.py', 'delete_messages_from', namespace), connection


def row(message_id, timestamp, owner='learner-a', conversation='conv-a', **kwargs):
    return dict(id=message_id, timestamp=timestamp, owner=owner, conversation=conversation, **kwargs)


def test_inclusive_boundary_uses_exact_database_precision_and_order_not_client_time():
    boundary = datetime(2026, 10, 6, 8, 0, 0, 123456)
    delete, connection = fixture([
        row(3, boundary - timedelta(microseconds=1)), row(4, boundary), row(5, boundary),
        row(6, boundary), row(7, boundary + timedelta(microseconds=1)), row(8, None),
        row(9, boundary, owner='learner-b'), row(10, boundary, conversation='conv-b'),
    ])
    assert delete('conv-a', 5, 'learner-a') == 4
    assert [value['id'] for value in connection.cursor_instance.rows] == [3, 4, 9, 10]
    select, delete_sql = connection.cursor_instance.executions
    assert select[1] == ('conv-a', 'learner-a', 5, 'learner-a')
    assert 'conversation.deleted_at IS NULL' in select[0]
    assert 'FOR UPDATE OF conversation, logs' in select[0]
    assert 'timestamp = %s AND id >= %s' in delete_sql[0]
    assert delete_sql[1] == ('conv-a', 'learner-a', boundary, boundary, 5)
    assert connection.committed and not connection.rolled_back
    assert connection.cursor_instance.closed and connection.closed


@pytest.mark.parametrize('rows,deleted', [([], False), ([row(5, None, owner='learner-b')], False), ([row(5, None, conversation='conv-b')], False), ([row(5, None, conversation_owner='learner-b')], False), ([row(5, None)], True)])
def test_wrong_owner_wrong_conversation_missing_row_and_soft_deleted_return_not_found(rows, deleted):
    delete, connection = fixture(rows, deleted=deleted)
    assert delete('conv-a', 5, 'learner-a') is None
    assert len(connection.cursor_instance.executions) == 1
    assert connection.rolled_back and not connection.committed
    assert connection.cursor_instance.closed and connection.closed


def test_null_timestamp_legacy_boundary_is_inclusive_and_keeps_earlier_rows():
    delete, connection = fixture([row(3, datetime(2026, 10, 6)), row(4, None), row(5, None), row(6, None)])
    assert delete('conv-a', 5, 'learner-a') == 2
    sql, params = connection.cursor_instance.executions[1]
    assert 'timestamp IS NULL AND id >= %s' in sql
    assert params == ('conv-a', 'learner-a', 5)
    assert [value['id'] for value in connection.cursor_instance.rows] == [3, 4]


def test_database_failure_rolls_back_and_closes_connection():
    delete, connection = fixture([row(5, None)], fail_delete=True)
    with pytest.raises(RuntimeError, match='database write failed'):
        delete('conv-a', 5, 'learner-a')
    assert connection.rolled_back and not connection.committed
    assert connection.cursor_instance.closed and connection.closed


def client_for(deletion, authenticated=True):
    app = FastAPI()
    async def verify(authorization):
        if not authenticated or authorization != 'Bearer test-token':
            raise HTTPException(status_code=401, detail='Sign in required')
        return 'learner-a'
    namespace = {"run_in_threadpool": run_in_threadpool, "app": app, "Optional": Optional, "Header": Header, "HTTPException": HTTPException, "verify_user": verify, "conversations": SimpleNamespace(delete_messages_from=deletion), "logger": logging.getLogger(__name__)}
    isolated_function('main.py', 'delete_messages_from_endpoint', namespace)
    return TestClient(app)


def test_http_endpoint_verifies_owner_and_returns_deleted_log_count():
    delete = Mock(return_value=3)
    response = client_for(delete).delete('/api/conversations/conv-a/messages/from/5', headers={'Authorization': 'Bearer test-token'})
    assert response.status_code == 200
    assert response.json() == {'success': True, 'deleted_count': 3}
    delete.assert_called_once_with('conv-a', 5, 'learner-a')


def test_http_endpoint_returns_404_for_unowned_or_missing_boundary():
    response = client_for(Mock(return_value=None)).delete('/api/conversations/conv-a/messages/from/5', headers={'Authorization': 'Bearer test-token'})
    assert response.status_code == 404
    assert response.json()['detail'] == 'Conversation message not found'


def test_http_endpoint_requires_authentication_before_mutation():
    delete = Mock()
    response = client_for(delete, authenticated=False).delete('/api/conversations/conv-a/messages/from/5')
    assert response.status_code == 401
    delete.assert_not_called()


def test_http_endpoint_does_not_report_database_failure_as_success():
    response = client_for(Mock(side_effect=RuntimeError('private database detail'))).delete('/api/conversations/conv-a/messages/from/5', headers={'Authorization': 'Bearer test-token'})
    assert response.status_code == 500
    assert 'private database detail' not in response.text
