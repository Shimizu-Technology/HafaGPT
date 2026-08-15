from __future__ import annotations

import pytest

from src.rag.permission_records import permission_records_by_source
from src.rag.source_policy import (
    SourceIngestionBlocked,
    annotate_metadata,
    assert_collection_use_allowed,
    assert_ingestion_allowed,
    is_retrieval_allowed,
    load_source_registry,
    registered_source_ids,
    resolve_source,
    source_weight,
    sources_explicitly_mentioned,
)


def metadata(source: str, source_type: str = "") -> dict:
    return {"source": source, "source_type": source_type}


def test_registry_is_valid_and_source_ids_are_unique() -> None:
    registry = load_source_registry()

    assert registry["default_policy"]["retrieval_allowed"] is False
    assert len(registered_source_ids()) == len(registry["sources"])
    assert "kumision_guam_orthography_2024" in registered_source_ids()
    assert "natibu_marianas_living_dictionary" in registered_source_ids()
    assert {
        "cnmi_language_policy_commission",
        "cnmi_english_chamorro_finder_2024",
        "uog_chamoru_studies_program",
        "ucla_chamorro_phonetics_archive",
        "kumision_learning_tools",
    } <= registered_source_ids()
    for source in registry["sources"]:
        if source["retrieval"]["allowed"]:
            assert source["retrieval"]["weight"] > 0
        else:
            assert source["retrieval"]["weight"] == 0


def test_every_external_source_has_a_permission_or_outreach_record() -> None:
    records = permission_records_by_source()
    internal_ids = {
        "hafagpt_canonical_evaluation",
        "supplemental_dictionary_unreviewed",
        "local_abbreviations_unreviewed",
    }

    assert registered_source_ids() - internal_ids == set(records)
    assert all(record["status"] != "granted" for record in records.values())


@pytest.mark.parametrize(
    "source,source_type",
    [
        ("https://www.guampedia.com/example", "guampedia"),
        ("https://wikis.swarthmore.edu/ling073/Chamorro/Grammar", "website"),
        ("supplemental_dictionary.json", "dictionary"),
        ("https://lengguahita.com/chamorro-stories/example", "lengguahita"),
        ("https://cnmidcca.org/default.asp?secID=14", "website"),
        ("https://archive.phonetics.ucla.edu/Language/CHA/cha.html", "audio_archive"),
        (
            "https://kumisionchamoru.guam.gov/materiat-ineyak-siha-learning-tools/",
            "website",
        ),
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


def test_explicit_source_alias_respects_query_role() -> None:
    usage_matches = sources_explicitly_mentioned(
        "Who writes for the Pacific Daily News?",
        "usage",
    )

    assert [source["id"] for source in usage_matches] == ["pacific_daily_news"]
    assert sources_explicitly_mentioned("Define a PDN word", "lookup") == []


def test_ingestion_requires_explicit_registry_permission() -> None:
    with pytest.raises(SourceIngestionBlocked, match="not approved for ingestion"):
        assert_ingestion_allowed(metadata("https://www.chamoru.info/dictionary/"))

    with pytest.raises(SourceIngestionBlocked, match="Unregistered language source"):
        assert_ingestion_allowed(metadata("https://example.com/new-source"))


def test_evaluation_source_cannot_enter_production_rag() -> None:
    evaluation_metadata = metadata(
        "internal://hafagpt_canonical_evaluation/v1",
        "hafagpt_canonical_evaluation",
    )

    annotated = assert_ingestion_allowed(evaluation_metadata, "model_evaluation")

    assert annotated["source_id"] == "hafagpt_canonical_evaluation"
    with pytest.raises(SourceIngestionBlocked, match="production_rag"):
        assert_ingestion_allowed(evaluation_metadata)


def test_evaluation_collection_cannot_be_selected_as_production_rag() -> None:
    with pytest.raises(ValueError, match="evaluation-only"):
        assert_collection_use_allowed("hafagpt_eval_canonical_v1", "production_rag")

    assert_collection_use_allowed("hafagpt_eval_canonical_v1", "model_evaluation")
