from datetime import date, datetime, timezone

from api.admin_analytics import build_user_growth_series, window_start


def ms(text: str) -> int:
    return int(datetime.fromisoformat(text).replace(tzinfo=timezone.utc).timestamp() * 1000)


def test_window_covers_exactly_the_requested_days():
    assert window_start(date(2026, 10, 30), 7) == date(2026, 10, 24)
    assert window_start(date(2026, 10, 30), 1) == date(2026, 10, 30)


def test_growth_uses_guam_days_and_exact_window():
    # 2026-10-29T15:30Z is already Oct 30 in Guam (UTC+10).
    signups = [(ms("2026-10-29T15:30:00"), False), (ms("2026-10-20T00:00:00"), True), (None, False)]
    series = build_user_growth_series(signups, 7, date(2026, 10, 30))
    assert [row["date"] for row in series] == [f"2026-10-{d}" for d in range(24, 31)]
    assert series[-1]["new_users"] == 1
    # The Oct 20 account and the account without a creation time are the baseline.
    assert series[0]["total_users"] == 2
    assert series[-1]["total_users"] == 3


def test_future_signups_count_on_today_so_the_total_matches():
    signups = [(ms("2026-11-05T00:00:00"), True), (ms("2026-10-01T00:00:00"), False)]
    series = build_user_growth_series(signups, 3, date(2026, 10, 30))
    assert series[-1] == {"date": "2026-10-30", "total_users": 2, "new_users": 1, "premium_users": 1}


def test_empty_account_list_still_returns_every_day():
    series = build_user_growth_series([], 3, date(2026, 10, 30))
    assert [row["total_users"] for row in series] == [0, 0, 0]
