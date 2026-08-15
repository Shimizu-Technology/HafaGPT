"""Security policy helpers for Clerk session-token verification."""

from __future__ import annotations

import os
from collections.abc import Mapping


PRODUCTION_AUTHORIZED_PARTIES = (
    "https://hafagpt.com",
    "https://www.hafagpt.com",
    "https://hafagpt.netlify.app",
)
DEVELOPMENT_AUTHORIZED_PARTIES = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5185",
    "http://127.0.0.1:5185",
)


def _split_origins(raw_value: str | None) -> tuple[str, ...]:
    if not raw_value or raw_value.strip() == "*":
        return ()
    return tuple(
        dict.fromkeys(
            origin.strip().rstrip("/")
            for origin in raw_value.split(",")
            if origin.strip()
        )
    )


def configured_authorized_parties() -> tuple[str, ...]:
    """Return the explicit Clerk origin allow-list for session JWTs."""

    configured = _split_origins(os.getenv("CLERK_AUTHORIZED_PARTIES"))
    if configured:
        return configured

    # A restrictive CORS list is a safe migration fallback. Wildcards are not.
    configured = _split_origins(os.getenv("ALLOWED_ORIGINS"))
    if configured:
        return configured

    environment = os.getenv("SENTRY_ENVIRONMENT", "").strip().lower()
    if environment == "production":
        return PRODUCTION_AUTHORIZED_PARTIES
    return DEVELOPMENT_AUTHORIZED_PARTIES + PRODUCTION_AUTHORIZED_PARTIES


def configured_clerk_issuer() -> str | None:
    """Return the optional exact Clerk Frontend API issuer."""

    value = os.getenv("CLERK_ISSUER", "").strip()
    return value.rstrip("/") or None


def validate_clerk_session_claims(
    claims: Mapping[str, object],
    authorized_parties: tuple[str, ...],
) -> None:
    """Reject session tokens minted for an unexpected browser origin."""

    authorized_party = claims.get("azp")
    if not isinstance(authorized_party, str) or not authorized_party.strip():
        raise ValueError("Clerk session token is missing the azp claim")

    normalized_party = authorized_party.rstrip("/")
    if normalized_party not in authorized_parties:
        raise ValueError("Clerk session token has an unauthorized azp claim")
