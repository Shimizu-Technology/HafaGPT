import ast
import asyncio
from pathlib import Path
from types import SimpleNamespace
from typing import List, Optional

import pytest
from fastapi import HTTPException


def _load_endpoint(name: str):
    source_path = Path(__file__).resolve().parents[1] / "api" / "main.py"
    module = ast.parse(source_path.read_text())
    function_node = next(
        node for node in module.body
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name
    )

    class DummyApp:
        @staticmethod
        def post(*args, **kwargs):
            return lambda function: function

    async def verify_user(_authorization):
        return "user-b"

    def unexpected_access(*args, **kwargs):
        raise AssertionError("Unowned conversation reached upload or chatbot processing")

    ownership_checks = []

    def belongs_to_user(conversation_id, user_id):
        ownership_checks.append((conversation_id, user_id))
        return False

    namespace = {
        "app": DummyApp(),
        "Request": object,
        "BackgroundTasks": object,
        "ChatResponse": object,
        "Optional": Optional,
        "List": List,
        "Header": lambda value=None: value,
        "Form": lambda value=None: value,
        "File": lambda default=None: default,
        "UploadFile": object,
        "HTTPException": HTTPException,
        "verify_user": verify_user,
        "conversations": SimpleNamespace(conversation_belongs_to_user=belongs_to_user),
        "read_upload_with_limit": unexpected_access,
        "get_chatbot_response": unexpected_access,
        "get_chatbot_response_stream": unexpected_access,
        "MAX_UPLOAD_FILES": 10,
    }
    isolated = ast.Module(body=[function_node], type_ignores=[])
    exec(compile(isolated, str(source_path), "exec"), namespace)
    return namespace[name], ownership_checks


@pytest.mark.parametrize("endpoint_name", ["chat", "chat_stream"])
def test_unowned_conversation_is_rejected_before_history_or_private_files(endpoint_name):
    endpoint, ownership_checks = _load_endpoint(endpoint_name)
    request = SimpleNamespace(headers={"content-type": "multipart/form-data"})
    kwargs = {
        "request": request,
        "authorization": "Bearer user-b-token",
        "message": "Read these photos",
        "mode": "english",
        "conversation_id": "user-a-conversation",
        "pending_id": "pending-123",
        "file": SimpleNamespace(filename="private-photo.png"),
    }
    if endpoint_name == "chat_stream":
        kwargs.update(background_tasks=object(), files=[])

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(endpoint(**kwargs))

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Conversation not found"
    assert ownership_checks == [("user-a-conversation", "user-b")]
