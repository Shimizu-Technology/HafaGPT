"""Privacy-minimized learning-attempt derivation."""

from typing import Any, Optional

from .learning_concepts import (
    LEARNING_TOPIC_CATEGORIES,
    validate_curated_concept_ids,
)

LEARNING_SOURCES = {"lesson", "today", "topic"}
LEARNING_GAME_TYPES = {
    "chamorro_wordle",
    "color_touch",
    "cultural_trivia",
    "falling_words",
    "hangman",
    "memory_match",
    "number_tap",
    "picture_pairs",
    "simon_says",
    "sound_match",
    "word_catch",
    "word_scramble",
}


def duration_bucket(seconds: Optional[int]) -> str:
    """Reduce exact activity duration to a coarse, non-sensitive bucket."""

    if seconds is None or seconds < 0:
        return "unknown"
    if seconds < 120:
        return "under_2m"
    if seconds <= 300:
        return "2_to_5m"
    return "over_5m"


def build_game_learning_attempt(
    *,
    topic_id: str,
    category_id: str,
    source: str,
    game_type: str,
    stars: Optional[int],
    score: int,
    time_seconds: Optional[int],
) -> dict:
    """Build an allowlisted attempt row without learner-entered content."""

    expected_category = LEARNING_TOPIC_CATEGORIES.get(topic_id)
    if expected_category is None:
        raise ValueError("Unknown learning topic")
    if category_id != expected_category:
        raise ValueError("Learning topic must match the played category")
    if source not in LEARNING_SOURCES:
        raise ValueError("Unknown learning source")
    if game_type not in LEARNING_GAME_TYPES:
        raise ValueError("Unknown learning activity")

    success = stars >= 2 if stars is not None else score > 0
    return {
        "concept_id": f"v1:topic:{topic_id}",
        "activity_type": f"game:{game_type}",
        "success": success,
        "duration_bucket": duration_bucket(time_seconds),
        "source": source,
        "evidence_scope": "topic",
    }


def build_game_learning_attempts(
    *,
    topic_id: str,
    category_id: str,
    source: str,
    game_type: str,
    stars: Optional[int],
    score: int,
    time_seconds: Optional[int],
    concept_ids: tuple[str, ...] = (),
) -> tuple[dict, ...]:
    """Build broad evidence plus any exact, server-validated concepts used."""

    broad_attempt = build_game_learning_attempt(
        topic_id=topic_id,
        category_id=category_id,
        source=source,
        game_type=game_type,
        stars=stars,
        score=score,
        time_seconds=time_seconds,
    )
    exact_concepts = validate_curated_concept_ids(category_id, concept_ids)
    exact_attempts = tuple(
        {
            **broad_attempt,
            "concept_id": concept_id,
            "evidence_scope": "concept",
        }
        for concept_id in exact_concepts
    )
    return (broad_attempt, *exact_attempts)


def build_retry_safe_game_learning_attempts(request: Any) -> tuple[dict, ...]:
    """Validate optional context and emit evidence only with a retry key."""

    context = request.learning_context
    if context is None:
        return ()
    attempts = build_game_learning_attempts(
        topic_id=context.topic_id,
        category_id=request.category_id,
        source=context.source,
        game_type=request.game_type,
        stars=request.stars,
        score=request.score,
        time_seconds=request.time_seconds,
        concept_ids=tuple(context.concept_ids),
    )
    # Cached clients from before client attempt IDs remain able to save a game,
    # while their potentially retried request cannot duplicate learning rows.
    return attempts if request.client_attempt_id is not None else ()


def insert_learning_attempts(
    cursor,
    *,
    user_id: str,
    game_result_id,
    attempts: tuple[dict, ...],
) -> None:
    if not attempts:
        return
    cursor.execute(
        """
        INSERT INTO learning_attempts (
            user_id, concept_id, activity_type, success,
            duration_bucket, source, evidence_scope, game_result_id
        )
        SELECT %s, attempt.concept_id, attempt.activity_type, attempt.success,
               attempt.duration_bucket, attempt.source,
               attempt.evidence_scope, %s
        FROM unnest(
            %s::text[], %s::text[], %s::boolean[], %s::text[],
            %s::text[], %s::text[]
        ) AS attempt(
            concept_id, activity_type, success, duration_bucket,
            source, evidence_scope
        )
        ON CONFLICT (game_result_id, concept_id) DO NOTHING
        """,
        (
            user_id,
            game_result_id,
            [attempt["concept_id"] for attempt in attempts],
            [attempt["activity_type"] for attempt in attempts],
            [attempt["success"] for attempt in attempts],
            [attempt["duration_bucket"] for attempt in attempts],
            [attempt["source"] for attempt in attempts],
            [attempt["evidence_scope"] for attempt in attempts],
        ),
    )


def persist_game_result(cursor: Any, *, user_id: str, request: Any) -> tuple[tuple, bool]:
    """Insert a game round once and return whether this call created it."""

    cursor.execute(
        """
        INSERT INTO game_results (
            user_id, game_type, mode, category_id, category_title,
            difficulty, score, moves, pairs, time_seconds, stars,
            client_attempt_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, client_attempt_id) DO NOTHING
        RETURNING id, game_type, mode, category_id, category_title,
                  difficulty, score, moves, pairs, time_seconds, stars,
                  created_at
        """,
        (
            user_id,
            request.game_type,
            request.mode,
            request.category_id,
            request.category_title,
            request.difficulty,
            request.score,
            request.moves,
            request.pairs,
            request.time_seconds,
            request.stars,
            request.client_attempt_id,
        ),
    )
    result_row = cursor.fetchone()
    if result_row is not None:
        return result_row, True

    if request.client_attempt_id is None:
        raise RuntimeError("Game result insert returned no row")
    cursor.execute(
        """
        SELECT id, game_type, mode, category_id, category_title,
               difficulty, score, moves, pairs, time_seconds, stars,
               created_at
        FROM game_results
        WHERE user_id = %s AND client_attempt_id = %s
        """,
        (user_id, request.client_attempt_id),
    )
    result_row = cursor.fetchone()
    if result_row is None:
        raise RuntimeError("Idempotent game result could not be loaded")
    return result_row, False
