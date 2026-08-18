import pytest

from api.learning_attempts import build_game_learning_attempt, duration_bucket, insert_learning_attempt


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


def test_attempt_insert_uses_only_allowlisted_values_in_the_game_transaction():
    class Cursor:
        execution = None

        def execute(self, query, params):
            self.execution = (query, params)

    cursor = Cursor()
    insert_learning_attempt(
        cursor,
        user_id="user_123",
        game_result_id="result_123",
        attempt={
            "concept_id": "v1:topic:greetings",
            "activity_type": "game:memory_match",
            "success": True,
            "duration_bucket": "under_2m",
            "source": "lesson",
        },
    )

    assert "INSERT INTO learning_attempts" in cursor.execution[0]
    assert cursor.execution[1] == (
        "user_123",
        "v1:topic:greetings",
        "game:memory_match",
        True,
        "under_2m",
        "lesson",
        "result_123",
    )
