import pytest

from api.canonical_context import get_canonical_tutor_context


def _source_names(sources: list[object]) -> set[str]:
    return {
        str(source.get("name")) if isinstance(source, dict) else str(source[0])
        for source in sources
    }


def test_exact_english_phrases_prepend_governed_curriculum_context():
    context, sources = get_canonical_tutor_context(
        'How do I say "Good morning, my family" in Chamorro?'
    )

    assert "Recommended teaching term: Buenas dias" in context
    assert "Recommended teaching term: Familia" in context
    assert "Manana si Yu'os" in context
    assert "not the primary beginner term" in context
    assert "exact scope of support" in context
    assert sources[0]["name"] == "HåfaGPT canonical vocabulary"
    assert sources[0]["support_scope"] == "partial"
    assert [source["source_id"] for source in sources[1:3]] == [
        "kumision_learning_tools",
        "visit_guam_greetings",
    ]


def test_recorded_variant_and_cited_spelling_match_inside_a_passage():
    context, sources = get_canonical_tutor_context(
        "What does this mean?\n\nManana si Yu’os! Dispensa lao ti para u fåtto pågo."
    )

    assert "English: Good morning" in context
    assert "Manana si Yu'os" in context
    assert "Kumisión i Fino' CHamoru cultural dictionary" in context
    assert "Manana si Yu'os — Good morning" in context
    assert sources[0]["name"] == "HåfaGPT canonical vocabulary"
    assert sources[0]["support_scope"] == "partial"
    assert [source["source_id"] for source in sources[1:3]] == [
        "kumision_learning_tools",
        "visit_guam_greetings",
    ]


@pytest.mark.parametrize(
    "school_spelling",
    (
        "Manana si Yuos",
        "Mañana si Yu’os",
        "Manana si Yu os",
    ),
)
def test_school_greeting_matches_without_phone_diacritics_or_clean_ocr(
    school_spelling: str,
):
    context, _sources = get_canonical_tutor_context(
        f"What does this school greeting mean? {school_spelling}, familia."
    )

    assert "English: Good morning" in context
    assert "Recommended teaching term: Buenas dias" in context
    assert "Manana si Yu'os" in context


def test_school_put_fabot_variant_preserves_source_and_teaching_form():
    context, _sources = get_canonical_tutor_context(
        "School announcement: Put fabot review the handbook."
    )

    assert "Recommended teaching term: Pot fabot" in context
    assert "Put fabot" in context
    assert "not the primary beginner term" in context
    assert "its example glosses Put fabot as Please" in context


def test_unrelated_request_does_not_add_canonical_context():
    assert get_canonical_tutor_context("Tell me about tomorrow's weather") == ("", [])


def test_exact_dictionary_lookup_bypasses_semantic_retrieval_for_curly_quotes():
    context, sources = get_canonical_tutor_context('What does “taigue” mean?')

    assert "Exact dictionary headword: taigue" in context
    assert "Absent; not present; inattentive; disappear." in context
    assert "absent, not present, inattentive, disappear" in context
    assert "Chamoru.info dictionary" in _source_names(sources)
    assert "Chamorro-English Dictionary by Topping, Ogo, and Dungca" in _source_names(sources)


def test_exact_dictionary_lookup_keeps_para_and_para_with_ring_distinct():
    para_context, _para_sources = get_canonical_tutor_context(
        "What does para mean?"
    )
    para_with_ring_context, _ring_sources = get_canonical_tutor_context(
        "What does påra mean?"
    )

    assert "Exact dictionary headword: para" in para_context
    assert "Exact dictionary headword: påra" not in para_context
    assert "Exact dictionary headword: påra" in para_with_ring_context


def test_exact_english_gloss_lookup_prefers_ripe_banana_headword() -> None:
    context, sources = get_canonical_tutor_context(
        'How do you say "banana" in Chamorro?'
    )

    assert "Exact English dictionary gloss: banana" in context
    assert "Chamorro headword: aga'" in context
    assert "Definition: Banana (ripe)." in context
    assert "Chamorro headword: chotdan" not in context
    assert "Chamorro headword: disdisi" not in context
    assert "Chamoru.info dictionary" in _source_names(sources)
    assert "Chamorro-English Dictionary by Topping, Ogo, and Dungca" in _source_names(sources)


def test_how_would_lookup_gets_canonical_blue_and_exact_dictionary_evidence() -> None:
    context, sources = get_canonical_tutor_context("How would I say blue?")

    assert "[Canonical colors.blue]" in context
    assert "Recommended teaching term: Asut" in context
    assert "Exact English dictionary gloss: blue" in context
    assert "Chamorro headword: asút" in context
    assert "Chamorro headword: asut" in context
    assert sources[0]["name"] == "HåfaGPT canonical vocabulary"
    assert sources[0]["support_scope"] == "answer"


def test_common_english_lookup_forms_reach_exact_dictionary_evidence() -> None:
    for query, gloss, expected_headword in (
        ("What is blue in Chamoru?", "blue", "asút"),
        ("What is the Chamorro word for banana?", "banana", "aga'"),
    ):
        context, _sources = get_canonical_tutor_context(query)
        assert f"Exact English dictionary gloss: {gloss}" in context
        assert f"Chamorro headword: {expected_headword}" in context


def test_passage_gets_exact_dictionary_evidence_for_multiple_words() -> None:
    context, sources = get_canonical_tutor_context(
        "What does this say?\n\n"
        "Kao modan isla pat kulot kåhet na polo på'go?\n"
        "Trabiha. Kada uttimo na Betnes."
    )

    assert "Exact passage dictionary evidence: kulot kåhet" in context
    assert "Exact passage dictionary evidence: trabiha" in context
    assert "Definition: yet, still, not yet" in context
    assert "Exact passage dictionary evidence: Betnes" in context
    assert "Exact passage dictionary evidence: uttimo" in context
    assert "Chamoru.info dictionary" in _source_names(sources)
    assert "Chamorro-English Dictionary by Topping, Ogo, and Dungca" in _source_names(sources)
    assert all(source.get("support_scope") == "partial" for source in sources)


def test_passage_uses_one_edit_dictionary_clues_without_rewriting_ocr() -> None:
    context, _sources = get_canonical_tutor_context(
        "What does this say?\n\nTrabina. Kada uttemo na Betnes. Modan isla."
    )

    assert "Possible OCR/spelling-near dictionary evidence for trabina: trabiha" in context
    assert "Possible OCR/spelling-near dictionary evidence for uttemo: uttimo" in context
    assert "Possible OCR/spelling-near dictionary evidence for modan: moda" in context
    assert "do not silently replace the supplied spelling" in context


def test_non_translation_prose_does_not_trigger_passage_dictionary_scan() -> None:
    context, _sources = get_canonical_tutor_context(
        "Tell me about fashion and Friday in Guam."
    )

    assert "passage dictionary evidence" not in context


def test_phone_spaced_headword_gets_dictionary_candidates_without_guessing() -> None:
    context, sources = get_canonical_tutor_context("What does ma a nao mean?")

    assert "Phone/OCR-normalized headword candidate for ma a nao: ma'å'ñao" in context
    assert "Afraid; scared; frightened" in context
    assert "surname" not in context
    assert all(source.get("support_scope") == "candidate" for source in sources)


def test_english_sentence_retrieves_inflected_component_glosses() -> None:
    context, sources = get_canonical_tutor_context(
        "How would I say something like - thank you for the reminder, "
        "I forgot about class"
    )

    assert "English passage concept: reminder -> remind" in context
    assert "Chamorro headword: na'hasso" in context
    assert "English passage concept: forgot -> forget" in context
    assert "Chamorro headword: maleffa" in context
    assert "English passage concept: class -> class" in context
    assert "Chamorro headword: klas" in context
    assert "ma'å'ñao" not in context
    assert all(source.get("support_scope") == "partial" for source in sources)


def test_unmarked_sina_in_passage_does_not_resolve_to_a_person_name() -> None:
    context, _sources = get_canonical_tutor_context(
        "What does all of this say?\n\nBuenas. Kao sina hu faisen kuestion?"
    )

    assert "nickname for" not in context
    assert "Possible OCR/spelling-near dictionary evidence for sina: siña" in context
    assert "Can; be able; may" in context
