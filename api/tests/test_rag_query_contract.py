from src.rag.chamorro_rag import (
    _chamorro_keyword_query_params,
    _clip_english_lookup_evidence,
    _extract_english_lookup_candidate,
    _english_keyword_query_params,
    detect_query_type,
)


def test_chamorro_keyword_collection_parameter_follows_ranking_patterns() -> None:
    params = _chamorro_keyword_query_params("hanom", "collection-v1", 3)

    assert params[3] == "collection-v1"
    assert params[-1] == 6


def test_english_keyword_collection_parameter_follows_five_ranking_patterns() -> None:
    params = _english_keyword_query_params("water", "collection-v1", 3)

    assert params[5] == "collection-v1"
    assert params[-1] == 9


def test_english_lookup_extracts_chamoru_info_table_entry() -> None:
    content = """entry | hånom
---|---
pronunciation | huh-noom
meaning | noun. water; liquid.
etymology | From Proto-Malayo-Polynesian danum.
"""

    assert _extract_english_lookup_candidate(content, "water") == "hånom"


def test_english_lookup_extracts_revised_dictionary_table_mapping() -> None:
    content = "| English | Chamorro |\n|---|---|\n| water | hånum |"

    assert _extract_english_lookup_candidate(content, "water") == "hånum"


def test_english_lookup_rejects_footer_keyword_noise() -> None:
    content = "Discover more | flowers | water | gift baskets | consoles"

    assert _extract_english_lookup_candidate(content, "water") is None


def test_explicit_translation_stays_lookup_when_request_mentions_examples() -> None:
    query = (
        "How do you say water in Chamorro? Include source-backed variants "
        "and do not add unsupported example sentences."
    )

    assert detect_query_type(query) == "lookup"


def test_broad_guam_overview_uses_cultural_evidence_role() -> None:
    assert detect_query_type("Tell me everything about Guam") == "cultural"


def test_language_overview_remains_educational() -> None:
    assert detect_query_type("Tell me about the Chamorro language") == "educational"


def test_explicit_lookup_wins_over_broad_guam_phrase_in_mixed_prompt() -> None:
    query = "Tell me everything about Guam and how do you say water in Chamorro?"

    assert detect_query_type(query) == "lookup"


def test_historical_meaning_question_stays_historical() -> None:
    assert detect_query_type("What did this word mean in 1865?") == "historical"


def test_cultural_meaning_question_stays_cultural() -> None:
    query = "What does this tradition mean to Chamorro culture?"

    assert detect_query_type(query) == "cultural"


def test_unqualified_definition_question_remains_lookup() -> None:
    assert detect_query_type("What does hånom mean?") == "lookup"


def test_english_lookup_clips_large_dictionary_pages_around_evidence() -> None:
    content = "\n".join(
        ["unrelated dictionary row"] * 200
        + ["| water | hånum | week | simåna |"]
        + ["more unrelated dictionary rows"] * 200
    )

    excerpt = _clip_english_lookup_evidence(content, "water", max_chars=500)

    assert "| water | hånum |" in excerpt
    assert len(excerpt) <= 500
