"""Authoritative identities and alignments for curated learning concepts."""

import json
import unicodedata
from pathlib import Path
from typing import Iterable


_MANIFEST_PATH = (
    Path(__file__).resolve().parents[1]
    / "language_content"
    / "curated_concept_manifest.json"
)
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


def _normalize_identity_part(value: str) -> str:
    return " ".join(unicodedata.normalize("NFC", value).strip().lower().split())


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
    utf16_value = value.encode("utf-16-le")
    for offset in range(0, len(utf16_value), 2):
        code_unit = int.from_bytes(utf16_value[offset : offset + 2], "little")
        hash_value ^= code_unit
        hash_value = (hash_value * 0x01000193) & 0xFFFFFFFF
    return _base36(hash_value)


def curated_concept_id(category_id: str, card_index: int) -> str:
    """Match the established frontend card identity for a curated card."""

    normalized_category_id = _normalize_identity_part(category_id)
    source_id = f"curated:{normalized_category_id}:{card_index}"
    return f"v1:curated:{_fnv1a(_normalize_identity_part(source_id))}"


def validate_curated_concept_manifest(manifest: object) -> None:
    """Fail fast when authored deck and question relationships are malformed."""

    if not isinstance(manifest, dict) or manifest.get("version") != 1:
        raise ValueError("Curated concept manifest must use version 1")
    deck_counts = manifest.get("deck_card_counts")
    question_concepts = manifest.get("question_concepts")
    if not isinstance(deck_counts, dict) or not isinstance(question_concepts, dict):
        raise ValueError("Curated concept manifest is missing relationship maps")

    for category_id, card_count in deck_counts.items():
        if (
            not isinstance(category_id, str)
            or not isinstance(card_count, int)
            or isinstance(card_count, bool)
            or card_count < 0
        ):
            raise ValueError("Curated deck card counts must be non-negative integers")

    missing_topic_categories = set(LEARNING_TOPIC_CATEGORIES.values()) - set(deck_counts)
    if missing_topic_categories:
        raise ValueError("Learning topic category is missing from the curated manifest")

    concept_relationships: dict[str, tuple[str, int]] = {}
    for category_id, card_count in deck_counts.items():
        for card_index in range(card_count):
            concept_id = curated_concept_id(category_id, card_index)
            prior_relationship = concept_relationships.get(concept_id)
            if prior_relationship is not None:
                raise ValueError(
                    "Curated concept identity collision between "
                    f"{prior_relationship} and {(category_id, card_index)}"
                )
            concept_relationships[concept_id] = (category_id, card_index)

    for relationship in question_concepts.values():
        if (
            not isinstance(relationship, list)
            or len(relationship) != 2
            or not isinstance(relationship[0], str)
            or not isinstance(relationship[1], int)
            or isinstance(relationship[1], bool)
        ):
            raise ValueError("Curated question relationship is malformed")
        category_id, card_index = relationship
        card_count = deck_counts.get(category_id)
        if card_count is None or card_index < 0 or card_index >= card_count:
            raise ValueError("Curated question relationship is out of range")


with _MANIFEST_PATH.open(encoding="utf-8") as manifest_file:
    _MANIFEST = json.load(manifest_file)

validate_curated_concept_manifest(_MANIFEST)
CURATED_DECK_CARD_COUNTS: dict[str, int] = _MANIFEST["deck_card_counts"]
QUESTION_CONCEPTS: dict[str, tuple[str, int]] = {
    question_id: (value[0], value[1])
    for question_id, value in _MANIFEST["question_concepts"].items()
}


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
