#!/usr/bin/env python3
"""Validate the complete governed-source and knowledge-card control plane."""

from __future__ import annotations

from src.rag.knowledge_cards import load_knowledge_cards
from src.rag.permission_records import load_permission_records
from src.rag.source_policy import load_source_registry
from src.rag.source_reviews import load_source_reviews


def main() -> int:
    registry = load_source_registry()
    permissions = load_permission_records()
    reviews = load_source_reviews()
    cards = load_knowledge_cards()
    print(
        "Governed language sources OK: "
        f"{len(registry['sources'])} registered, "
        f"{len(reviews['records'])} reviewed, "
        f"{len(permissions['records'])} permission records, "
        f"{len(cards['cards'])} knowledge cards"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
