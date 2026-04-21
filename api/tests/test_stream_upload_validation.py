import ast
import asyncio
from pathlib import Path
from typing import List, Optional

from fastapi import HTTPException


def _load_chat_stream():
    source_path = Path(__file__).resolve().parents[1] / "api" / "main.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "chat_stream"
    )
    isolated_module = ast.Module(body=[function_node], type_ignores=[])

    class DummyApp:
        @staticmethod
        def post(*args, **kwargs):
            def decorator(func):
                return func

            return decorator

    namespace = {
        "app": DummyApp(),
        "Request": object,
        "BackgroundTasks": object,
        "Optional": Optional,
        "List": List,
        "Header": lambda value=None: value,
        "Form": lambda value=None: value,
        "File": lambda default=None: default,
        "UploadFile": object,
        "HTTPException": HTTPException,
    }
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return namespace["chat_stream"]


class FakeRequest:
    def __init__(self, content_type: str = "multipart/form-data; boundary=test"):
        self.headers = {"content-type": content_type}


class FakeBackgroundTasks:
    def add_task(self, *args, **kwargs):
        raise AssertionError("background task should not be scheduled for invalid requests")


class FakeUploadFile:
    def __init__(self, filename: str):
        self.filename = filename


def test_stream_upload_requires_conversation_id():
    chat_stream = _load_chat_stream()

    try:
        asyncio.run(
            chat_stream(
                request=FakeRequest(),
                background_tasks=FakeBackgroundTasks(),
                authorization="Bearer token",
                message="hello",
                mode="english",
                session_id=None,
                conversation_id=None,
                pending_id="pending-123",
                skill_level=None,
                file=FakeUploadFile("photo.png"),
                files=[],
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "conversation_id is required when uploading files to the streaming endpoint"
    else:
        raise AssertionError("Expected chat_stream to reject file uploads without conversation_id")


def test_stream_upload_requires_pending_id():
    chat_stream = _load_chat_stream()

    try:
        asyncio.run(
            chat_stream(
                request=FakeRequest(),
                background_tasks=FakeBackgroundTasks(),
                authorization="Bearer token",
                message="hello",
                mode="english",
                session_id=None,
                conversation_id="conv-123",
                pending_id=None,
                skill_level=None,
                file=FakeUploadFile("photo.png"),
                files=[],
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "pending_id is required when uploading files to the streaming endpoint"
    else:
        raise AssertionError("Expected chat_stream to reject file uploads without pending_id")
