import ast
from contextlib import closing
from pathlib import Path


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


class FakeCursor:
    def __init__(self, row=None, execute_error=None, fetchone_error=None):
        self.row = row
        self.execute_error = execute_error
        self.fetchone_error = fetchone_error
        self.executions = []
        self.closed = False

    def execute(self, query, params):
        self.executions.append((query, params))
        if self.execute_error:
            raise self.execute_error

    def fetchone(self):
        if self.fetchone_error:
            raise self.fetchone_error
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


def test_conversation_belongs_to_user_returns_true_and_closes_resources():
    belongs_to_user = _load_conversation_belongs_to_user()
    fake_cursor = FakeCursor(row=(1,))
    fake_connection = FakeConnection(fake_cursor)
    fake_logger = FakeLogger()

    belongs_to_user.__globals__["get_db_connection_with_retry"] = lambda: fake_connection
    belongs_to_user.__globals__["logger"] = fake_logger

    assert belongs_to_user("conv-123", "user-123") is True
    assert fake_cursor.executions[0][1] == ("conv-123", "user-123")
    assert fake_cursor.closed is True
    assert fake_connection.closed is True
    assert fake_logger.error_messages == []


def test_conversation_belongs_to_user_closes_resources_on_query_error():
    belongs_to_user = _load_conversation_belongs_to_user()
    fake_cursor = FakeCursor(execute_error=RuntimeError("transient disconnect"))
    fake_connection = FakeConnection(fake_cursor)
    fake_logger = FakeLogger()

    belongs_to_user.__globals__["get_db_connection_with_retry"] = lambda: fake_connection
    belongs_to_user.__globals__["logger"] = fake_logger

    try:
        belongs_to_user("conv-123", "user-123")
    except RuntimeError as exc:
        assert str(exc) == "transient disconnect"
    else:
        raise AssertionError("Expected conversation_belongs_to_user to re-raise the DB error")

    assert fake_cursor.closed is True
    assert fake_connection.closed is True
    assert any(
        "Failed to verify conversation ownership" in message
        for message in fake_logger.error_messages
    )
