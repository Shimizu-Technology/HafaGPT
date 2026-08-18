"""Bounded seasonal-theme resolution."""

from datetime import date, datetime
from typing import Optional

ALLOWED_SEASONAL_THEMES = {"christmas", "newyear"}
BASE_THEMES = {"default", "chamorro"}
ALLOWED_THEMES = BASE_THEMES | ALLOWED_SEASONAL_THEMES


def validate_site_theme_configuration(
    theme: str,
    *,
    enabled: bool,
    end_date: Optional[str],
    today: date,
) -> Optional[str]:
    """Validate an administrator-provided site-theme configuration."""

    if theme not in ALLOWED_THEMES:
        return "Unknown site theme"

    if theme in BASE_THEMES or not enabled:
        return None

    if not end_date:
        return "Seasonal themes require an end date"

    try:
        bounded_end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return "Seasonal theme end date must be a valid YYYY-MM-DD calendar date"

    if bounded_end < today:
        return "Seasonal theme end date must be today or later in Guam time"

    return None


def resolve_site_theme(
    theme: str,
    *,
    enabled: bool,
    end_date: Optional[str],
    today: date,
) -> tuple[str, bool]:
    """Return the effective theme and whether a bounded theme is active."""

    if theme in BASE_THEMES:
        return theme, False

    if theme not in ALLOWED_SEASONAL_THEMES or not enabled:
        return "default", False

    if validate_site_theme_configuration(
        theme,
        enabled=enabled,
        end_date=end_date,
        today=today,
    ):
        return "default", False

    return theme, True
