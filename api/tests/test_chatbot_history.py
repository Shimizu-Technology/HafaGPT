import ast
from pathlib import Path


def _load_get_conversation_history():
    source_path = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "get_conversation_history"
    )
    isolated_module = ast.Module(body=[function_node], type_ignores=[])
    namespace = {
        "VALID_IMAGE_EXTENSIONS": (".jpg", ".jpeg", ".png", ".gif", ".webp"),
    }
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return namespace["get_conversation_history"]


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows
        self.executions = []
        self.closed = False

    def execute(self, query, params):
        self.executions.append((query, params))

    def fetchall(self):
        return self.rows

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, rows):
        self.cursor_instance = FakeCursor(rows)
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def close(self):
        self.closed = True


def test_get_conversation_history_skips_blank_assistant_messages():
    get_conversation_history = _load_get_conversation_history()
    rows = [
        ("First question", "", None, None),
        ("Second question", "   ", None, None),
        ("Third question", "Valid answer", None, None),
    ]
    fake_connection = FakeConnection(rows)

    get_conversation_history.__globals__["_get_db_connection_with_retry"] = lambda: fake_connection
    get_conversation_history.__globals__["model_supports_vision"] = lambda: False

    history = get_conversation_history("conv-123", max_messages=10)

    assert history == [
        {"role": "user", "content": "First question"},
        {"role": "user", "content": "Second question"},
        {"role": "user", "content": "Third question"},
        {"role": "assistant", "content": "Valid answer"},
    ]
    assert fake_connection.cursor_instance.executions[0][1] == ("conv-123", 10)
    assert fake_connection.cursor_instance.closed is True
    assert fake_connection.closed is True


def test_get_conversation_history_skips_rows_without_user_text_or_image():
    get_conversation_history = _load_get_conversation_history()
    rows = [
        (None, "Assistant-only row", None, None),
        (None, "Image-only answer", "https://example.com/photo.png", None),
        ("Real question", "Real answer", None, None),
    ]
    fake_connection = FakeConnection(rows)

    get_conversation_history.__globals__["_get_db_connection_with_retry"] = lambda: fake_connection
    get_conversation_history.__globals__["model_supports_vision"] = lambda: False

    history = get_conversation_history("conv-123", max_messages=10)

    assert history == [
        {"role": "user", "content": "What does this say?"},
        {"role": "assistant", "content": "Image-only answer"},
        {"role": "user", "content": "Real question"},
        {"role": "assistant", "content": "Real answer"},
    ]
