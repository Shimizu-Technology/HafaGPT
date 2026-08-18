from api.canonical_context import get_canonical_tutor_context


def test_exact_english_phrases_prepend_governed_curriculum_context():
    context, sources = get_canonical_tutor_context(
        'How do I say "Good morning, my family" in Chamorro?'
    )

    assert "Recommended teaching term: Buenas dias" in context
    assert "Recommended teaching term: Familia" in context
    assert "Mañana si Yu'os" in context
    assert "not the primary beginner term" in context
    assert "exact scope of support" in context
    assert sources[0] == ("HåfaGPT canonical vocabulary", None)
    assert sources[1]["source_id"] == "visit_guam_greetings"
    assert sources[1]["url"].startswith("https://www.visitguam.com/")


def test_recorded_variant_and_cited_spelling_match_inside_a_passage():
    context, sources = get_canonical_tutor_context(
        "What does this mean?\n\nManana si Yu’os! Dispensa lao ti para u fåtto pågo."
    )

    assert "English: Good morning" in context
    assert "Mañana si Yu'os" in context
    assert "Visit Guam Simple CHamoru Greetings" in context
    assert "Manana Si Yu'os — Good Morning" in context
    assert sources[0] == ("HåfaGPT canonical vocabulary", None)
    assert sources[1]["source_id"] == "visit_guam_greetings"


def test_unrelated_request_does_not_add_canonical_context():
    assert get_canonical_tutor_context("Tell me about tomorrow's weather") == ("", [])


def test_exact_dictionary_lookup_bypasses_semantic_retrieval_for_curly_quotes():
    context, sources = get_canonical_tutor_context('What does “taigue” mean?')

    assert "Exact dictionary headword: taigue" in context
    assert "Absent; not present; inattentive; disappear." in context
    assert "absent, not present, inattentive, disappear" in context
    assert ("Chamoru.info dictionary", None) in sources
    assert ("Topping, Ogo, and Dungca dictionary", None) in sources
