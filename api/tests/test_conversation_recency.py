import ast
import json
from contextlib import closing
from pathlib import Path


class FakeCursor:
    def __init__(self):
        self.executions = []
        self.closed = False

    def execute(self, query, params):
        self.executions.append((" ".join(query.split()), params))

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self):
        self.cursor_instance = FakeCursor()
        self.committed = False
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


class FakeLogger:
    def __init__(self):
        self.errors = []

    def error(self, message):
        self.errors.append(message)


def _load_log_conversation():
    source_path = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "log_conversation"
    )
    isolated = ast.Module(body=[function_node], type_ignores=[])
    namespace = {"closing": closing, "json": json}
    exec(compile(isolated, str(source_path), "exec"), namespace)
    return namespace["log_conversation"]


def test_persisted_message_advances_owned_conversation_recency():
    log_conversation = _load_log_conversation()
    connection = FakeConnection()
    logger = FakeLogger()
    log_conversation.__globals__["_get_db_connection_with_retry"] = lambda: connection
    log_conversation.__globals__["logger"] = logger

    log_conversation(
        user_message="hello",
        bot_response="response",
        mode="learn",
        sources=[],
        used_rag=False,
        used_web_search=False,
        response_time=0.5,
        user_id="user-1",
        conversation_id="conv-1",
    )

    assert len(connection.cursor_instance.executions) == 2
    update_query, update_params = connection.cursor_instance.executions[1]
    assert "UPDATE conversations" in update_query
    assert "user_id = %s" in update_query
    assert "deleted_at IS NULL" in update_query
    assert update_params == ("conv-1", "user-1")
    assert connection.committed is True
    assert connection.cursor_instance.closed is True
    assert connection.closed is True
    assert logger.errors == []
