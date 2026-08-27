"""Validation and idempotent persistence for connected quiz evidence."""

from typing import Any

from .learning_concepts import (
    LEARNING_TOPIC_CATEGORIES,
    LEARNING_TOPIC_QUIZ_CATEGORIES,
    lesson_assessment_id,
    validate_question_concept,
)
from .models import QuizResultCreate


QUIZ_TOPIC_IDS = {
    category_id: topic_id
    for topic_id, category_id in LEARNING_TOPIC_QUIZ_CATEGORIES.items()
}


def validate_quiz_result_request(request: QuizResultCreate) -> dict | None:
    """Verify score integrity and every client-supplied relationship."""

    answers = request.answers or []
    if answers:
        question_ids = [answer.question_id for answer in answers]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError("Quiz answers must have unique question IDs")
        if request.total != len(answers):
            raise ValueError("Quiz total must match the submitted answers")
        if request.score != sum(answer.is_correct for answer in answers):
            raise ValueError("Quiz score must match the submitted answers")

    topic_id = QUIZ_TOPIC_IDS.get(request.category_id)
    context = request.learning_context
    if context:
        expected_quiz_category = LEARNING_TOPIC_QUIZ_CATEGORIES.get(context.topic_id)
        if expected_quiz_category is None:
            raise ValueError("Unknown learning topic")
        if request.category_id != expected_quiz_category:
            raise ValueError("Learning topic must match the quiz category")
        if request.client_attempt_id is None:
            raise ValueError("Contextual quizzes require a client attempt ID")
        if context.source == "lesson":
            if context.assessment_id != lesson_assessment_id(context.topic_id):
                raise ValueError("Lesson quiz must use its authored assessment ID")
        elif context.assessment_id is not None:
            raise ValueError("Only lesson quizzes may include an assessment ID")
        topic_id = context.topic_id

    concept_category = LEARNING_TOPIC_CATEGORIES.get(topic_id or "")
    for answer in answers:
        if answer.concept_id is not None and concept_category is None:
            raise ValueError("Quiz category does not support curated concepts")
        if concept_category is not None:
            validate_question_concept(
                question_id=answer.question_id,
                concept_id=answer.concept_id,
                expected_category_id=concept_category,
            )

    if context is None:
        return None
    return {
        "topic_id": context.topic_id,
        "source": context.source,
        "assessment_id": context.assessment_id,
    }


def persist_quiz_result(
    cursor: Any,
    *,
    user_id: str,
    request: QuizResultCreate,
    percentage: float,
    context: dict | None,
) -> tuple:
    """Insert once per client attempt and return the authoritative stored row."""

    context = context or {}
    cursor.execute(
        """
        INSERT INTO quiz_results (
            user_id, category_id, category_title, score, total, percentage,
            time_spent_seconds, client_attempt_id, learning_topic_id,
            learning_source, assessment_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, client_attempt_id) DO NOTHING
        RETURNING id, category_id, category_title, score, total, percentage,
                  time_spent_seconds, created_at, learning_topic_id,
                  learning_source, assessment_id
        """,
        (
            user_id,
            request.category_id,
            request.category_title,
            request.score,
            request.total,
            percentage,
            request.time_spent_seconds,
            request.client_attempt_id,
            context.get("topic_id"),
            context.get("source"),
            context.get("assessment_id"),
        ),
    )
    result_row = cursor.fetchone()
    inserted = result_row is not None

    if not inserted:
        if request.client_attempt_id is None:
            raise RuntimeError("Quiz result insert returned no row")
        cursor.execute(
            """
            SELECT id, category_id, category_title, score, total, percentage,
                   time_spent_seconds, created_at, learning_topic_id,
                   learning_source, assessment_id
            FROM quiz_results
            WHERE user_id = %s AND client_attempt_id = %s
            """,
            (user_id, request.client_attempt_id),
        )
        result_row = cursor.fetchone()
        if result_row is None:
            raise RuntimeError("Idempotent quiz result could not be loaded")

    if inserted:
        result_id = result_row[0]
        for answer in request.answers or []:
            cursor.execute(
                """
                INSERT INTO quiz_answers (
                    quiz_result_id, question_id, question_text, question_type,
                    user_answer, correct_answer, is_correct, explanation,
                    concept_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    result_id,
                    answer.question_id,
                    answer.question_text,
                    answer.question_type,
                    answer.user_answer,
                    answer.correct_answer,
                    answer.is_correct,
                    answer.explanation,
                    answer.concept_id,
                ),
            )

    return result_row
