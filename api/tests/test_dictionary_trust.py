from api.dictionary_service import DictionaryService, _canonical_trust, _word_of_day_pools


def test_category_matching_rejects_known_false_positives():
    """Avoid substring-based category matches while retaining intended terms."""

    service = DictionaryService()

    assert not service._matches_category("required", "adj.", "colors", [])
    assert not service._matches_category("morning glory", "n.", "greetings", [])
    assert not service._matches_category("fish trap", "n.", "animals", [])
    assert not service._matches_category("can opener", "n.", "phrases", [])

    assert service._matches_category("red", "adj.", "colors", [])
    assert service._matches_category("good morning", "expression", "greetings", [])
    assert service._matches_category("fish", "n.", "animals", [])
    assert service._matches_category("please", "expression", "phrases", [])


def test_source_verification_does_not_claim_independent_human_review():
    """Keep source verification distinct from independent human review."""

    trust = _canonical_trust(
        {
            "review_status": "verified",
            "confidence": "high",
            "source_citations": [{"source": "Named reference"}],
        }
    )

    assert trust["level"] == "source_backed"
    assert trust["independentlyReviewed"] is False
    assert "source-verified" in trust["notes"][1]


def test_dictionary_learning_surfaces_include_honest_trust_metadata():
    """Expose trust and audio review status throughout dictionary activities."""

    service = DictionaryService()
    category = service.get_category_words("greetings", limit=3)
    flashcards = service.get_flashcards("greetings", count=4, shuffle=False)
    quiz = service.generate_quiz_questions("greetings", count=4, question_types=["multiple_choice"])
    word_of_the_day = service.get_word_of_the_day()

    assert category["words"]
    assert all(word["trust"]["independentlyReviewed"] is False for word in category["words"])
    assert flashcards["trust"]["level"] == "source_backed"
    assert all(card["trust"] for card in flashcards["cards"])
    assert quiz["trust"]["level"] == "source_backed"
    assert all(question["trust"] for question in quiz["questions"])
    assert word_of_the_day["trust"]["level"] in {"source_backed", "developing"}
    assert "audio_review_status" in word_of_the_day


def test_dynamic_quiz_choices_are_concise_and_unique():
    """Keep generated choices readable and unique without case distinctions."""

    quiz = DictionaryService().generate_quiz_questions(
        "greetings",
        count=8,
        question_types=["multiple_choice"],
    )

    assert quiz["questions"]
    for question in quiz["questions"]:
        normalized_options = {option.casefold() for option in question["options"]}
        assert len(question["options"]) == len(normalized_options) == 4
        assert all("," not in option and ";" not in option for option in question["options"])


def test_word_of_the_day_broader_pool_keeps_developing_canonical_entries():
    """Keep review-needed source entries available on broader-rotation days."""

    preferred_word = {
        "chamorro": "Buenas dias",
        "canonical_entry": {"review_status": "verified", "confidence": "high"},
    }
    developing_word = {
        "chamorro": "Hu hånao",
        "canonical_entry": {"review_status": "needs_review", "confidence": "low"},
    }
    unmatched_word = {"chamorro": "Recorded corpus term", "canonical_entry": None}

    preferred, broader = _word_of_day_pools(
        [preferred_word, developing_word, unmatched_word]
    )

    assert preferred == [preferred_word]
    assert broader == [developing_word, unmatched_word]
