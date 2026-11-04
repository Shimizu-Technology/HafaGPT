"""The tutor prompt describes a good answer and keeps the real safety rules."""

import ast
from pathlib import Path

import pytest

from api.tutor_intent import tutor_task_guidance
from src.rag.translation_policy import (
    PASSAGE_TRANSLATION_GUIDANCE,
    PASSAGE_WITHOUT_REFERENCE_GUIDANCE,
)

_PROMPT_NAMES = {"ANSWER_CONTRACT", "MODE_PROMPTS", "NO_REFERENCE_GUARD", "SKILL_LEVEL_MODIFIERS"}


def _prompt_constants() -> dict:
    source_path = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
    module = ast.parse(source_path.read_text(encoding="utf-8"))
    namespace: dict = {}
    for node in module.body:
        if isinstance(node, ast.Assign) and any(
            getattr(target, "id", "") in _PROMPT_NAMES for target in node.targets
        ):
            exec(compile(ast.Module(body=[node], type_ignores=[]), str(source_path), "exec"), namespace)
    return namespace


PROMPTS = _prompt_constants()


def _flat(text: str) -> str:
    return " ".join(text.split())


def _all_instruction_layers() -> list[str]:
    layers = [mode["prompt"] for mode in PROMPTS["MODE_PROMPTS"].values()]
    layers += list(PROMPTS["SKILL_LEVEL_MODIFIERS"].values())
    layers += [tutor_task_guidance(task) for task in ("translate", "explain", "practice")]
    layers += [
        PROMPTS["NO_REFERENCE_GUARD"],
        PASSAGE_TRANSLATION_GUIDANCE,
        PASSAGE_WITHOUT_REFERENCE_GUIDANCE,
    ]
    return layers


@pytest.mark.parametrize("mode", ["english", "chamorro", "learn"])
def test_every_mode_shares_the_answer_contract(mode: str) -> None:
    assert PROMPTS["ANSWER_CONTRACT"] in PROMPTS["MODE_PROMPTS"][mode]["prompt"]


def test_contract_puts_the_answer_first_and_marks_uncertainty_inline() -> None:
    contract = _flat(PROMPTS["ANSWER_CONTRACT"])

    assert contract.index("Answer first") < contract.index("Cite a source only")
    assert "Right after any word or construction you are unsure of, add a short note" in contract
    assert "Do not label the whole answer unverified" in contract
    assert "tell the user to send it in English or to ask someone else instead" in contract


def test_contract_keeps_citation_and_consistency_safety() -> None:
    contract = _flat(PROMPTS["ANSWER_CONTRACT"])

    assert "Never invent a citation" in contract
    assert "Words you composed or recalled carry no citation" in contract
    assert 'call anything "verified" without a supplied source' in contract
    assert "Do not retract a form you earlier cited from the HåfaGPT vocabulary list" in contract
    assert "label it a guess" in contract


def test_contract_sets_guam_orthography_default_with_labeled_variants() -> None:
    contract = _flat(PROMPTS["ANSWER_CONTRACT"])

    assert "Teach Guam spelling (Kumisión i Fino' CHamoru 2024 orthography) first" in contract
    assert "CNMI or older spelling, label it as such" in contract


def test_old_refusal_rules_are_gone_from_every_layer() -> None:
    rejected = (
        "do not volunteer",
        "State that no verified entry matched",
        "say it is not verified",
        "Unverified best effort",
        "ONLY use dictionary sources",
        "Never invent language examples",
    )
    for layer in _all_instruction_layers():
        flat = _flat(layer)
        for phrase in rejected:
            assert phrase not in flat


def test_no_reference_guard_allows_drafts_and_brief_absence() -> None:
    guard = _flat(PROMPTS["NO_REFERENCE_GUARD"])

    assert "Still answer" in guard
    assert "give your best natural draft and mark only the words you are unsure of" in guard
    assert "say briefly that no dictionary entry was found" in guard
    assert "Do not cite sources or call anything verified" in guard


def test_immersion_mode_stays_in_chamorro() -> None:
    prompt = _flat(PROMPTS["MODE_PROMPTS"]["chamorro"]["prompt"])

    assert prompt.startswith("Para håo un maestro lengguahi Chamorro. Responde ha' gi fino' Chamorro.")
    assert "Keep the entire response in Chamorro, including any uncertainty note" in prompt


def test_passage_rules_survive() -> None:
    guidance = _flat(PASSAGE_TRANSLATION_GUIDANCE)

    assert "Preserve names and quoted English terms" in guidance
    assert "gender-neutral English pronoun" in guidance
    assert '"polo" denotes a polo shirt' in guidance
    assert "rather than a different word from memory" in guidance


def test_typical_english_prompt_is_shorter_than_the_prohibition_stack() -> None:
    # Before the contract: 3,646-character English mode prompt and 5,216
    # characters for English + beginner + no-reference guard.
    english = PROMPTS["MODE_PROMPTS"]["english"]["prompt"]
    assembled = english + PROMPTS["SKILL_LEVEL_MODIFIERS"]["beginner"] + PROMPTS["NO_REFERENCE_GUARD"]

    assert len(english) < 2600
    assert len(assembled) < 3500


def test_chamorro_draft_rule_applies_only_when_the_answer_is_chamorro() -> None:
    contract = _flat(PROMPTS["ANSWER_CONTRACT"])

    assert "When the requested answer is a Chamorro sentence or message" in contract
    assert "For a sentence or message, write your best natural Chamorro draft" not in contract
