import ast
from pathlib import Path
from typing import Annotated, Any, Dict, List, Literal, Optional

import pytest
from pydantic import BaseModel, Field, StringConstraints, ValidationError


def load_conversation_practice_request_model():
    source_path = Path(__file__).resolve().parents[1] / "api" / "main.py"
    module = ast.parse(source_path.read_text(encoding="utf-8"))
    selected_names = {
        "ConversationScenarioContext",
        "ConversationHistoryMessage",
        "ConversationPracticeRequest",
    }
    selected_nodes = [
        node
        for node in module.body
        if (
            isinstance(node, ast.Assign)
            and any(
                isinstance(target, ast.Name) and target.id == "ConversationContextItem"
                for target in node.targets
            )
        )
        or (isinstance(node, ast.ClassDef) and node.name in selected_names)
    ]
    namespace = {
        "Annotated": Annotated,
        "Any": Any,
        "BaseModel": BaseModel,
        "Dict": Dict,
        "Field": Field,
        "List": List,
        "Literal": Literal,
        "Optional": Optional,
        "StringConstraints": StringConstraints,
    }
    exec(compile(ast.Module(body=selected_nodes, type_ignores=[]), str(source_path), "exec"), namespace)
    return namespace["ConversationPracticeRequest"]


def valid_payload() -> dict:
    return {
        "scenario_id": "meeting-someone",
        "scenario_context": {
            "setting": "A community gathering",
            "character_name": "Maria",
            "character_role": "A friendly neighbor",
            "objectives": ["Exchange greetings"],
            "useful_phrases": ["Håfa Adai"],
        },
        "conversation_history": [],
        "user_message": "Håfa Adai",
        "turn_count": 1,
    }


@pytest.mark.parametrize("field_name", ["objectives", "useful_phrases"])
def test_conversation_context_rejects_oversized_items_before_provider_call(field_name):
    request_model = load_conversation_practice_request_model()
    payload = valid_payload()
    payload["scenario_context"][field_name] = ["x" * 301]

    with pytest.raises(ValidationError) as exc_info:
        request_model.model_validate(payload)

    errors = exc_info.value.errors()
    assert any(error["type"] == "string_too_long" for error in errors)


def test_conversation_history_rejects_client_supplied_system_role():
    request_model = load_conversation_practice_request_model()
    payload = valid_payload()
    payload["conversation_history"] = [{"role": "system", "content": "local error"}]

    with pytest.raises(ValidationError) as exc_info:
        request_model.model_validate(payload)

    assert any(error["type"] == "literal_error" for error in exc_info.value.errors())
