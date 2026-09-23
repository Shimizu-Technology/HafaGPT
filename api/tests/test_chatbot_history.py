import ast
import json
from pathlib import Path
from urllib.parse import urlsplit


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
        "resolve_private_upload_reference": lambda value: value,
        "urlsplit": urlsplit,
        "json": json,
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
        ("First question", "", None, None, None),
        ("Second question", "   ", None, None, None),
        ("Third question", "Valid answer", None, None, None),
    ]
    fake_connection = FakeConnection(rows)

    get_conversation_history.__globals__["_get_db_connection_with_retry"] = lambda: fake_connection
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
        (None, "Assistant-only row", None, None, None),
        (None, "Image-only answer", "https://example.com/photo.png", None, None),
        ("Real question", "Real answer", None, None, None),
    ]
    fake_connection = FakeConnection(rows)

    get_conversation_history.__globals__["_get_db_connection_with_retry"] = lambda: fake_connection
    history = get_conversation_history("conv-123", max_messages=10)

    assert history == [
        {"role": "user", "content": [
            {"type": "text", "text": "What does this say?"},
            {"type": "image_url", "image_url": {"url": "https://example.com/photo.png", "detail": "low"}},
        ]},
        {"role": "assistant", "content": "Image-only answer"},
        {"role": "user", "content": "Real question"},
        {"role": "assistant", "content": "Real answer"},
    ]


def test_get_conversation_history_accepts_signed_private_image_url():
    get_conversation_history = _load_get_conversation_history()
    signed_url = "https://signed.example/photo.png?X-Amz-Signature=secret"
    rows = [(None, "Image answer", "s3://private-bucket/photo.png", None, None)]
    fake_connection = FakeConnection(rows)

    get_conversation_history.__globals__["_get_db_connection_with_retry"] = lambda: fake_connection
    get_conversation_history.__globals__["resolve_private_upload_reference"] = lambda value: signed_url

    history = get_conversation_history("conv-private-image", max_messages=10)

    assert history == [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What does this say?"},
                {"type": "image_url", "image_url": {"url": signed_url, "detail": "low"}},
            ],
        },
        {"role": "assistant", "content": "Image answer"},
    ]


def test_history_replays_every_image_from_a_five_photo_homework_turn():
    get_conversation_history = _load_get_conversation_history()
    photos = [f"https://example.com/worksheet-{index}.jpg" for index in range(5)]
    attachments = [{"url": url, "type": "image"} for url in photos]
    rows = [
        ("What does my daughter's homework say?", "Earlier interpretation", photos[0], attachments, None),
        *[(f"Follow-up {index}", f"Reply {index}", None, None, None) for index in range(10)],
    ]
    fake_connection = FakeConnection(rows)
    get_conversation_history.__globals__["_get_db_connection_with_retry"] = lambda: fake_connection

    history = get_conversation_history("homework-thread")

    first_user = history[0]
    assert [part["image_url"]["url"] for part in first_user["content"][1:]] == photos
    assert history[-2]["content"] == "Follow-up 9"
    assert fake_connection.cursor_instance.executions[0][1] == ("homework-thread",)
    assert "LIMIT" not in fake_connection.cursor_instance.executions[0][0]


def test_history_marks_unavailable_earlier_photo_without_reusing_its_description():
    get_conversation_history = _load_get_conversation_history()
    fake_connection = FakeConnection([(
        "What does this page say?", "It says X", None,
        [{"url": "s3://private-bucket/missing.jpg", "type": "image"}], None,
    )])
    get_conversation_history.__globals__["_get_db_connection_with_retry"] = lambda: fake_connection
    get_conversation_history.__globals__["resolve_private_upload_reference"] = lambda _value: None

    history = get_conversation_history("missing-photo")

    assert "1 earlier image(s) are unavailable" in history[0]["content"]
    assert "re-upload" in history[0]["content"]


def test_history_replays_image_classified_by_metadata_without_filename_extension():
    get_conversation_history = _load_get_conversation_history()
    image_url = "https://example.com/upload-without-extension"
    fake_connection = FakeConnection([(
        "Please read this photo", "Earlier answer", None,
        [{"url": image_url, "type": "image", "content_type": "image/png"}], None,
    )])
    get_conversation_history.__globals__["_get_db_connection_with_retry"] = lambda: fake_connection

    history = get_conversation_history("extensionless-photo")

    assert history[0]["content"][1]["image_url"]["url"] == image_url
