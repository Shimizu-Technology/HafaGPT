import ast
import asyncio
import logging
import os
from pathlib import Path
from types import SimpleNamespace
from typing import List, Optional

from fastapi import HTTPException
from fastapi.responses import StreamingResponse


def _load_chat_stream():
    source_path = Path(__file__).resolve().parents[1] / "api" / "main.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "chat_stream"
    )
    isolated_module = ast.Module(body=[function_node], type_ignores=[])
    max_upload_files = next(
        ast.literal_eval(node.value)
        for node in module.body
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "MAX_UPLOAD_FILES" for target in node.targets)
    )
    max_upload_total_size_mb = next(
        ast.literal_eval(node.value)
        for node in module.body
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "MAX_UPLOAD_TOTAL_SIZE_MB" for target in node.targets)
    )

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
        "MAX_UPLOAD_FILES": max_upload_files,
        "MAX_UPLOAD_TOTAL_SIZE_MB": max_upload_total_size_mb,
        "MAX_UPLOAD_TOTAL_BYTES": max_upload_total_size_mb * 1024 * 1024,
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
    def __init__(self, filename: str, data: bytes = b""):
        self.filename = filename
        self.data = data
        self.content_type = "image/png"


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


def test_stream_upload_accepts_six_files_past_legacy_cap():
    chat_stream = _load_chat_stream()

    try:
        asyncio.run(
            chat_stream(
                request=FakeRequest(),
                background_tasks=FakeBackgroundTasks(),
                authorization="Bearer token",
                message="Please help with these photos",
                mode="english",
                session_id=None,
                conversation_id=None,
                pending_id="pending-123",
                skill_level=None,
                file=None,
                files=[FakeUploadFile(f"photo-{index}.png") for index in range(6)],
            )
        )
    except HTTPException as exc:
        assert exc.detail == "conversation_id is required when uploading files to the streaming endpoint"
    else:
        raise AssertionError("Expected six files to pass the count check")


def test_stream_upload_rejects_eleven_files():
    chat_stream = _load_chat_stream()

    try:
        asyncio.run(
            chat_stream(
                request=FakeRequest(),
                background_tasks=FakeBackgroundTasks(),
                authorization="Bearer token",
                message="Please help with these photos",
                mode="english",
                session_id=None,
                conversation_id="conv-123",
                pending_id="pending-123",
                skill_level=None,
                file=None,
                files=[FakeUploadFile(f"photo-{index}.png") for index in range(11)],
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Maximum 10 files allowed"
    else:
        raise AssertionError("Expected eleven files to exceed the count limit")


def _configure_valid_stream_upload(chat_stream):
    async def verify_user(_authorization):
        return "user-123"

    async def read_upload_with_limit(uploaded_file):
        return uploaded_file.data

    chat_stream.__globals__.update({
        "verify_user": verify_user,
        "conversations": SimpleNamespace(conversation_belongs_to_user=lambda *_: True),
        "set_user_context": lambda **_: None,
        "set_request_context": lambda **_: None,
        "os": os,
        "logger": logging.getLogger(__name__),
        "read_upload_with_limit": read_upload_with_limit,
        "validate_uploaded_file_size": lambda *_: None,
        "process_uploaded_file": lambda **_: {},
        "StreamingResponse": StreamingResponse,
    })


class AcceptingBackgroundTasks:
    def __init__(self):
        self.tasks = []

    def add_task(self, *args, **kwargs):
        self.tasks.append((args, kwargs))


def test_stream_accepts_exactly_50_mb_combined_upload():
    chat_stream = _load_chat_stream()
    _configure_valid_stream_upload(chat_stream)
    chat_stream.__globals__["upload_file_to_s3_background"] = lambda **_: None
    background_tasks = AcceptingBackgroundTasks()
    files = [
        FakeUploadFile("first.png", b"a" * (20 * 1024 * 1024)),
        FakeUploadFile("second.png", b"b" * (20 * 1024 * 1024)),
        FakeUploadFile("third.png", b"c" * (10 * 1024 * 1024)),
    ]

    response = asyncio.run(chat_stream(
        request=FakeRequest(), background_tasks=background_tasks,
        authorization="Bearer token", message="Read these photos", mode="english",
        conversation_id="conv-123", pending_id="pending-123", file=None, files=files,
    ))

    assert isinstance(response, StreamingResponse)
    assert len(background_tasks.tasks) == 1


def test_stream_rejects_one_byte_above_50_mb_combined_upload():
    chat_stream = _load_chat_stream()
    _configure_valid_stream_upload(chat_stream)
    files = [
        FakeUploadFile("first.png", b"a" * (20 * 1024 * 1024)),
        FakeUploadFile("second.png", b"b" * (20 * 1024 * 1024)),
        FakeUploadFile("third.png", b"c" * (10 * 1024 * 1024 + 1)),
    ]

    try:
        asyncio.run(chat_stream(
            request=FakeRequest(), background_tasks=FakeBackgroundTasks(),
            authorization="Bearer token", message="Read these photos", mode="english",
            conversation_id="conv-123", pending_id="pending-123", file=None, files=files,
        ))
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Files exceed the 50MB combined upload limit"
    else:
        raise AssertionError("Expected combined upload limit rejection")
