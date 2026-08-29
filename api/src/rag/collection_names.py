"""Canonical PGVector collection names used by the runtime and migration tools."""

from __future__ import annotations

import os


LEGACY_COLLECTION_NAME = "chamorro_grammar"
DEFAULT_PRODUCTION_COLLECTION_NAME = "hafagpt_governed_openai_v3"


def configured_collection_name() -> str:
    """Return the explicit runtime collection or the reviewed production default."""

    return os.getenv("RAG_COLLECTION_NAME", DEFAULT_PRODUCTION_COLLECTION_NAME)
