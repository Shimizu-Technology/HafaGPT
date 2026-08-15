import pytest

from api.auth_policy import (
    configured_authorized_parties,
    configured_clerk_issuer,
    validate_clerk_session_claims,
)


def test_authorized_parties_prefer_explicit_clerk_setting(monkeypatch):
    monkeypatch.setenv(
        "CLERK_AUTHORIZED_PARTIES",
        "https://hafagpt.com/, http://127.0.0.1:5185,https://hafagpt.com",
    )
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://wrong.example")

    assert configured_authorized_parties() == (
        "https://hafagpt.com",
        "http://127.0.0.1:5185",
    )


def test_production_defaults_never_include_localhost(monkeypatch):
    monkeypatch.delenv("CLERK_AUTHORIZED_PARTIES", raising=False)
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    monkeypatch.setenv("SENTRY_ENVIRONMENT", "production")

    parties = configured_authorized_parties()

    assert "https://hafagpt.com" in parties
    assert all("localhost" not in origin and "127.0.0.1" not in origin for origin in parties)


@pytest.mark.parametrize("claims", [{}, {"azp": ""}, {"azp": None}])
def test_rejects_missing_authorized_party(claims):
    with pytest.raises(ValueError, match="missing"):
        validate_clerk_session_claims(claims, ("https://hafagpt.com",))


def test_rejects_wrong_authorized_party():
    with pytest.raises(ValueError, match="unauthorized"):
        validate_clerk_session_claims(
            {"azp": "https://attacker.example"},
            ("https://hafagpt.com",),
        )


def test_accepts_authorized_party_with_trailing_slash():
    validate_clerk_session_claims(
        {"azp": "https://hafagpt.com/"},
        ("https://hafagpt.com",),
    )


def test_optional_issuer_is_normalized(monkeypatch):
    monkeypatch.setenv("CLERK_ISSUER", "https://example.clerk.accounts.dev/")
    assert configured_clerk_issuer() == "https://example.clerk.accounts.dev"
