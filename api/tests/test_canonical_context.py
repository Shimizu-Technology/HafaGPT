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
