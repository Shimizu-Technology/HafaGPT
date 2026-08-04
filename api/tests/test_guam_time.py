from datetime import date, datetime, timezone

from api import dictionary_service
from api.time_utils import get_guam_date


def test_get_guam_date_rolls_over_at_guam_midnight():
    assert get_guam_date(datetime(2026, 8, 3, 13, 59, tzinfo=timezone.utc)) == date(
        2026, 8, 3
    )
    assert get_guam_date(datetime(2026, 8, 3, 14, 0, tzinfo=timezone.utc)) == date(
        2026, 8, 4
    )


def test_word_of_the_day_uses_the_guam_calendar_date(monkeypatch):
    guam_today = date(2026, 8, 4)
    monkeypatch.setattr(dictionary_service, "get_guam_date", lambda: guam_today)

    service = dictionary_service.DictionaryService.__new__(
        dictionary_service.DictionaryService
    )
    result = service.get_word_of_the_day()

    assert result["date"] == guam_today.isoformat()
