from __future__ import annotations

from copy import deepcopy

import pytest

from src.rag.knowledge_cards import (
    cards_by_id,
    get_knowledge_card_context,
    load_knowledge_cards,
    matching_production_cards,
    production_cards,
    validate_knowledge_cards,
)


def test_seed_knowledge_cards_are_valid_and_cited() -> None:
    document = load_knowledge_cards()
    cards = cards_by_id()

    assert "lexicon.hanom.water" in cards
    assert "orthography.guam.current_reference" in cards
    assert "usage.guam.school.sym_signoff" in cards
    assert "usage.guam.school.msy_greeting" in cards
    assert all(card["citations"] for card in cards.values())
    assert all(card["review_notes"] for card in cards.values())
    assert [card["id"] for card in production_cards()] == [
        "orthography.guam.current_reference",
        "usage.guam.school.sym_signoff",
        "usage.guam.school.msy_greeting",
    ]
    assert "never store raw group messages" in document["metadata"]["editorial_policy"]
    assert all(
        "No raw school message" in cards[card_id]["review_notes"]
        for card_id in (
            "usage.guam.school.sym_signoff",
            "usage.guam.school.msy_greeting",
        )
    )


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
        ("url", "http://localhost/dictionary.json", "public HTTP"),
        ("url", "http://127.0.0.1/dictionary.json", "public HTTP"),
        ("url", "https://127.1/dictionary.json", "public HTTP"),
        ("url", "https://0177.0.0.1/dictionary.json", "public HTTP"),
        ("url", "https://0x7f.0.0.1/dictionary.json", "public HTTP"),
        ("url", "https://user:secret@example.com/dictionary.json", "public HTTP"),
        ("url", "https://internal/dictionary.json", "public HTTP"),
        ("url", "https://example.com:bad/dictionary.json", "public HTTP"),
        ("url", "https://example.com/foo bar", "public HTTP"),
        ("url", "https://example.com/100%/dictionary.json", "public HTTP"),
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


def test_only_production_ready_cards_can_match_runtime_queries() -> None:
    assert [
        card["id"]
        for card in matching_production_cards("What spelling system does Guam use?")
    ] == ["orthography.guam.current_reference"]
    assert matching_production_cards("What does hånom mean?") == []


def test_region_specific_card_does_not_match_generic_token_overlap() -> None:
    assert matching_production_cards(
        "What spelling system does the dictionary use?"
    ) == []
    assert matching_production_cards("What is the current Chamorro orthography?") == []


def test_sym_card_matches_scoped_guam_and_hurao_questions() -> None:
    for query in (
        "What does SYM mean in a Guam school message?",
        "What does SYM mean at Hurao Academy?",
        "Can you explain the Hurao Academy SYM sign-off?",
        "At Hurao Academy, what does SYM mean at the end of a school message?",
        "Please explain how people use SYM in a Guam school announcement",
        "What does S.Y.M. mean at Hurao Academy?",
    ):
        assert [card["id"] for card in matching_production_cards(query)] == [
            "usage.guam.school.sym_signoff"
        ]


def test_msy_card_matches_scoped_guam_and_hurao_questions() -> None:
    for query in (
        "What does MSY mean in a Guam school message?",
        "What does MSY mean at Hurao Academy?",
        "Can you explain the Hurao Academy MSY greeting?",
        "At Hurao Academy, what does MSY mean at the start of a school message?",
        "Please explain how people use MSY in a Guam school announcement",
        "What does M S Y mean at Hurao Academy?",
    ):
        assert [card["id"] for card in matching_production_cards(query)] == [
            "usage.guam.school.msy_greeting"
        ]


def test_generic_school_image_prompt_does_not_select_a_guam_card_from_text() -> None:
    for query in (
        "What does this say? It's from my daughter's school",
        "What does this say? It’s from my daughter’s school",
    ):
        assert matching_production_cards(query) == []


@pytest.mark.parametrize(
    "query",
    [
        "What does SYM mean?",
        "What does MSY mean?",
        "Tell me about school",
        "What does this image say?",
        "My daughter is at school in Saipan",
    ],
)
def test_school_abbreviation_cards_do_not_apply_without_reviewed_context(query: str) -> None:
    assert matching_production_cards(query) == []


@pytest.mark.parametrize(
    "query",
    [
        "Guam",
        "Tell me about Guam",
        "What system does Guam use for schools?",
        "What does Guam use today?",
    ],
)
def test_guam_marker_without_orthography_intent_does_not_match(query: str) -> None:
    assert matching_production_cards(query) == []


def test_guahan_ascii_region_marker_matches_guam_card() -> None:
    assert [
        card["id"]
        for card in matching_production_cards("What spelling system does Guahan use?")
    ] == ["orthography.guam.current_reference"]


@pytest.mark.parametrize(
    "query",
    [
        "What orthography did Guam use historically?",
        "How was Chamorro spelled on Guam in 1865?",
        "Tell me about ancient Chamorro spelling in Guam",
    ],
)
def test_modern_card_does_not_answer_historical_queries(query: str) -> None:
    assert matching_production_cards(query) == []


def test_knowledge_card_context_is_original_scoped_and_structurally_cited() -> None:
    context, citations = get_knowledge_card_context(
        "Are Guam and CNMI spellings the same?"
    )

    assert "Approved explanation:" in context
    assert "label CNMI forms separately" in context
    assert "Utugrafihan CHamoru, Guåhan, third edition (2024)" in context
    assert citations == [
        {
            "source_id": "kumision_guam_orthography_2024",
            "name": "Utugrafihan CHamoru, Guåhan, third edition (2024)",
            "url": "https://kumisionchamoru.guam.gov/utugrafihan-chamoru-guahan/",
            "page": None,
            "content_role": "normative_orthography",
            "region": "Guam",
            "orthography": "Guam_2024",
            "temporal_scope": "modern",
            "usage_mode": "knowledge_cards",
            "authority_score": 5,
            "citation_required": True,
            "locator": "Official 2024 Utugrafihan CHamoru, Guåhan publication page",
            "accessed_at": "2026-08-18",
            "support": "primary",
            "knowledge_card_id": "orthography.guam.current_reference",
            "evidence_kind": "knowledge_card",
        }
    ]


def test_sym_card_context_is_conditional_and_cites_usage_and_meaning() -> None:
    context, citations = get_knowledge_card_context(
        "At Hurao Academy, what does SYM mean at the end of a school message?"
    )

    assert "Si Yu'os Ma'åse'" in context
    assert "contextual Guam usage, not a universal expansion" in context
    assert "likely reading rather than certain" in context
    assert [citation["source_id"] for citation in citations] == [
        "guam_legislature_committee_records",
        "chamoru_info_dictionary",
    ]
    assert all(
        citation["knowledge_card_id"] == "usage.guam.school.sym_signoff"
        for citation in citations
    )


def test_msy_card_context_is_conditional_and_preserves_teaching_precedence() -> None:
    context, citations = get_knowledge_card_context(
        "At Hurao Academy, what does MSY mean in a school message?"
    )

    assert "Manana si Yu'os" in context
    assert "good morning" in context
    assert "firsthand user context" in context
    assert "not a universal expansion" in context
    assert "Buenas dias" in context
    assert [citation["source_id"] for citation in citations] == [
        "kumision_learning_tools"
    ]
    assert citations[0]["knowledge_card_id"] == "usage.guam.school.msy_greeting"


def test_image_context_can_include_only_a_production_ready_card() -> None:
    context, citations = get_knowledge_card_context(
        "What does this image say?",
        include_card_ids=(
            "usage.guam.school.sym_signoff",
            "usage.guam.school.msy_greeting",
            "lexicon.hanom.water",
            "does.not.exist",
        ),
    )

    assert "usage.guam.school.sym_signoff" in context
    assert "lexicon.hanom.water" not in context
    assert {citation["knowledge_card_id"] for citation in citations} == {
        "usage.guam.school.sym_signoff",
        "usage.guam.school.msy_greeting",
    }
