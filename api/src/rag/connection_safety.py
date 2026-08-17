"""Small helpers for safe database-tool output."""

from __future__ import annotations

from urllib.parse import urlsplit


def redact_database_url(connection: str) -> str:
    """Describe a database endpoint without printing credentials or query secrets."""
    parsed = urlsplit(connection)
    if not parsed.scheme or not parsed.hostname:
        return "<configured database>"
    port = f":{parsed.port}" if parsed.port else ""
    database = parsed.path or ""
    return f"{parsed.scheme}://***@{parsed.hostname}{port}{database}"
