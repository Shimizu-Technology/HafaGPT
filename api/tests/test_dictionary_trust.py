from api.dictionary_service import DictionaryService, _canonical_trust


def test_category_matching_rejects_known_false_positives():
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
    quiz = DictionaryService().generate_quiz_questions(
        "greetings",
        count=8,
        question_types=["multiple_choice"],
    )

    assert quiz["questions"]
    for question in quiz["questions"]:
        assert len(question["options"]) == len(set(question["options"])) == 4
        assert all("," not in option and ";" not in option for option in question["options"])
