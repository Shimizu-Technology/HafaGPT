"""Shared spaced-repetition scheduling and persistence helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Mapping, Optional


def calculate_sm2(
    quality: int,
    easiness_factor: float,
    interval: int,
    repetition: int,
) -> tuple[float, int, int]:
    """Return the next SM-2 state for a 0–5 recall quality."""

    if quality < 0 or quality > 5:
        raise ValueError("quality must be between 0 and 5")

    new_ef = easiness_factor + (
        0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    )
    new_ef = max(1.3, new_ef)

    if quality < 3:
        return new_ef, 1, 0

    new_repetition = repetition + 1
    if new_repetition == 1:
        new_interval = 1
    elif new_repetition == 2:
        new_interval = 6
    else:
        new_interval = max(1, int(interval * new_ef))

    return new_ef, new_interval, new_repetition


def quality_from_confidence(confidence: int) -> int:
    """Map the legacy Hard/Good/Easy scale onto SM-2 quality."""

    try:
        return {1: 3, 2: 4, 3: 5}[confidence]
    except KeyError as exc:
        raise ValueError("confidence must be between 1 and 3") from exc


def upsert_spaced_repetition_review(
    cursor,
    *,
    user_id: str,
    card_id: str,
    deck_id: str,
    quality: int,
    content: Optional[Mapping[str, Any]] = None,
    reviewed_at: Optional[datetime] = None,
) -> dict[str, Any]:
    """Persist one review using a caller-owned transaction.

    Content is a snapshot used to reconstruct a due-review queue. Existing
    non-null content is retained when an older client sends no snapshot.
    """

    reviewed_at = reviewed_at or datetime.now(timezone.utc)
    content = content or {}

    cursor.execute(
        """
        SELECT easiness_factor, interval, repetition
        FROM spaced_repetition
        WHERE user_id = %s AND card_id = %s
        """,
        (user_id, card_id),
    )
    row = cursor.fetchone()
    current_ef, current_interval, current_repetition = (
        (float(row[0]), row[1], row[2]) if row else (2.5, 1, 0)
    )

    new_ef, new_interval, new_repetition = calculate_sm2(
        quality,
        current_ef,
        current_interval,
        current_repetition,
    )
    next_review = reviewed_at + timedelta(days=new_interval)
    correct_increment = 1 if quality >= 3 else 0
    incorrect_increment = 1 - correct_increment

    cursor.execute(
        """
        INSERT INTO spaced_repetition (
            user_id, card_id, deck_id, easiness_factor, interval, repetition,
            last_review, next_review, total_reviews, correct_count, incorrect_count,
            front, back, pronunciation, example, source_kind
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, 1, %s, %s,
            %s, %s, %s, %s, %s
        )
        ON CONFLICT (user_id, card_id) DO UPDATE SET
            deck_id = EXCLUDED.deck_id,
            easiness_factor = EXCLUDED.easiness_factor,
            interval = EXCLUDED.interval,
            repetition = EXCLUDED.repetition,
            last_review = EXCLUDED.last_review,
            next_review = EXCLUDED.next_review,
            total_reviews = spaced_repetition.total_reviews + 1,
            correct_count = spaced_repetition.correct_count + %s,
            incorrect_count = spaced_repetition.incorrect_count + %s,
            front = COALESCE(EXCLUDED.front, spaced_repetition.front),
            back = COALESCE(EXCLUDED.back, spaced_repetition.back),
            pronunciation = COALESCE(EXCLUDED.pronunciation, spaced_repetition.pronunciation),
            example = COALESCE(EXCLUDED.example, spaced_repetition.example),
            source_kind = COALESCE(EXCLUDED.source_kind, spaced_repetition.source_kind),
            updated_at = %s
        RETURNING total_reviews, correct_count, incorrect_count
        """,
        (
            user_id,
            card_id,
            deck_id,
            new_ef,
            new_interval,
            new_repetition,
            reviewed_at,
            next_review,
            correct_increment,
            incorrect_increment,
            content.get("front"),
            content.get("back"),
            content.get("pronunciation"),
            content.get("example"),
            content.get("source_kind"),
            correct_increment,
            incorrect_increment,
            reviewed_at,
        ),
    )
    totals = cursor.fetchone()

    return {
        "card_id": card_id,
        "deck_id": deck_id,
        "quality": quality,
        "is_correct": quality >= 3,
        "easiness_factor": round(new_ef, 2),
        "interval_days": new_interval,
        "repetition": new_repetition,
        "next_review": next_review,
        "total_reviews": totals[0],
        "correct_count": totals[1],
        "incorrect_count": totals[2],
    }
