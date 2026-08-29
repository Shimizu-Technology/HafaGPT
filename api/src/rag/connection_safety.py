"""Small helpers for safe database-tool output."""

from __future__ import annotations

import re
from urllib.parse import urlsplit

from src.rag.collection_names import LEGACY_COLLECTION_NAME


def redact_database_url(connection: str) -> str:
    """Describe a database endpoint without printing credentials or query secrets."""
    try:
        parsed = urlsplit(connection)
        hostname = parsed.hostname
        port_number = parsed.port
    except (TypeError, ValueError):
        return "<configured database>"
    if (
        not parsed.scheme
        or not hostname
        or parsed.netloc.count("@") > 1
        or not re.fullmatch(r"[A-Za-z0-9.:-]+", hostname)
    ):
        return "<configured database>"
    database_name = parsed.path.removeprefix("/")
    if database_name and not re.fullmatch(r"[A-Za-z0-9_.-]+", database_name):
        return "<configured database>"
    rendered_host = f"[{hostname}]" if ":" in hostname else hostname
    port = f":{port_number}" if port_number else ""
    database = f"/{database_name}" if database_name else ""
    return f"{parsed.scheme}://***@{rendered_host}{port}{database}"


def metadata_file_for_collection(
    collection_name: str,
    explicit_path: str | None = None,
    configured_path: str | None = None,
) -> str:
    """Keep duplicate-tracking metadata isolated for each RAG collection."""
    if explicit_path:
        return explicit_path
    if configured_path:
        return configured_path
    if collection_name == LEGACY_COLLECTION_NAME:
        return "./rag_metadata.json"
    safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", collection_name).strip("._")
    if not safe_name:
        raise ValueError("collection name cannot produce a safe metadata filename")
    return f"./rag_metadata.{safe_name}.json"
