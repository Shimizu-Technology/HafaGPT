"""Privacy-minimized learning-attempt derivation."""

from typing import Optional


LEARNING_TOPIC_IDS = {
    "greetings",
    "numbers",
    "colors",
    "family",
    "food",
    "animals",
    "phrases",
    "questions",
    "body",
    "days",
    "months",
    "verbs",
    "adjectives",
    "sentences",
    "places",
    "weather",
    "household",
    "directions",
    "shopping",
    "daily-life",
    "culture",
}
LEARNING_SOURCES = {"lesson", "today"}
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

    if topic_id not in LEARNING_TOPIC_IDS:
        raise ValueError("Unknown learning topic")
    if category_id != topic_id:
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
    }


def insert_learning_attempt(cursor, *, user_id: str, game_result_id, attempt: dict) -> None:
    """Insert the minimal attempt in the caller's game-result transaction."""

    cursor.execute(
        """
        INSERT INTO learning_attempts (
            user_id, concept_id, activity_type, success,
            duration_bucket, source, game_result_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            attempt["concept_id"],
            attempt["activity_type"],
            attempt["success"],
            attempt["duration_bucket"],
            attempt["source"],
            game_result_id,
        ),
    )
