from __future__ import annotations

import pytest

from src.rag.source_policy import (
    SourceIngestionBlocked,
    annotate_metadata,
    assert_ingestion_allowed,
    is_retrieval_allowed,
    load_source_registry,
    registered_source_ids,
    resolve_source,
    source_weight,
)


def metadata(source: str, source_type: str = "") -> dict:
    return {"source": source, "source_type": source_type}


def test_registry_is_valid_and_source_ids_are_unique() -> None:
    registry = load_source_registry()

    assert registry["default_policy"]["retrieval_allowed"] is False
    assert len(registered_source_ids()) == len(registry["sources"])
    assert "kumision_guam_orthography_2024" in registered_source_ids()
    assert "natibu_marianas_living_dictionary" in registered_source_ids()
    for source in registry["sources"]:
        if source["retrieval"]["allowed"]:
            assert source["retrieval"]["weight"] > 0
        else:
            assert source["retrieval"]["weight"] == 0


@pytest.mark.parametrize(
    "source,source_type",
    [
        ("https://www.guampedia.com/example", "guampedia"),
        ("https://wikis.swarthmore.edu/ling073/Chamorro/Grammar", "website"),
        ("supplemental_dictionary.json", "dictionary"),
        ("https://lengguahita.com/chamorro-stories/example", "lengguahita"),
    ],
)
def test_phase_zero_blocked_sources_are_never_retrieved(source: str, source_type: str) -> None:
    source_metadata = metadata(source, source_type)

    assert resolve_source(source_metadata) is not None
    assert all(
        not is_retrieval_allowed(source_metadata, query_type)
        for query_type in ("lookup", "educational", "usage", "cultural", "historical")
    )
    assert source_weight(source_metadata, "lookup") == 0.0


def test_context_sources_cannot_answer_canonical_lookup_questions() -> None:
    pdn = metadata("https://www.guampdn.com/opinion/example")
    visit_guam = metadata("https://www.visitguam.com/chamorro-culture/simple-chamorro-greetings/")

    assert not is_retrieval_allowed(pdn, "lookup")
    assert not is_retrieval_allowed(visit_guam, "lookup")
    assert is_retrieval_allowed(pdn, "usage")
    assert is_retrieval_allowed(visit_guam, "cultural")


def test_regional_dictionary_is_annotated_and_role_limited() -> None:
    revised = metadata("/documents/Revised-Chamorro-Dictionary.pdf")
    annotated = annotate_metadata(revised)

    assert is_retrieval_allowed(revised, "lookup")
    assert not is_retrieval_allowed(revised, "cultural")
    assert annotated["source_id"] == "local_revised_dictionary_snapshot"
    assert annotated["content_role"] == "reviewed_lexicon"
    assert annotated["source_region"] == "CNMI"
    assert annotated["source_orthography"] == "CNMI_2010"


def test_unknown_sources_fail_closed() -> None:
    unknown = metadata("https://example.com/unreviewed-chamorro-page")

    assert resolve_source(unknown) is None
    assert not is_retrieval_allowed(unknown, "educational")
    assert annotate_metadata(unknown)["source_id"] == "unregistered"


def test_generic_news_article_type_does_not_impersonate_pdn() -> None:
    unknown_news = metadata("https://example.com/chamorro-news", "news_article")

    assert resolve_source(unknown_news) is None
    assert not is_retrieval_allowed(unknown_news, "usage")


def test_ingestion_requires_explicit_registry_permission() -> None:
    with pytest.raises(SourceIngestionBlocked, match="not approved for ingestion"):
        assert_ingestion_allowed(metadata("https://www.chamoru.info/dictionary/"))

    with pytest.raises(SourceIngestionBlocked, match="Unregistered language source"):
        assert_ingestion_allowed(metadata("https://example.com/new-source"))
