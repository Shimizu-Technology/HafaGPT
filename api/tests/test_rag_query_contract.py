from src.rag.chamorro_rag import (
    ChamorroRAG,
    _chamorro_keyword_query_params,
    _clip_english_lookup_evidence,
    _extract_english_lookup_candidate,
    _english_keyword_query_params,
    detect_query_type,
    extract_target_word,
)
from src.rag.source_policy import annotate_metadata
from src.rag.translation_policy import (
    classify_translation_request,
    extract_translation_payload,
    translation_prompt_guidance,
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


def test_school_chat_wrapper_is_a_passage_not_the_word_this() -> None:
    query = (
        "What does this mean? It’s from my daughter’s class chat for school\n\n"
        "Someone sent it in there (a parent probably)\n\n"
        "Manana si Yu’os! Dispensa lao ti para u fåtto pågo si Fåyi gi eskuela "
        "sa guaha ‘appointment’."
    )

    assert classify_translation_request(query) == "passage_to_english"
    assert detect_query_type(query) == "educational"
    assert extract_target_word(query) == ""
    assert extract_translation_payload(query).startswith("Manana si Yu’os!")


def test_trailing_context_does_not_replace_middle_chamorro_passage() -> None:
    query = (
        "What does this mean?\n\n"
        "Dispensa lao ti para u fåtto pågo si Fåyi gi eskuela.\n\n"
        "This is from my daughter's class, and a parent probably sent it."
    )

    assert classify_translation_request(query) == "passage_to_english"
    assert extract_translation_payload(query).startswith("Dispensa lao")


def test_trailing_context_does_not_replace_middle_english_passage() -> None:
    query = (
        "Translate this to Chamorro:\n\n"
        "Good morning, Stassie is sick and will not be at school today.\n\n"
        "For context, this is for my daughter's teacher."
    )

    assert classify_translation_request(query) == "passage_to_chamorro"
    assert extract_translation_payload(query).startswith("Good morning")


def test_trailing_translation_instruction_is_not_embedded_with_english_passage() -> None:
    query = (
        "Translate this to Chamorro:\n\n"
        "Good morning, Stassie is sick and will not be at school today.\n\n"
        "Please make the result sound warm and natural while retaining all of the "
        "important details in a way that another family can understand clearly."
    )

    assert classify_translation_request(query) == "passage_to_chamorro"
    payload = extract_translation_payload(query)
    assert payload.startswith("Good morning")
    assert "Please make the result" not in payload


def test_leading_translation_instruction_is_not_embedded_with_english_passage() -> None:
    query = (
        "Translate this to Chamorro:\n\n"
        "Please keep the wording gentle because the family is worried.\n\n"
        "Good morning, Stassie is sick and will not be at school today."
    )

    payload = extract_translation_payload(query)
    assert classify_translation_request(query) == "passage_to_chamorro"
    assert "Please keep the wording gentle" not in payload
    assert "Good morning, Stassie is sick" in payload


def test_unlabeled_leading_note_is_not_combined_with_english_passage() -> None:
    query = (
        "Translate this to Chamorro:\n\n"
        "Our family is worried about her.\n\n"
        "Good morning, Stassie is sick and will not be at school today."
    )

    payload = extract_translation_payload(query)
    assert "Our family is worried" not in payload
    assert "Good morning, Stassie is sick" in payload


def test_unlabeled_trailing_note_is_not_combined_with_english_passage() -> None:
    query = (
        "Translate this to Chamorro:\n\n"
        "Good morning, Stassie will not be at school today.\n\n"
        "Our family has been worried about her."
    )

    payload = extract_translation_payload(query)
    assert payload == "Good morning, Stassie will not be at school today."


def test_multiword_english_request_uses_passage_translation_policy() -> None:
    query = (
        "How do I say - good morning, Stassie is sick so she will not be at "
        "school today - in Chamorro?"
    )

    assert classify_translation_request(query) == "passage_to_chamorro"
    assert detect_query_type(query) == "educational"
    guidance = translation_prompt_guidance(query, has_references=False)
    assert "complete translation" in guidance
    assert "need to contain every" in guidance
    assert "No governed reference was retrieved" in guidance


def test_quoted_multiword_phrase_excludes_the_requested_language() -> None:
    query = "Translate ‘I love you’ to Chamorro"

    assert classify_translation_request(query) == "passage_to_chamorro"
    assert extract_translation_payload(query) == "I love you"


def test_single_word_lookup_keeps_strict_dictionary_lane() -> None:
    query = "How do you say water in Chamorro?"

    assert classify_translation_request(query) == "single_word_lookup"
    assert detect_query_type(query) == "lookup"
    assert extract_target_word(query) == "water"
    assert translation_prompt_guidance(query, has_references=False) == ""


def test_passage_reference_context_ends_with_non_refusal_instruction() -> None:
    rag = ChamorroRAG.__new__(ChamorroRAG)
    rag.search = lambda query, k, card_type: [
        (
            "fåtto: come, arrive",
            {
                "source": "Local Revised Chamorro Dictionary snapshot",
                "source_id": "local_revised_dictionary_snapshot",
                "content_role": "modern_dictionary",
                "source_region": "guam",
                "page": 1,
            },
        )
    ]

    context, _ = rag.create_context(
        "What does this mean?\n\nDispensa lao ti para u fåtto pågo.",
        k=6,
    )

    assert "do not refuse the complete translation" in context
    assert "If the evidence does not answer the question" not in context


def test_english_lookup_clips_large_dictionary_pages_around_evidence() -> None:
    content = "\n".join(
        ["unrelated dictionary row"] * 200
        + ["| water | hånum | week | simåna |"]
        + ["more unrelated dictionary rows"] * 200
    )

    excerpt = _clip_english_lookup_evidence(content, "water", max_chars=500)

    assert "| water | hånum |" in excerpt
    assert len(excerpt) <= 500


def test_rag_context_returns_structured_public_citation_contract() -> None:
    rag = object.__new__(ChamorroRAG)
    rag.search = lambda _query, k=3, card_type=None: [
        (
            "hånom: water; liquid",
            annotate_metadata(
                {
                    "source": "/documents/Revised-Chamorro-Dictionary.pdf",
                    "page": 42,
                }
            ),
        )
    ]

    context, sources = rag.create_context("What does hånom mean?")

    assert "Local Revised Chamorro Dictionary snapshot" in context
    assert sources[0]["source_id"] == "local_revised_dictionary_snapshot"
    assert sources[0]["page"] == 42
    assert sources[0]["locator"] == "Page 42"
    assert sources[0]["url"] is None
    assert sources[0]["evidence_kind"] == "legacy_retrieval"
