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


class _FakeOpenAI:
    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs


def _llm_client_loader(monkeypatch, chat_model: str, **env: str | None):
    for name in ("OPENAI_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_BASE"):
        monkeypatch.delenv(name, raising=False)
    for name, value in env.items():
        if value is not None:
            monkeypatch.setenv(name, value)
    module = ast.parse(CHATBOT_SOURCE)
    nodes = [
        node
        for node in module.body
        if (isinstance(node, ast.FunctionDef) and node.name == "get_llm_client")
        or (isinstance(node, ast.ClassDef) and node.name == "ModelConfigurationError")
    ]
    namespace = {
        "MODEL_CONFIG": {
            "gpt-4o": {"provider": "openai", "model_id": "gpt-4o"},
            "gpt-5.6-luna": {"provider": "openrouter", "model_id": "openai/gpt-5.6-luna"},
            "odd": {"provider": "carrier-pigeon", "model_id": "odd"},
        },
        "CHAT_MODEL": chat_model,
        "OpenAI": _FakeOpenAI,
        "os": os,
    }
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "chatbot_service.py", "exec"), namespace)
    return namespace


def test_configured_openrouter_model_keeps_its_route(monkeypatch) -> None:
    namespace = _llm_client_loader(monkeypatch, "gpt-5.6-luna", OPENROUTER_API_KEY="or-key")

    client, model_id = namespace["get_llm_client"]()

    assert model_id == "openai/gpt-5.6-luna"
    assert client.kwargs == {"api_key": "or-key", "base_url": "https://openrouter.ai/api/v1"}


def test_configured_openai_model_keeps_its_route(monkeypatch) -> None:
    namespace = _llm_client_loader(monkeypatch, "gpt-4o", OPENAI_API_KEY="oa-key")

    client, model_id = namespace["get_llm_client"]()

    assert model_id == "gpt-4o"
    assert client.kwargs["api_key"] == "oa-key"


@pytest.mark.parametrize("typo", ["gpt-5.6-lunna", "", "gpt-5.6-luna "])
def test_unknown_chat_model_stops_startup_instead_of_routing_to_gpt_4o(monkeypatch, typo) -> None:
    # Even with both keys present the old code returned gpt-4o for a typo.
    namespace = _llm_client_loader(
        monkeypatch, typo, OPENAI_API_KEY="oa-key", OPENROUTER_API_KEY="or-key"
    )

    with pytest.raises(namespace["ModelConfigurationError"]) as error:
        namespace["get_llm_client"]()

    assert repr(typo) in str(error.value)
    assert "gpt-5.6-luna" in str(error.value)
    assert "oa-key" not in str(error.value) and "or-key" not in str(error.value)


def test_missing_openrouter_key_stops_startup_instead_of_routing_to_gpt_4o(monkeypatch) -> None:
    namespace = _llm_client_loader(monkeypatch, "gpt-5.6-luna", OPENAI_API_KEY="oa-key")

    with pytest.raises(namespace["ModelConfigurationError"], match="OPENROUTER_API_KEY"):
        namespace["get_llm_client"]()


def test_missing_openai_key_and_unknown_provider_are_named(monkeypatch) -> None:
    with pytest.raises(Exception, match="OPENAI_API_KEY"):
        _llm_client_loader(monkeypatch, "gpt-4o")["get_llm_client"]()
    with pytest.raises(Exception, match="unsupported provider"):
        _llm_client_loader(monkeypatch, "odd", OPENAI_API_KEY="oa-key")["get_llm_client"]()


def test_the_model_configuration_is_checked_when_the_module_loads():
    tree = ast.parse(CHATBOT_SOURCE)
    calls = [
        node for node in tree.body
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call)
        and getattr(node.value.func, 'id', '') == 'get_llm_client'
    ]
    assert len(calls) == 1
