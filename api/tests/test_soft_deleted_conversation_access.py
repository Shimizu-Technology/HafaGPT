import ast
import asyncio
from contextlib import closing
from pathlib import Path
from types import SimpleNamespace
from typing import Optional

from fastapi import HTTPException


def _load_conversation_belongs_to_user():
    source_path = Path(__file__).resolve().parents[1] / "api" / "conversations.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "conversation_belongs_to_user"
    )
    isolated_module = ast.Module(body=[function_node], type_ignores=[])
    namespace = {"closing": closing}
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return namespace["conversation_belongs_to_user"]


def _load_get_conversation_messages_endpoint():
    source_path = Path(__file__).resolve().parents[1] / "api" / "main.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "get_conversation_messages_endpoint"
    )
    isolated_module = ast.Module(body=[function_node], type_ignores=[])

    class DummyApp:
        @staticmethod
        def get(*args, **kwargs):
            def decorator(func):
                return func
            return decorator

    class FakeLogger:
        def __init__(self):
            self.info_messages = []
            self.error_messages = []

        def info(self, message):
            self.info_messages.append(message)

        def error(self, message):
            self.error_messages.append(message)

    namespace = {
        "app": DummyApp(),
        "MessagesResponse": object,
        "Optional": Optional,
        "Header": lambda value=None: value,
        "HTTPException": HTTPException,
        "logger": FakeLogger(),
    }
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return namespace["get_conversation_messages_endpoint"]


class FakeCursor:
    def __init__(self, row=None):
        self.row = row
        self.executions = []
        self.closed = False

    def execute(self, query, params):
        self.executions.append((query, params))

    def fetchone(self):
        return self.row

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, cursor):
        self.cursor_instance = cursor
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def close(self):
        self.closed = True


class FakeLogger:
    def __init__(self):
        self.error_messages = []

    def error(self, message):
        self.error_messages.append(message)


def test_conversation_belongs_to_user_can_include_soft_deleted_conversations():
    belongs_to_user = _load_conversation_belongs_to_user()
    fake_cursor = FakeCursor(row=(1,))
    fake_connection = FakeConnection(fake_cursor)
    fake_logger = FakeLogger()

    belongs_to_user.__globals__["get_db_connection_with_retry"] = lambda: fake_connection
    belongs_to_user.__globals__["logger"] = fake_logger

    assert belongs_to_user("conv-123", "user-123", include_deleted=True) is True
    query, params = fake_cursor.executions[0]
    assert params == ("conv-123", "user-123")
    assert "deleted_at IS NULL" not in query
    assert fake_cursor.closed is True
    assert fake_connection.closed is True
    assert fake_logger.error_messages == []


def test_get_conversation_messages_endpoint_allows_owned_soft_deleted_history():
    endpoint = _load_get_conversation_messages_endpoint()
    helper_calls = []
    expected_messages = SimpleNamespace(messages=[{"role": "user", "content": "hello"}])

    async def fake_verify_user(_authorization):
        return "user-123"

    def fake_belongs_to_user(conversation_id, user_id, include_deleted=False):
        helper_calls.append((conversation_id, user_id, include_deleted))
        return True

    endpoint.__globals__["verify_user"] = fake_verify_user
    endpoint.__globals__["conversations"] = SimpleNamespace(
        conversation_belongs_to_user=fake_belongs_to_user,
        get_conversation_messages=lambda conversation_id: expected_messages,
    )

    result = asyncio.run(endpoint("conv-123", "Bearer token"))

    assert result is expected_messages
    assert helper_calls == [("conv-123", "user-123", True)]
