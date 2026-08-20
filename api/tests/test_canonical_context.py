import pytest

from api.canonical_context import get_canonical_tutor_context


def test_exact_english_phrases_prepend_governed_curriculum_context():
    context, sources = get_canonical_tutor_context(
        'How do I say "Good morning, my family" in Chamorro?'
    )

    assert "Recommended teaching term: Buenas dias" in context
    assert "Recommended teaching term: Familia" in context
    assert "Manana si Yu'os" in context
    assert "not the primary beginner term" in context
    assert "exact scope of support" in context
    assert sources[0] == ("HåfaGPT canonical vocabulary", None)
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
    assert sources[0] == ("HåfaGPT canonical vocabulary", None)
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
    assert ("Chamoru.info dictionary", None) in sources
    assert ("Topping, Ogo, and Dungca dictionary", None) in sources


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
    assert ("Chamoru.info dictionary", None) in sources
    assert ("Topping, Ogo, and Dungca dictionary", None) in sources


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
