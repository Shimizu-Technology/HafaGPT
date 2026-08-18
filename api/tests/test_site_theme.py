from datetime import date

from api.site_theme import resolve_site_theme


def test_seasonal_theme_requires_enabled_bounded_window():
    today = date(2026, 8, 18)

    assert resolve_site_theme("christmas", enabled=False, end_date="2026-12-31", today=today) == ("default", False)
    assert resolve_site_theme("christmas", enabled=True, end_date="2026-01-06", today=today) == ("default", False)
    assert resolve_site_theme("christmas", enabled=True, end_date=None, today=today) == ("default", False)


def test_active_theme_must_be_known_and_unexpired():
    today = date(2026, 12, 20)

    assert resolve_site_theme("christmas", enabled=True, end_date="2027-01-06", today=today) == ("christmas", True)
    assert resolve_site_theme("unknown", enabled=True, end_date="2027-01-06", today=today) == ("default", False)


def test_base_chamorro_theme_does_not_require_a_seasonal_window():
    assert resolve_site_theme(
        "chamorro",
        enabled=False,
        end_date=None,
        today=date(2026, 8, 18),
    ) == ("chamorro", False)
