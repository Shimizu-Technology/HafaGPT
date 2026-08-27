from datetime import datetime, timezone
from uuid import UUID

import pytest

from api.learning_concepts import curated_concept_id
from api.models import QuizResultCreate, QuizResultDetailResponse
from api.quiz_evidence import persist_quiz_result, validate_quiz_result_request


def request_data(**overrides):
    data = {
        "category_id": "greetings",
        "category_title": "Greetings & Basics",
        "score": 1,
        "total": 1,
        "time_spent_seconds": 30,
        "client_attempt_id": "018f6a6e-9c3d-7b2a-a1c4-8e9f12345678",
        "learning_context": {
            "topic_id": "greetings",
            "source": "lesson",
            "assessment_id": "v1:lesson:greetings:embedded-quiz",
        },
        "answers": [
            {
                "question_id": "greet-1",
                "question_text": "A question",
                "question_type": "multiple_choice",
                "user_answer": "Hello / Hi",
                "correct_answer": "Hello / Hi",
                "is_correct": True,
                "concept_id": curated_concept_id("greetings", 0),
            }
        ],
    }
    data.update(overrides)
    return QuizResultCreate(**data)


def test_lesson_quiz_context_and_exact_answer_relationship_are_validated():
    request = request_data()
    assert validate_quiz_result_request(request) == {
        "topic_id": "greetings",
        "source": "lesson",
        "assessment_id": "v1:lesson:greetings:embedded-quiz",
    }

    with pytest.raises(
        ValueError,
        match="Question concept does not match the authored relationship",
    ):
        validate_quiz_result_request(
            request_data(
                answers=[
                    {
                        **request_data().answers[0].model_dump(),
                        "concept_id": curated_concept_id("greetings", 1),
                    }
                ]
            )
        )


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"score": 0}, "score must match"),
        ({"total": 2}, "total must match"),
        (
            {
                "learning_context": {
                    "topic_id": "family",
                    "source": "lesson",
                    "assessment_id": "v1:lesson:family:embedded-quiz",
                }
            },
            "match the quiz category",
        ),
        (
            {
                "learning_context": {
                    "topic_id": "greetings",
                    "source": "topic",
                    "assessment_id": "v1:lesson:greetings:embedded-quiz",
                }
            },
            "Only lesson quizzes",
        ),
    ],
)
def test_invalid_quiz_evidence_is_rejected(overrides, message):
    with pytest.raises(ValueError, match=message):
        validate_quiz_result_request(request_data(**overrides))


def test_valid_legacy_quiz_context_without_retry_key_is_accepted():
    request = request_data(client_attempt_id=None)

    assert validate_quiz_result_request(request) == {
        "topic_id": "greetings",
        "source": "lesson",
        "assessment_id": "v1:lesson:greetings:embedded-quiz",
    }


def test_score_cannot_exceed_total_without_answer_details():
    with pytest.raises(ValueError, match="cannot exceed"):
        validate_quiz_result_request(request_data(score=2, answers=None))


def test_quiz_detail_contract_retains_connected_learning_metadata():
    detail = QuizResultDetailResponse(
        id="result_123",
        category_id="greetings",
        score=1,
        total=1,
        percentage=100,
        created_at=datetime(2026, 8, 28, tzinfo=timezone.utc),
        learning_topic_id="greetings",
        learning_source="lesson",
        assessment_id="v1:lesson:greetings:embedded-quiz",
        answers=[],
    )

    assert detail.model_dump()["learning_topic_id"] == "greetings"
    assert detail.model_dump()["learning_source"] == "lesson"
    assert detail.model_dump()["assessment_id"] == (
        "v1:lesson:greetings:embedded-quiz"
    )


class Cursor:
    def __init__(self, fetches):
        self.fetches = list(fetches)
        self.executions = []

    def execute(self, query, params):
        self.executions.append((query, params))

    def fetchone(self):
        return self.fetches.pop(0)


def stored_row(result_id="result_123"):
    return (
        result_id,
        "greetings",
        "Greetings & Basics",
        1,
        1,
        100.0,
        30,
        datetime(2026, 8, 28, tzinfo=timezone.utc),
        "greetings",
        "lesson",
        "v1:lesson:greetings:embedded-quiz",
    )


def test_quiz_result_and_exact_answers_are_inserted_in_one_transaction_scope():
    cursor = Cursor([stored_row()])
    request = request_data()

    result = persist_quiz_result(
        cursor,
        user_id="user_123",
        request=request,
        percentage=100.0,
        context=validate_quiz_result_request(request),
    )

    assert result == stored_row()
    assert len(cursor.executions) == 2
    result_query, result_params = cursor.executions[0]
    answer_query, answer_params = cursor.executions[1]
    assert "ON CONFLICT (user_id, client_attempt_id) DO NOTHING" in result_query
    assert result_params[7] == UUID("018f6a6e-9c3d-7b2a-a1c4-8e9f12345678")
    assert "concept_id" in answer_query
    assert answer_params[-1] == curated_concept_id("greetings", 0)


def test_idempotent_retry_returns_the_stored_attempt_without_duplicate_answers():
    existing = stored_row("existing_result")
    cursor = Cursor([None, existing])
    request = request_data()

    result = persist_quiz_result(
        cursor,
        user_id="user_123",
        request=request,
        percentage=100.0,
        context=validate_quiz_result_request(request),
    )

    assert result == existing
    assert len(cursor.executions) == 2
    assert "FROM quiz_results" in cursor.executions[1][0]
