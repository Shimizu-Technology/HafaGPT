from __future__ import annotations

from copy import deepcopy

import pytest

from src.rag.knowledge_cards import (
    cards_by_id,
    load_knowledge_cards,
    production_cards,
    validate_knowledge_cards,
)


def test_seed_knowledge_cards_are_valid_and_cited() -> None:
    cards = cards_by_id()

    assert "lexicon.hanom.water" in cards
    assert "orthography.guam.current_reference" in cards
    assert all(card["citations"] for card in cards.values())
    assert all(card["review_notes"] for card in cards.values())
    assert [card["id"] for card in production_cards()] == [
        "orthography.guam.current_reference"
    ]


def test_knowledge_card_cannot_use_discovery_only_source() -> None:
    document = deepcopy(load_knowledge_cards())
    document["cards"][0]["citations"][0]["source_id"] = "swarthmore_student_wiki"

    with pytest.raises(ValueError, match="not approved for cards"):
        validate_knowledge_cards(document)


def test_knowledge_card_enforces_per_source_quote_limit() -> None:
    document = deepcopy(load_knowledge_cards())
    citation = document["cards"][0]["citations"][1]
    citation["source_excerpt"] = " ".join(["word"] * 11)

    with pytest.raises(ValueError, match="exceeds quote limit"):
        validate_knowledge_cards(document)


def test_knowledge_card_cannot_use_source_outside_reviewed_query_role() -> None:
    document = deepcopy(load_knowledge_cards())
    document["cards"][0]["citations"][0]["source_id"] = "gdoe_chamoru_program"

    with pytest.raises(ValueError, match="outside its reviewed query role"):
        validate_knowledge_cards(document)


def test_knowledge_card_requires_primary_support() -> None:
    document = deepcopy(load_knowledge_cards())
    for citation in document["cards"][0]["citations"]:
        citation["support"] = "corroborating"

    with pytest.raises(ValueError, match="requires a primary citation"):
        validate_knowledge_cards(document)


def test_knowledge_card_requires_region_and_temporal_scope() -> None:
    document = deepcopy(load_knowledge_cards())
    document["cards"][0]["region"] = "global"

    with pytest.raises(ValueError, match="unsupported region"):
        validate_knowledge_cards(document)


def test_production_card_rejects_incomplete_source_review() -> None:
    document = deepcopy(load_knowledge_cards())
    document["cards"][0]["release_status"] = "production_ready"

    with pytest.raises(ValueError, match="cites incomplete source review"):
        validate_knowledge_cards(document)


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("url", "/private/imports/dictionary.json", "public HTTP"),
        ("url", "not a url", "public HTTP"),
        ("accessed_at", "2026-99-99", "ISO accessed_at date"),
        ("accessed_at", "August 18, 2026", "ISO accessed_at date"),
    ],
)
def test_knowledge_card_rejects_malformed_citation_fields(
    field: str,
    value: str,
    message: str,
) -> None:
    document = deepcopy(load_knowledge_cards())
    document["cards"][0]["citations"][0][field] = value

    with pytest.raises(ValueError, match=message):
        validate_knowledge_cards(document)


@pytest.mark.parametrize(
    ("target", "message"),
    [
        ("root", "root has undeclared fields"),
        ("metadata", "metadata has undeclared fields"),
        ("card", "knowledge card .* has undeclared fields"),
        ("citation", "citation has undeclared fields"),
    ],
)
def test_knowledge_card_rejects_undeclared_fields(target: str, message: str) -> None:
    document = deepcopy(load_knowledge_cards())
    if target == "root":
        document["unexpected"] = True
    elif target == "metadata":
        document["metadata"]["unexpected"] = True
    elif target == "card":
        document["cards"][0]["unexpected"] = True
    else:
        document["cards"][0]["citations"][0]["unexpected"] = True

    with pytest.raises(ValueError, match=message):
        validate_knowledge_cards(document)


def test_knowledge_card_requires_complete_metadata_contract() -> None:
    document = deepcopy(load_knowledge_cards())
    del document["metadata"]["purpose"]

    with pytest.raises(ValueError, match="metadata is missing fields"):
        validate_knowledge_cards(document)
