import pytest

from api.learning_concepts import (
    CURATED_DECK_CARD_COUNTS,
    curated_concept_id,
    curated_concept_ids,
    question_concept_id,
    validate_curated_concept_manifest,
    validate_curated_concept_ids,
    validate_question_concept,
)


def test_python_identity_matches_the_established_frontend_fingerprint():
    assert curated_concept_id("greetings", 0) == "v1:curated:1psmtc9"
    assert curated_concept_id(" Greetings ", 0) == "v1:curated:1psmtc9"
    assert curated_concept_id("DAILY\t  LIFE", 3) == "v1:curated:bd2m4z"
    assert len(curated_concept_ids("greetings")) == CURATED_DECK_CARD_COUNTS["greetings"]


def test_question_relationships_resolve_to_exact_curated_concepts():
    assert question_concept_id("greet-1") == curated_concept_id("greetings", 0)
    assert question_concept_id("fam-8") == curated_concept_id("family", 13)
    assert question_concept_id("dictionary-generated") is None


def test_curated_concepts_are_deduplicated_and_category_scoped():
    first = curated_concept_id("greetings", 0)
    assert validate_curated_concept_ids("greetings", [first, first]) == (first,)

    with pytest.raises(ValueError, match="does not belong"):
        validate_curated_concept_ids(
            "greetings",
            [curated_concept_id("family", 0)],
        )


def test_question_relationship_rejects_invented_and_cross_topic_concepts():
    validate_question_concept(
        question_id="greet-1",
        concept_id=curated_concept_id("greetings", 0),
        expected_category_id="greetings",
    )

    with pytest.raises(ValueError, match="does not match"):
        validate_question_concept(
            question_id="greet-1",
            concept_id=curated_concept_id("greetings", 1),
            expected_category_id="greetings",
        )

    with pytest.raises(ValueError, match="does not belong"):
        validate_question_concept(
            question_id="greet-1",
            concept_id=curated_concept_id("greetings", 0),
            expected_category_id="family",
        )


def test_manifest_integrity_rejects_missing_decks_and_invalid_card_indexes():
    with pytest.raises(ValueError, match="missing from the curated manifest"):
        validate_curated_concept_manifest({
            "version": 1,
            "deck_card_counts": {},
            "question_concepts": {},
        })

    deck_counts = dict(CURATED_DECK_CARD_COUNTS)
    with pytest.raises(ValueError, match="out of range"):
        validate_curated_concept_manifest({
            "version": 1,
            "deck_card_counts": deck_counts,
            "question_concepts": {"greet-1": ["greetings", deck_counts["greetings"]]},
        })

    with pytest.raises(ValueError, match="out of range"):
        validate_curated_concept_manifest({
            "version": 1,
            "deck_card_counts": deck_counts,
            "question_concepts": {"greet-1": ["greetings", -1]},
        })


def test_manifest_integrity_rejects_concept_identity_collisions(monkeypatch):
    monkeypatch.setattr("api.learning_concepts.curated_concept_id", lambda *_args: "same")
    deck_counts = dict(CURATED_DECK_CARD_COUNTS)

    with pytest.raises(ValueError, match="identity collision"):
        validate_curated_concept_manifest({
            "version": 1,
            "deck_card_counts": deck_counts,
            "question_concepts": {},
        })
