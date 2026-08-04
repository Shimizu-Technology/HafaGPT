"""Shared time helpers for Guam-local product behavior."""

from datetime import date, datetime
from zoneinfo import ZoneInfo


GUAM_TIMEZONE = ZoneInfo("Pacific/Guam")


def get_guam_date(moment: datetime | None = None) -> date:
    """Return the calendar date in Guam for an optional aware datetime."""
    if moment is None:
        return datetime.now(GUAM_TIMEZONE).date()
    if moment.tzinfo is None:
        raise ValueError("moment must include timezone information")
    return moment.astimezone(GUAM_TIMEZONE).date()
