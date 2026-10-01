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


def test_exact_english_gloss_lookup_prefers_ripe_banana_headword() -> None:
    context, sources = get_canonical_tutor_context(
        'How do you say "banana" in Chamorro?'
    )

    assert "Exact English dictionary gloss: banana" in context
    assert "Chamorro headword: aga'" in context
    assert "Definition: Banana (ripe)." in context
    assert "Chamorro headword: chotdan" not in context
    assert "Chamorro headword: disdisi" not in context
    assert ("Chamoru.info dictionary", None) in sources
    assert ("Topping, Ogo, and Dungca dictionary", None) in sources


def test_how_would_lookup_gets_canonical_blue_and_exact_dictionary_evidence() -> None:
    context, sources = get_canonical_tutor_context("How would I say blue?")

    assert "[Canonical colors.blue]" in context
    assert "Recommended teaching term: Asut" in context
    assert "Exact English dictionary gloss: blue" in context
    assert "Chamorro headword: asút" in context
    assert "Chamorro headword: asut" in context
    assert sources[0] == ("HåfaGPT canonical vocabulary", None)


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


def test_exact_passage_spelling_does_not_hide_conflicting_governed_senses() -> None:
    context, sources = get_canonical_tutor_context(
        "Translate this passage into English:\n\nÅnglo'\nKåmpo"
    )
    assert "Exact passage dictionary evidence: ånglo'" in context
    assert "Sterile; barren" in context
    assert "Possible OCR/spelling-near dictionary evidence for ånglo': ånglu'" in context
    assert "dry, dried up" in context
    assert "Exact passage dictionary evidence: kåmpo" in context
    assert "Definition: Camp." in context
    assert "Possible OCR/spelling-near dictionary evidence for kåmpo: kåmpu" in context
    assert "space, room, area" in context
    assert "not synonyms" in context
    assert "flag unresolved conflicts" in context
    assert ("Revised and updated Chamorro dictionary", None) in sources


def test_passage_retains_each_governed_dictionary_definition_for_headword() -> None:
    from api.canonical_context import _passage_dictionary_matches

    matches = _passage_dictionary_matches("Translate this passage:\n\nGuagua' yan åcho'")
    basket_matches = [match for match in matches if match[2].casefold() == "guagua'"]
    assert {match[1] for match in basket_matches} == {
        "Chamoru.info dictionary", "Topping, Ogo, and Dungca dictionary",
        "Revised and updated Chamorro dictionary",
    }
    assert all(not match[4] for match in basket_matches)
    assert any(match[2] == "åcho'" for match in matches)


def test_apostrophe_candidates_are_narrow_and_do_not_rewrite_source() -> None:
    context, _ = get_canonical_tutor_context("Translate this passage:\n\nGuagua yan åcho'")
    assert "Possible OCR/spelling-near dictionary evidence for guagua: guagua'" in context
    assert "Exact passage dictionary evidence: guagua'" not in context
    # Two added apostrophes lead to an unrelated entry and exceed the one-edit bound.
    assert "gua'gua'" not in context
    assert "regurgitation" not in context
    assert "do not silently replace the supplied spelling" in context


def test_exact_match_does_not_open_arbitrary_one_letter_neighbours(monkeypatch) -> None:
    import api.canonical_context as module

    fake_index = {
        "stone": (("Example dictionary", "stone", "fixture definition"),),
        "stoke": (("Example dictionary", "stoke", "unrelated fixture"),),
        "stune": (("Example dictionary", "stune", "spelling candidate fixture"),),
    }
    monkeypatch.setattr(module, "_exact_dictionary_index", lambda: fake_index)
    monkeypatch.setattr(module, "_spelling_candidate_index", lambda: {"stune": ("stone", "stune")})
    monkeypatch.setattr(module, "_near_dictionary_headword_index", lambda: {("st", 5): tuple(fake_index)})
    matches = module._passage_dictionary_matches("Translate this passage:\n\nStone fixture")
    assert {match[2] for match in matches} == {"stone", "stune"}


def test_short_later_choices_receive_evidence_before_more_first_line_words(monkeypatch) -> None:
    import api.canonical_context as module

    long_terms = ["longword" + chr(ord('a') + index) for index in range(26)]
    fake_index = {word: (("Example dictionary", word, "fixture definition"),) for word in long_terms}
    fake_index.update({word: (("Example dictionary", word, "short option"),) for word in ["abc", "def", "ghi"]})
    monkeypatch.setattr(module, "_exact_dictionary_index", lambda: fake_index)
    monkeypatch.setattr(module, "_spelling_candidate_index", lambda: {})
    monkeypatch.setattr(module, "_near_dictionary_headword_index", lambda: {})
    query = "Translate this passage:\n\n" + " ".join(long_terms) + "\nabc\ndef\nghi"
    matches = module._passage_dictionary_matches(query)
    assert [match[2] for match in matches[:4]] == [long_terms[0], "abc", "def", "ghi"]
    assert len(matches) == module.MAX_PASSAGE_DICTIONARY_MATCHES


def test_distinct_definitions_from_same_normalized_headword_are_not_discarded(monkeypatch) -> None:
    import api.canonical_context as module

    fake_index = {"example": (
        ("First dictionary", "example", "first sense"),
        ("Second dictionary", "Example", "different sense"),
        ("Third dictionary", "example", "third sense"),
    )}
    monkeypatch.setattr(module, "_exact_dictionary_index", lambda: fake_index)
    monkeypatch.setattr(module, "_spelling_candidate_index", lambda: {})
    monkeypatch.setattr(module, "_near_dictionary_headword_index", lambda: {})
    matches = module._passage_dictionary_matches("Translate this passage:\n\nExample fixture")
    assert [match[3] for match in matches] == ["first sense", "different sense", "third sense"]
