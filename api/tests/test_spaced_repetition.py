from datetime import datetime, timezone

import pytest

from api.spaced_repetition import (
    calculate_sm2,
    quality_from_confidence,
    upsert_spaced_repetition_review,
)


class FakeCursor:
    def __init__(self, current=None, totals=(1, 1, 0)):
        self.current = current
        self.totals = totals
        self.calls = []
        self._last_query = ""

    def execute(self, query, params):
        self._last_query = query
        self.calls.append((query, params))

    def fetchone(self):
        if "SELECT easiness_factor" in self._last_query:
            return self.current
        return self.totals


def test_sm2_resets_failed_recall_and_spaces_successes():
    failed = calculate_sm2(2, 2.5, 12, 4)
    first_success = calculate_sm2(4, 2.5, 1, 0)
    second_success = calculate_sm2(4, first_success[0], first_success[1], first_success[2])

    assert failed[1:] == (1, 0)
    assert first_success[1:] == (1, 1)
    assert second_success[1:] == (6, 2)


@pytest.mark.parametrize("quality", [-1, 6])
def test_sm2_rejects_invalid_quality(quality):
    with pytest.raises(ValueError, match="quality"):
        calculate_sm2(quality, 2.5, 1, 0)


def test_legacy_confidence_mapping_is_monotonic():
    assert [quality_from_confidence(value) for value in (1, 2, 3)] == [3, 4, 5]


def test_upsert_preserves_snapshot_and_returns_schedule():
    cursor = FakeCursor(totals=(3, 2, 1))
    reviewed_at = datetime(2026, 8, 18, 10, 0, tzinfo=timezone.utc)

    result = upsert_spaced_repetition_review(
        cursor,
        user_id="user_123",
        card_id="v1:curated:greetings:hafa",
        deck_id="curated:greetings",
        quality=4,
        content={
            "front": "Håfa Adai",
            "back": "Hello",
            "pronunciation": "HAH-fah ah-DIE",
            "example": None,
            "source_kind": "curated",
        },
        reviewed_at=reviewed_at,
    )

    assert result["interval_days"] == 1
    assert result["next_review"].isoformat() == "2026-08-19T10:00:00+00:00"
    assert result["total_reviews"] == 3

    assert "pg_advisory_xact_lock" in cursor.calls[0][0]
    assert cursor.calls[0][1] == ("8:user_123v1:curated:greetings:hafa",)

    insert_params = cursor.calls[2][1]
    assert "Håfa Adai" in insert_params
    assert "Hello" in insert_params
    assert "COALESCE(EXCLUDED.front, spaced_repetition.front)" in cursor.calls[2][0]
