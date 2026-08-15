import ast
from pathlib import Path
from typing import Optional


def _load_delete_conversation():
    source_path = Path(__file__).resolve().parents[1] / "api" / "conversations.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "delete_conversation"
    )
    isolated_module = ast.Module(body=[function_node], type_ignores=[])

    class FakeLogger:
        def info(self, _message):
            pass

        def error(self, _message):
            pass

    namespace = {
        "Optional": Optional,
        "logger": FakeLogger(),
        "delete_private_upload_references": lambda _references: 0,
    }
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return namespace["delete_conversation"]


class FakeCursor:
    def __init__(self, owned=True):
        self.owned = owned
        self.executions = []
        self.fetchone_calls = 0
        self.rowcount = 0
        self.closed = False

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.executions.append((normalized, params))
        if normalized.startswith("DELETE FROM conversations"):
            self.rowcount = 1

    def fetchone(self):
        self.fetchone_calls += 1
        if self.fetchone_calls == 1:
            return ("conv-123",) if self.owned else None
        return ("message_feedback",)

    def fetchall(self):
        return [
            (
                "s3://private-bucket/uploads/photo.png",
                [{"url": "s3://private-bucket/uploads/notes.txt"}],
            )
        ]

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, owned=True):
        self.cursor_instance = FakeCursor(owned=owned)
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


def test_delete_conversation_hard_deletes_owned_data_and_private_uploads():
    delete_conversation = _load_delete_conversation()
    connection = FakeConnection()
    cleaned_references = []
    delete_conversation.__globals__["get_db_connection_with_retry"] = lambda: connection
    delete_conversation.__globals__["delete_private_upload_references"] = (
        lambda references: cleaned_references.extend(references) or len(references)
    )

    assert delete_conversation("conv-123", user_id="user-123") is True

    sql = [query for query, _params in connection.cursor_instance.executions]
    assert any("DELETE FROM shared_conversations" in query for query in sql)
    assert any("DELETE FROM message_feedback" in query for query in sql)
    assert any("DELETE FROM conversation_logs" in query for query in sql)
    assert any("DELETE FROM conversations" in query for query in sql)
    assert cleaned_references == [
        "s3://private-bucket/uploads/photo.png",
        "s3://private-bucket/uploads/notes.txt",
    ]
    assert connection.committed is True
    assert connection.cursor_instance.closed is True
    assert connection.closed is True


def test_delete_conversation_does_not_delete_unowned_data():
    delete_conversation = _load_delete_conversation()
    connection = FakeConnection(owned=False)
    delete_conversation.__globals__["get_db_connection_with_retry"] = lambda: connection

    assert delete_conversation("conv-123", user_id="different-user") is False

    assert len(connection.cursor_instance.executions) == 1
    assert connection.committed is False
    assert connection.cursor_instance.closed is True
    assert connection.closed is True
