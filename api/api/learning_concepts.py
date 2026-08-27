"""Authoritative identities and alignments for curated learning concepts."""

import json
from pathlib import Path
from typing import Iterable


_MANIFEST_PATH = (
    Path(__file__).resolve().parents[1]
    / "language_content"
    / "curated_concept_manifest.json"
)
with _MANIFEST_PATH.open(encoding="utf-8") as manifest_file:
    _MANIFEST = json.load(manifest_file)

CURATED_DECK_CARD_COUNTS: dict[str, int] = _MANIFEST["deck_card_counts"]
QUESTION_CONCEPTS: dict[str, tuple[str, int]] = {
    question_id: (value[0], value[1])
    for question_id, value in _MANIFEST["question_concepts"].items()
}

LEARNING_TOPIC_CATEGORIES = {
    "greetings": "greetings",
    "numbers": "numbers",
    "colors": "colors",
    "family": "family",
    "food": "food",
    "animals": "animals",
    "phrases": "phrases",
    "questions": "questions",
    "body-parts": "body",
    "days": "days",
    "months": "months",
    "verbs": "verbs",
    "adjectives": "adjectives",
    "sentences": "sentences",
    "places": "places",
    "weather": "weather",
    "household": "household",
    "directions": "directions",
    "shopping": "shopping",
    "daily-life": "daily-life",
    "culture": "culture",
}

LEARNING_TOPIC_QUIZ_CATEGORIES = {
    "greetings": "greetings",
    "numbers": "numbers",
    "colors": "colors",
    "family": "family",
    "food": "food",
    "animals": "animals",
    "phrases": "common-phrases",
    "questions": "questions",
    "body-parts": "body-parts",
    "days": "days",
    "months": "months",
    "verbs": "verbs",
    "adjectives": "adjectives",
    "sentences": "sentences",
    "places": "places",
    "weather": "weather",
    "household": "household",
    "directions": "directions",
    "shopping": "shopping",
    "daily-life": "daily-life",
    "culture": "culture",
}


def _base36(value: int) -> str:
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if value == 0:
        return "0"

    digits: list[str] = []
    while value:
        value, remainder = divmod(value, 36)
        digits.append(alphabet[remainder])
    return "".join(reversed(digits))


def _fnv1a(value: str) -> str:
    hash_value = 0x811C9DC5
    for character in value:
        hash_value ^= ord(character)
        hash_value = (hash_value * 0x01000193) & 0xFFFFFFFF
    return _base36(hash_value)


def curated_concept_id(category_id: str, card_index: int) -> str:
    """Match the established frontend card identity for a curated card."""

    source_id = f"curated:{category_id}:{card_index}"
    return f"v1:curated:{_fnv1a(source_id)}"


def curated_concept_ids(category_id: str) -> tuple[str, ...]:
    card_count = CURATED_DECK_CARD_COUNTS.get(category_id)
    if card_count is None:
        return ()
    return tuple(curated_concept_id(category_id, index) for index in range(card_count))


def validate_curated_concept_ids(
    category_id: str,
    concept_ids: Iterable[str],
) -> tuple[str, ...]:
    """Deduplicate and validate exact concepts against the authored deck."""

    values = tuple(dict.fromkeys(concept_ids))
    allowed = set(curated_concept_ids(category_id))
    if any(concept_id not in allowed for concept_id in values):
        raise ValueError("Concept does not belong to the curated category")
    return values


def question_concept_id(question_id: str) -> str | None:
    relationship = QUESTION_CONCEPTS.get(question_id)
    if relationship is None:
        return None
    category_id, card_index = relationship
    return curated_concept_id(category_id, card_index)


def validate_question_concept(
    *,
    question_id: str,
    concept_id: str | None,
    expected_category_id: str,
) -> None:
    """Reject invented or cross-category quiz-to-card relationships."""

    if concept_id is None:
        return

    relationship = QUESTION_CONCEPTS.get(question_id)
    if relationship is None:
        raise ValueError("Question does not have an authored concept relationship")

    category_id, _ = relationship
    if category_id != expected_category_id:
        raise ValueError("Question concept does not belong to the quiz topic")
    if concept_id != question_concept_id(question_id):
        raise ValueError("Question concept does not match the authored relationship")


def lesson_assessment_id(topic_id: str) -> str:
    return f"v1:lesson:{topic_id}:embedded-quiz"
