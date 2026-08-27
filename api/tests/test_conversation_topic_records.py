import ast
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import pytest
from fastapi import HTTPException

from api import conversations


NOW = datetime(2026, 8, 28, tzinfo=timezone.utc)


class FakeCursor:
    def __init__(self, *, one=None, rows=None):
        self.one = one
        self.rows = rows or []
        self.executions = []
        self.closed = False

    def execute(self, query, params):
        self.executions.append((" ".join(query.split()), params))

    def fetchone(self):
        return self.one

    def fetchall(self):
        return self.rows

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, cursor):
        self.cursor_instance = cursor
        self.committed = False
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


def test_create_conversation_persists_optional_topic_relationship(monkeypatch):
    cursor = FakeCursor(
        one=("conv-1", "user-1", "Practice greetings", NOW, NOW, "greetings")
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(conversations, "get_db_connection_with_retry", lambda: connection)

    result = conversations.create_conversation(
        "user-1",
        "Practice greetings",
        learning_topic_id="greetings",
    )

    assert cursor.executions[0][1][1:] == (
        "user-1",
        "Practice greetings",
        "greetings",
    )
    assert result.learning_topic_id == "greetings"
    assert connection.committed is True
    assert cursor.closed is True
    assert connection.closed is True


def test_topic_preview_is_owner_scoped_filtered_and_bounded(monkeypatch):
    cursor = FakeCursor(
        rows=[("conv-1", "user-1", "Practice greetings", NOW, NOW, "greetings")]
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(conversations, "get_db_connection_with_retry", lambda: connection)

    result = conversations.get_conversations(
        "user-1",
        limit=3,
        learning_topic_id="greetings",
    )

    query, params = cursor.executions[0]
    assert "c.user_id = %s" in query
    assert "c.learning_topic_id = %s" in query
    assert "ORDER BY c.updated_at DESC" in query
    assert params == ("user-1", "greetings", 3)
    assert [item.id for item in result.conversations] == ["conv-1"]
    assert result.conversations[0].learning_topic_id == "greetings"


def test_exact_conversation_metadata_fails_closed_for_non_owner(monkeypatch):
    cursor = FakeCursor(one=None)
    connection = FakeConnection(cursor)
    monkeypatch.setattr(conversations, "get_db_connection_with_retry", lambda: connection)

    assert conversations.get_conversation("conv-private", "different-user") is None
    query, params = cursor.executions[0]
    assert "user_id = %s" in query
    assert "deleted_at IS NULL" in query
    assert params == ("conv-private", "different-user")
    assert cursor.closed is True
    assert connection.closed is True


def test_system_activity_advances_the_parent_conversation(monkeypatch):
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    monkeypatch.setattr(conversations, "get_db_connection_with_retry", lambda: connection)

    assert conversations.create_system_message(
        conversation_id="conv-1",
        content="Mode changed",
        user_id="user-1",
    ) is True

    assert len(cursor.executions) == 2
    update_query, update_params = cursor.executions[1]
    assert "UPDATE conversations" in update_query
    assert "deleted_at IS NULL" in update_query
    assert update_params == ("conv-1", "user-1")


def _load_topic_validator():
    source_path = Path(__file__).resolve().parents[1] / "api" / "main.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "validate_conversation_topic_id"
    )
    isolated = ast.Module(body=[function_node], type_ignores=[])
    namespace = {
        "Optional": Optional,
        "HTTPException": HTTPException,
        "ALL_TOPICS": [{"id": "greetings"}, {"id": "family"}],
    }
    exec(compile(isolated, str(source_path), "exec"), namespace)
    return namespace["validate_conversation_topic_id"]


def test_conversation_topic_validation_uses_only_canonical_topic_ids():
    validate = _load_topic_validator()

    assert validate(None) is None
    assert validate("greetings") == "greetings"
    with pytest.raises(HTTPException) as exc_info:
        validate("greetings-ish")
    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Unknown learning topic"
