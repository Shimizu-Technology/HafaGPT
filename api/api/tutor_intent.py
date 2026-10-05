"""Explicit tutor tasks and bounded, source-backed curriculum context."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Literal

from .canonical_context import get_canonical_tutor_context
from src.rag.source_reviews import build_registered_source_citation

TutorIntent = Literal["translate", "explain", "practice"]


def normalize_tutor_intent(value: str | None) -> TutorIntent | None:
    if value == "ask":  # Preserve existing shared links.
        return "explain"
    if value is None:
        return None
    if value not in ("translate", "explain", "practice"):
        raise ValueError("Intent must be translate, explain, or practice")
    return value


def tutor_task_guidance(intent: str | None) -> str:
    task = normalize_tutor_intent(intent)
    guidance = {
        "translate": "Translate the supplied text directly first. Ask one clarification only if needed. Do not append a quiz or require the learner to guess. Keep extra explanation optional.",
        "explain": "Answer the question directly, then explain one relevant point in plain language. Use one supplied example when helpful. Do not force a practice exercise.",
        "practice": "Guide a short practice exchange. Ask one question at a time and wait for the learner. Offer a hint before revealing an answer when they are stuck. Give specific feedback about their actual response, not generic praise. End with one clear next action. Do not count an English request for help as demonstrated Chamorro.",
    }
    return ("\n\nSELECTED TUTOR TASK:\n" + guidance[task] +
            "\nThis task changes teaching style only. Preserve all source, translation, image-completeness, and response-language policies. Never invent language examples or pronunciation guides.") if task else ""


@lru_cache(maxsize=1)
def _curriculum_entries() -> tuple[dict, ...]:
    path = Path(__file__).resolve().parents[1] / "language_content/canonical_vocabulary.json"
    return tuple(json.loads(path.read_text(encoding="utf-8"))["entries"])


@lru_cache(maxsize=1)
def _introduction_example() -> tuple[str, str] | None:
    path = Path(__file__).resolve().parents[1] / "dictionary_data/revised_and_updated_chamorro_dictionary.json"
    dictionary = json.loads(path.read_text(encoding="utf-8"))
    example = dictionary.get("Chumbai'", {}).get("Other", [])
    for index, value in enumerate(example[:-1]):
        if isinstance(value, str) and value.strip().startswith("I  na'ån") and str(example[index + 1]).startswith("My name is"):
            return value, str(example[index + 1])
    return None


def curriculum_tutor_context(message: str, intent: str | None,
                             learning_topic_id: str | None = None) -> tuple[str, list]:
    """Select existing ledger terms, never promote client-authored phrases to evidence.

    Introduction requests also include a verbatim dictionary example already in
    the governed corpus. Its full example, rather than a newly authored sentence,
    supports the name pattern used by the app.
    """
    task = normalize_tutor_intent(intent)
    if task == "translate":
        return "", []
    introduction = bool(re.search(r"\b(introduc\w*|my name|greetings?)\b", message, re.I)) or (task == "practice" and learning_topic_id == "greetings")
    categories = {"greetings", "numbers", "colors", "family", "food", "body", "verbs"}
    category = learning_topic_id if task == "practice" and learning_topic_id in categories else None
    if introduction:
        category = "greetings"
    if not category:
        return "", []
    entries = [entry for entry in _curriculum_entries()
               if entry.get("category") == category and entry.get("review_status") == "source_backed"][:3]
    phrase_query = "\n".join(entry["recommended_teaching_term"] for entry in entries)
    context, sources = get_canonical_tutor_context(phrase_query)
    if introduction:
        example = _introduction_example()
        if example:
            value, gloss = example
            context += ("\n\nSource: Revised and updated Chamorro dictionary\n"
                        "Entry: Chumbai'\nVerbatim dictionary example: " + value +
                        "\nEnglish gloss: " + gloss +
                        "\nUse this existing example to explain the name-introduction pattern. Name substitution is an adaptation, not a verbatim source quote. Do not imply that this example verifies a longer new introduction or the learner's whole sentence.")
            sources.append({**(build_registered_source_citation("local_revised_dictionary_snapshot") or {}),
                            "name": "Revised and updated Chamorro dictionary", "page": None,
                            "locator": "Chumbai' entry: name-introduction example",
                            "support": "Contains the quoted name-introduction example; adapted names and new sentences are not verbatim source text.",
                            "evidence_kind": "curriculum_dictionary_example"})
    return context, sources
