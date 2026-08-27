import pytest

from api.learning_attempts import (
    build_game_learning_attempt,
    build_game_learning_attempts,
    build_retry_safe_game_learning_attempts,
    duration_bucket,
    insert_learning_attempts,
    persist_game_result,
)
from api.learning_concepts import curated_concept_id
from api.models import GameResultCreate


def test_duration_is_reduced_to_an_allowlisted_bucket():
    assert duration_bucket(None) == "unknown"
    assert duration_bucket(119) == "under_2m"
    assert duration_bucket(120) == "2_to_5m"
    assert duration_bucket(300) == "2_to_5m"
    assert duration_bucket(301) == "over_5m"


def test_attempt_contains_only_stable_learning_properties():
    assert build_game_learning_attempt(
        topic_id="greetings",
        category_id="greetings",
        source="lesson",
        game_type="memory_match",
        stars=3,
        score=400,
        time_seconds=75,
    ) == {
        "concept_id": "v1:topic:greetings",
        "activity_type": "game:memory_match",
        "success": True,
        "duration_bucket": "under_2m",
        "source": "lesson",
        "evidence_scope": "topic",
    }


def test_topic_can_use_a_distinct_allowlisted_vocabulary_category():
    assert build_game_learning_attempt(
        topic_id="body-parts",
        category_id="body",
        source="lesson",
        game_type="memory_match",
        stars=2,
        score=200,
        time_seconds=120,
    ) == {
        "concept_id": "v1:topic:body-parts",
        "activity_type": "game:memory_match",
        "success": True,
        "duration_bucket": "2_to_5m",
        "source": "lesson",
        "evidence_scope": "topic",
    }


def test_attempt_rejects_unknown_or_mismatched_context():
    with pytest.raises(ValueError, match="Unknown learning topic"):
        build_game_learning_attempt(
            topic_id="my-child-name",
            category_id="my-child-name",
            source="lesson",
            game_type="memory_match",
            stars=3,
            score=100,
            time_seconds=30,
        )

    with pytest.raises(ValueError, match="match the played category"):
        build_game_learning_attempt(
            topic_id="greetings",
            category_id="family",
            source="lesson",
            game_type="memory_match",
            stars=3,
            score=100,
            time_seconds=30,
        )

    with pytest.raises(ValueError, match="Unknown learning activity"):
        build_game_learning_attempt(
            topic_id="greetings",
            category_id="greetings",
            source="lesson",
            game_type="my-child-name",
            stars=3,
            score=100,
            time_seconds=30,
        )


def test_exact_game_attempts_preserve_broad_evidence_and_deduplicate_concepts():
    first = curated_concept_id("greetings", 0)
    second = curated_concept_id("greetings", 1)

    attempts = build_game_learning_attempts(
        topic_id="greetings",
        category_id="greetings",
        source="topic",
        game_type="memory_match",
        stars=3,
        score=400,
        time_seconds=75,
        concept_ids=(first, second, first),
    )

    assert [attempt["concept_id"] for attempt in attempts] == [
        "v1:topic:greetings",
        first,
        second,
    ]
    assert [attempt["evidence_scope"] for attempt in attempts] == [
        "topic",
        "concept",
        "concept",
    ]
    assert all(attempt["source"] == "topic" for attempt in attempts)


def test_exact_game_attempts_reject_a_concept_from_another_category():
    with pytest.raises(ValueError, match="does not belong"):
        build_game_learning_attempts(
            topic_id="greetings",
            category_id="greetings",
            source="lesson",
            game_type="memory_match",
            stars=3,
            score=400,
            time_seconds=75,
            concept_ids=(curated_concept_id("family", 0),),
        )


def test_valid_legacy_game_context_without_retry_key_saves_no_learning_rows():
    request = GameResultCreate(
        game_type="memory_match",
        mode="beginner",
        category_id="greetings",
        score=400,
        stars=3,
        client_attempt_id=None,
        learning_context={
            "topic_id": "greetings",
            "source": "topic",
            "concept_ids": [curated_concept_id("greetings", 0)],
        },
    )

    assert build_retry_safe_game_learning_attempts(request) == ()

    request.learning_context.topic_id = "family"
    with pytest.raises(ValueError, match="match the played category"):
        build_retry_safe_game_learning_attempts(request)


def test_attempt_batch_uses_one_idempotent_insert():
    class Cursor:
        def __init__(self):
            self.executions = []

        def execute(self, query, params):
            self.executions.append((query, params))

    cursor = Cursor()
    attempts = build_game_learning_attempts(
        topic_id="greetings",
        category_id="greetings",
        source="lesson",
        game_type="word_scramble",
        stars=2,
        score=200,
        time_seconds=150,
        concept_ids=(curated_concept_id("greetings", 0),),
    )

    insert_learning_attempts(
        cursor,
        user_id="user_123",
        game_result_id="result_123",
        attempts=attempts,
    )

    assert len(cursor.executions) == 1
    assert "INSERT INTO learning_attempts" in cursor.executions[0][0]
    assert all(
        "ON CONFLICT (game_result_id, concept_id) DO NOTHING" in query
        for query, _params in cursor.executions
    )
    params = cursor.executions[0][1]
    assert params[0:2] == ("user_123", "result_123")
    assert params[2] == [attempt["concept_id"] for attempt in attempts]
    assert params[3] == [attempt["activity_type"] for attempt in attempts]
    assert params[4] == [attempt["success"] for attempt in attempts]
    assert params[5] == [attempt["duration_bucket"] for attempt in attempts]
    assert params[6] == [attempt["source"] for attempt in attempts]
    assert params[7] == [attempt["evidence_scope"] for attempt in attempts]
    assert params[7] == ["topic", "concept"]


def test_contextual_game_retry_reuses_the_stored_result():
    stored = (
        "result_123",
        "memory_match",
        "beginner",
        "greetings",
        "Greetings & Basics",
        "easy",
        400,
        8,
        4,
        75,
        3,
        "created-at",
    )

    class Cursor:
        def __init__(self):
            self.fetches = [None, stored]
            self.executions = []

        def execute(self, query, params):
            self.executions.append((query, params))

        def fetchone(self):
            return self.fetches.pop(0)

    cursor = Cursor()
    request = GameResultCreate(
        game_type="memory_match",
        mode="beginner",
        category_id="greetings",
        category_title="Greetings & Basics",
        difficulty="easy",
        score=400,
        moves=8,
        pairs=4,
        time_seconds=75,
        stars=3,
        client_attempt_id="018f6a6e-9c3d-7b2a-a1c4-8e9f12345678",
    )

    result, inserted = persist_game_result(cursor, user_id="user_123", request=request)

    assert result == stored
    assert inserted is False
    assert "ON CONFLICT (user_id, client_attempt_id) DO NOTHING" in cursor.executions[0][0]
    assert "FROM game_results" in cursor.executions[1][0]
