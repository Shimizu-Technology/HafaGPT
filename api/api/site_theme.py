"""Bounded seasonal-theme resolution."""

from datetime import date, datetime
from typing import Optional

ALLOWED_SEASONAL_THEMES = {"christmas", "newyear"}


def resolve_site_theme(
    theme: str,
    *,
    enabled: bool,
    end_date: Optional[str],
    today: date,
) -> tuple[str, bool]:
    """Return the effective theme and whether a bounded theme is active."""

    if theme not in ALLOWED_SEASONAL_THEMES or not enabled or not end_date:
        return "default", False

    try:
        bounded_end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return "default", False

    if today > bounded_end:
        return "default", False

    return theme, True
