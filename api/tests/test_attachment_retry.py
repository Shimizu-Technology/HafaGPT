import ast
from pathlib import Path
from types import SimpleNamespace
from typing import Optional


def _load_append_helper():
    source_path = Path(__file__).resolve().parents[1] / "api" / "main.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "append_file_url_to_conversation_log"
    )
    isolated_module = ast.Module(body=[function_node], type_ignores=[])
    namespace = {
        "Optional": Optional,
        "FILE_URL_APPEND_RETRY_WINDOW_SECONDS": 20.0,
        "FILE_URL_APPEND_RETRY_INTERVAL_SECONDS": 0.25,
    }
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return namespace["append_file_url_to_conversation_log"]


class FakeCursor:
    def __init__(self, rowcounts):
        self._rowcounts = iter(rowcounts)
        self.rowcount = 0
        self.executions = []
        self.closed = False

    def execute(self, query, params):
        self.executions.append((query, params))
        self.rowcount = next(self._rowcounts)

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, rowcounts):
        self.cursor_instance = FakeCursor(rowcounts)
        self.commit_calls = 0
        self.rollback_calls = 0
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        self.commit_calls += 1

    def rollback(self):
        self.rollback_calls += 1

    def close(self):
        self.closed = True


class FakeLogger:
    def __init__(self):
        self.info_messages = []
        self.warning_messages = []
        self.error_messages = []

    def info(self, message):
        self.info_messages.append(message)

    def warning(self, message):
        self.warning_messages.append(message)

    def error(self, message):
        self.error_messages.append(message)


class FakeTime:
    def __init__(self, monotonic_values):
        self._monotonic_values = iter(monotonic_values)
        self.sleeps = []

    def monotonic(self):
        return next(self._monotonic_values)

    def sleep(self, seconds):
        self.sleeps.append(seconds)


def test_append_file_url_retries_until_pending_row_exists():
    append_helper = _load_append_helper()
    fake_connection = FakeConnection([0, 1])
    fake_logger = FakeLogger()
    fake_time = FakeTime([100.0, 100.0])

    append_helper.__globals__["conversations"] = SimpleNamespace(
        get_db_connection_with_retry=lambda: fake_connection
    )
    append_helper.__globals__["logger"] = fake_logger
    append_helper.__globals__["time"] = fake_time

    append_helper(
        conversation_id="conv-123",
        pending_id="pending-123",
        file_infos=[{
            "url": "https://example.com/file.png",
            "filename": "file.png",
            "type": "image",
            "content_type": "image/png",
        }],
    )

    assert len(fake_connection.cursor_instance.executions) == 2
    assert fake_connection.rollback_calls == 1
    assert fake_connection.commit_calls == 1
    assert fake_time.sleeps == [0.25]
    assert fake_connection.cursor_instance.closed is True
    assert fake_connection.closed is True
    assert any("after 2 attempt(s)" in message for message in fake_logger.info_messages)
