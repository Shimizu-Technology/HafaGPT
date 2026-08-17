from __future__ import annotations

from copy import deepcopy

import pytest

from src.rag.source_policy import registered_source_ids
from src.rag.source_reviews import (
    build_citation_contract,
    can_create_knowledge_cards,
    can_publish_knowledge_cards,
    can_vectorize_full_text,
    load_source_reviews,
    source_reviews_by_id,
    validate_source_reviews,
)


def test_every_registered_source_has_an_editorial_disposition() -> None:
    reviews = source_reviews_by_id()

    assert set(reviews) == registered_source_ids()
    assert all(review["usage"]["citation_required"] for review in reviews.values())


def test_restricted_sources_are_not_approved_for_full_text_vectorization() -> None:
    reviews = source_reviews_by_id()

    assert can_create_knowledge_cards("chung_grammar_2020")
    assert can_create_knowledge_cards("kumision_guam_orthography_2024")
    assert can_create_knowledge_cards("natibu_marianas_living_dictionary")
    assert not can_publish_knowledge_cards("local_revised_dictionary_snapshot")
    assert can_publish_knowledge_cards("kumision_guam_orthography_2024")
    assert not can_vectorize_full_text("chung_grammar_2020")
    assert not can_vectorize_full_text("guampedia")
    assert reviews["guampedia"]["usage"]["mode"] == "reference_only"


def test_historical_and_discovery_sources_cannot_answer_modern_queries() -> None:
    reviews = source_reviews_by_id()

    for source_id in (
        "topping_ogo_dungca_1975",
        "rosetta_project_vocabulary",
        "historic_dictionary_grammar_1865",
        "ucla_chamorro_phonetics_archive",
    ):
        assert reviews[source_id]["usage"]["mode"] == "historical_only"
        assert reviews[source_id]["usage"]["allowed_query_types"] == ["historical"]

    assert reviews["swarthmore_student_wiki"]["usage"]["mode"] == "discovery_only"
    assert reviews["fino_chamoru_blog_snapshot"]["usage"]["allowed_query_types"] == []


def test_source_review_validation_rejects_coverage_gaps() -> None:
    document = deepcopy(load_source_reviews())
    document["records"].pop()

    with pytest.raises(ValueError, match="coverage mismatch"):
        validate_source_reviews(document)


def test_source_review_validation_rejects_full_text_mode_conflict() -> None:
    document = deepcopy(load_source_reviews())
    record = next(item for item in document["records"] if item["source_id"] == "guampedia")
    record["usage"]["full_text_vectorization"] = True

    with pytest.raises(ValueError, match="full-text vectorization conflicts"):
        validate_source_reviews(document)


def test_citation_contract_exposes_authority_region_time_and_role() -> None:
    citation = build_citation_contract(
        {
            "source": "/documents/Revised-Chamorro-Dictionary.pdf",
            "page": 42,
        }
    )

    assert citation == {
        "source_id": "local_revised_dictionary_snapshot",
        "name": "Local Revised Chamorro Dictionary snapshot",
        "url": None,
        "page": 42,
        "content_role": "reviewed_lexicon",
        "region": "CNMI",
        "orthography": "CNMI_2010",
        "temporal_scope": "living",
        "usage_mode": "knowledge_cards",
        "authority_score": 5,
        "citation_required": True,
    }


def test_citation_contract_never_exposes_unknown_local_paths() -> None:
    citation = build_citation_contract(
        {"source": "/private/imports/Revised-Chamorro-Dictionary.pdf"}
    )

    assert citation is not None
    assert citation["url"] is None
