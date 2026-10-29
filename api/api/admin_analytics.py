"""Pure helpers for the admin analytics endpoints."""

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Optional

from api.time_utils import GUAM_TIMEZONE


def window_start(today: date, days: int) -> date:
    """First day of a ``days``-long window that ends on ``today`` (inclusive)."""
    return today - timedelta(days=max(days, 1) - 1)


def build_user_growth_series(
    signups: Iterable[tuple[Optional[int], bool]],
    days: int,
    today: date,
) -> list[dict]:
    """Daily sign-ups and the running total for the last ``days`` Guam days.

    ``signups`` holds one ``(created_at_ms, is_premium)`` pair per account;
    ``created_at_ms`` may be ``None`` for accounts without a creation time.
    Those accounts, and accounts created before the window, form the starting
    total. A creation time after ``today`` (clock skew) counts on ``today`` so
    the final running total always equals the number of accounts.
    """
    start = window_start(today, days)
    daily_signups: dict[date, int] = defaultdict(int)
    daily_premium: dict[date, int] = defaultdict(int)
    total = 0
    for created_at_ms, is_premium in signups:
        total += 1
        if not created_at_ms:
            continue
        signup_day = datetime.fromtimestamp(created_at_ms / 1000, tz=timezone.utc).astimezone(GUAM_TIMEZONE).date()
        signup_day = min(signup_day, today)
        if signup_day >= start:
            daily_signups[signup_day] += 1
            if is_premium:
                daily_premium[signup_day] += 1

    running = total - sum(daily_signups.values())
    series = []
    day = start
    while day <= today:
        running += daily_signups.get(day, 0)
        series.append({
            "date": day.isoformat(),
            "total_users": running,
            "new_users": daily_signups.get(day, 0),
            "premium_users": daily_premium.get(day, 0),
        })
        day += timedelta(days=1)
    return series
