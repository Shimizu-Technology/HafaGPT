import ast
import os
from pathlib import Path

import pytest


CHATBOT_SOURCE = (
    Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
).read_text(encoding="utf-8")


def _model_config_entry(alias: str) -> dict:
    module = ast.parse(CHATBOT_SOURCE)
    assignment = next(
        node
        for node in module.body
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "MODEL_CONFIG" for target in node.targets)
    )
    assert isinstance(assignment.value, ast.Dict)
    for key, value in zip(assignment.value.keys, assignment.value.values):
        if isinstance(key, ast.Constant) and key.value == alias:
            return ast.literal_eval(value)
    raise AssertionError(f"Missing runtime model alias: {alias}")


def _load_request_helpers(extra_functions: tuple[str, ...] = ()):
    module = ast.parse(CHATBOT_SOURCE)
    function_names = {"model_supports_temperature", "optional_chat_completion_kwargs", *extra_functions}
    functions = [
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name in function_names
    ]
    namespace = {
        "MODEL_CONFIG": {
            "gpt-5.6-luna": {
                "model_id": "openai/gpt-5.6-luna",
                "supports_temperature": False,
            },
            "deepseek-v3": {
                "model_id": "deepseek/deepseek-chat",
                "supports_temperature": True,
            },
        },
        "Any": object,
        "os": os,
    }
    exec(compile(ast.Module(body=functions, type_ignores=[]), "chatbot_service.py", "exec"), namespace)
    return namespace


def test_luna_is_a_production_runtime_alias() -> None:
    luna = _model_config_entry("gpt-5.6-luna")

    assert luna == {
        "provider": "openrouter",
        "model_id": "openai/gpt-5.6-luna",
        "supports_vision": True,
        "supports_temperature": False,
        "image_detail": "original",
        "supports_reasoning_effort": True,
    }


def test_luna_request_omits_unsupported_temperature() -> None:
    helpers = _load_request_helpers()

    kwargs = helpers["optional_chat_completion_kwargs"]("openai/gpt-5.6-luna")

    assert "temperature" not in kwargs


def test_existing_temperature_models_keep_current_behavior() -> None:
    helpers = _load_request_helpers()

    kwargs = helpers["optional_chat_completion_kwargs"]("deepseek/deepseek-chat")

    assert kwargs["temperature"] == 0.7


def test_image_detail_and_reasoning_effort_are_opt_in_per_model() -> None:
    namespace = _load_request_helpers(
        ("_model_option", "transcription_image_detail", "reasoning_effort_kwargs")
    )
    namespace["MODEL_CONFIG"]["gpt-5.6-luna"].update(image_detail="original", supports_reasoning_effort=True)

    assert namespace["transcription_image_detail"]("openai/gpt-5.6-luna") == "original"
    assert namespace["transcription_image_detail"]("deepseek/deepseek-chat") == "high"
    assert namespace["reasoning_effort_kwargs"]("openai/gpt-5.6-luna", "low") == {
        "extra_body": {"reasoning": {"effort": "low"}}
    }
    assert namespace["reasoning_effort_kwargs"]("deepseek/deepseek-chat", "low") == {}
    assert namespace["reasoning_effort_kwargs"]("unknown/model", "low") == {}


@pytest.mark.parametrize('configured,enabled', [(None, False), ('', False), ('false', False), ('1', False), ('yes', False), ('true', True), (' TRUE ', True)])
def test_photo_streaming_requires_explicit_server_opt_in(monkeypatch, configured, enabled) -> None:
    if configured is None:
        monkeypatch.delenv('HAFAGPT_PHOTO_TRANSLATION_STREAMING_ENABLED', raising=False)
    else:
        monkeypatch.setenv('HAFAGPT_PHOTO_TRANSLATION_STREAMING_ENABLED', configured)
    helpers = _load_request_helpers(('photo_translation_streaming_enabled',))
    assert helpers['photo_translation_streaming_enabled']() is enabled
