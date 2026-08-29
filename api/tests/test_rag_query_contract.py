import re
from types import SimpleNamespace

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
    extract_translation_retrieval_payload,
    extract_short_lexical_target,
    translation_prompt_guidance,
)


def test_chamorro_keyword_collection_parameter_follows_ranking_patterns() -> None:
    params = _chamorro_keyword_query_params("hanom", "collection-v1", 3)

    assert params[3] == "collection-v1"
    assert params[-1] == 6


def test_english_keyword_collection_parameter_follows_seven_ranking_patterns() -> None:
    params = _english_keyword_query_params("water", "collection-v1", 3)

    assert params[7] == "collection-v1"
    assert params[-1] == 9


def test_english_lookup_ranks_exact_meaning_before_qualified_sense() -> None:
    params = _english_keyword_query_params("tree", "collection-v1", 3)

    assert re.search(params[0], "meaning | noun. tree.\netymology | unknown", re.IGNORECASE)
    assert not re.search(params[0], "meaning | verb. tree--bent", re.IGNORECASE)
    assert re.search(params[5], "meaning | verb. tree--bent", re.IGNORECASE)


def test_english_lookup_ranks_multi_sense_headword_before_compound() -> None:
    params = _english_keyword_query_params("water", "collection-v1", 3)

    assert re.search(params[0], "meaning | noun. water; liquid.", re.IGNORECASE)
    assert not re.search(params[0], "meaning | noun. water buffalo.", re.IGNORECASE)


def test_english_lookup_does_not_treat_compound_as_exact_alternative() -> None:
    params = _english_keyword_query_params("banana", "collection-v1", 3)

    assert re.search(params[2], "meaning | Banana (ripe).", re.IGNORECASE)
    assert not re.search(params[3], "meaning | fruit; banana bunch.", re.IGNORECASE)


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


def test_how_would_i_say_single_word_is_a_lookup() -> None:
    query = "How would I say blue?"

    assert classify_translation_request(query) == "single_word_lookup"
    assert detect_query_type(query) == "lookup"
    assert extract_target_word(query) == "blue"


def test_target_extraction_handles_chamoru_suffix_and_colon_separator() -> None:
    for query in (
        "How would I say blue in Chamoru?",
        "How would I say: blue?",
    ):
        assert classify_translation_request(query) == "single_word_lookup"
        assert extract_target_word(query) == "blue"


def test_broad_guam_overview_uses_cultural_evidence_role() -> None:
    assert detect_query_type("Tell me everything about Guam") == "cultural"


def test_language_overview_remains_educational() -> None:
    assert detect_query_type("Tell me about the Chamorro language") == "educational"


def test_how_does_grammar_work_question_is_educational() -> None:
    assert detect_query_type("How does possession work in Chamorro?") == "educational"


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


def test_unlabeled_leading_note_disables_ambiguous_retrieval() -> None:
    query = (
        "Translate this to Chamorro:\n\n"
        "Our family is worried about her.\n\n"
        "Good morning, Stassie is sick and will not be at school today."
    )

    assert "Our family is worried" in extract_translation_payload(query)
    assert "Good morning, Stassie is sick" in extract_translation_payload(query)
    assert extract_translation_retrieval_payload(query) == ""


def test_unlabeled_trailing_note_disables_ambiguous_retrieval() -> None:
    query = (
        "Translate this to Chamorro:\n\n"
        "Good morning, Stassie will not be at school today.\n\n"
        "Our family has been worried about her."
    )

    assert extract_translation_retrieval_payload(query) == ""


def test_multiline_source_passage_is_one_retrieval_block() -> None:
    query = (
        "Translate this to Chamorro:\n\n"
        "Good morning, Stassie is sick.\n"
        "She will not be at school today.\n"
        "Thank you for understanding."
    )

    assert extract_translation_retrieval_payload(query) == (
        "Good morning, Stassie is sick.\n"
        "She will not be at school today.\n"
        "Thank you for understanding."
    )


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


def test_short_phrase_gets_an_exact_dictionary_lookup_lane() -> None:
    query = 'How do you say "banana tree" in Chamorro?'

    assert classify_translation_request(query) == "passage_to_chamorro"
    assert extract_short_lexical_target(query) == "banana tree"


def test_short_phrase_lookup_strips_period_and_direction() -> None:
    query = "How do you say good morning in Chamorro."

    assert extract_short_lexical_target(query) == "good morning"


def test_short_chamorro_phrase_gets_exact_english_lookup_lane() -> None:
    query = "What does håfa adai mean?"

    assert classify_translation_request(query) == "passage_to_english"
    assert extract_short_lexical_target(query) == "håfa adai"


def test_short_english_lookup_strips_period_and_direction() -> None:
    query = "Translate håfa adai to English."

    assert classify_translation_request(query) == "passage_to_english"
    assert extract_short_lexical_target(query) == "håfa adai"


def test_how_do_you_say_honors_explicit_english_direction() -> None:
    query = "How do you say håfa adai in English?"

    assert classify_translation_request(query) == "passage_to_english"
    assert extract_short_lexical_target(query) == "håfa adai"


def test_short_english_lookup_removes_quotes_after_direction() -> None:
    query = "Translate “håfa adai” to English."

    assert classify_translation_request(query) == "passage_to_english"
    assert extract_short_lexical_target(query) == "håfa adai"


def test_trailing_destination_wins_over_language_words_inside_payload() -> None:
    query = "Translate “in English” to Chamorro"

    assert classify_translation_request(query) == "passage_to_chamorro"
    assert extract_short_lexical_target(query) == "in english"


def test_quoted_translation_instruction_does_not_override_outer_request() -> None:
    query = "How do you say “Translate this sentence to English”?"

    assert classify_translation_request(query) == "passage_to_chamorro"


def test_guillemet_target_reaches_post_suffix_wrapper_cleanup() -> None:
    query = "Translate «håfa adai» to English."

    assert extract_translation_payload(query) == "«håfa adai» to English."
    assert extract_short_lexical_target(query) == "håfa adai"


def test_normalized_short_target_reaches_exact_dictionary_lookup() -> None:
    rag = object.__new__(ChamorroRAG)
    calls: list[tuple[str, int]] = []

    def keyword_search(target: str, k: int):
        calls.append((target, k))
        return [
            SimpleNamespace(
                page_content="håfa adai: hello",
                metadata={"source": "Local Revised Chamorro Dictionary snapshot"},
            )
        ]

    rag._keyword_search_dictionaries = keyword_search

    result = rag._search_impl("Translate «håfa adai» to English.", k=3)

    assert calls == [("håfa adai", 3)]
    assert result[0][0] == "håfa adai: hello"


def test_word_for_parser_keeps_multiword_target() -> None:
    assert extract_target_word("What is the Chamorro word for banana tree?") == "banana tree"


def test_sentence_does_not_enter_short_dictionary_lookup_lane() -> None:
    query = "How do you say I am going to the store in Chamorro?"

    assert extract_short_lexical_target(query) == ""


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
