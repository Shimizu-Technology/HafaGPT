import ast
from pathlib import Path


def _load_get_conversation_messages():
    source_path = Path(__file__).resolve().parents[1] / "api" / "conversations.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "get_conversation_messages"
    )
    isolated_module = ast.Module(body=[function_node], type_ignores=[])

    class FakeMessageResponse:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    class FakeMessagesResponse:
        def __init__(self, conversation_id, messages):
            self.conversation_id = conversation_id
            self.messages = messages

    class FakeSourceInfo:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    class FakeLogger:
        def __init__(self):
            self.error_messages = []

        def error(self, message):
            self.error_messages.append(message)

    namespace = {
        "MessagesResponse": FakeMessagesResponse,
        "MessageResponse": FakeMessageResponse,
        "SourceInfo": FakeSourceInfo,
        "logger": FakeLogger(),
    }
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return namespace["get_conversation_messages"]


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


def test_get_conversation_messages_skips_blank_assistant_messages():
    get_conversation_messages = _load_get_conversation_messages()
    rows = [
        (1, "user", "First question", "   ", None, None, False, False, None, "english", None, None),
        (2, "user", "Second question", "Real answer", None, None, False, False, None, "english", None, None),
    ]
    fake_connection = FakeConnection(rows)

    get_conversation_messages.__globals__["get_db_connection_with_retry"] = lambda: fake_connection

    response = get_conversation_messages("conv-123")

    assert [message.role for message in response.messages] == ["user", "user", "assistant"]
    assert [message.content for message in response.messages] == [
        "First question",
        "Second question",
        "Real answer",
    ]
    assert fake_connection.cursor_instance.executions[0][1] == ("conv-123",)
    assert fake_connection.cursor_instance.closed is True
    assert fake_connection.closed is True
