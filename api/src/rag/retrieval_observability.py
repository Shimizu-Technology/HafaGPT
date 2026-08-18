"""Privacy-safe structured telemetry for governed retrieval selection."""

from __future__ import annotations

from typing import Any, Iterable


def build_retrieval_event(
    *,
    query_type: str,
    rag_mode: str | None,
    sources: Iterable[dict[str, Any]],
    context_truncated: bool,
) -> dict[str, Any]:
    """Describe selected evidence without recording user text or source content."""

    source_ids: set[str] = set()
    evidence_kinds: set[str] = set()
    knowledge_card_ids: set[str] = set()
    source_count = 0
    for source in sources:
        if not isinstance(source, dict):
            continue
        source_count += 1
        source_id = source.get("source_id")
        evidence_kind = source.get("evidence_kind")
        card_id = source.get("knowledge_card_id")
        if isinstance(source_id, str) and source_id:
            source_ids.add(source_id)
        if isinstance(evidence_kind, str) and evidence_kind:
            evidence_kinds.add(evidence_kind)
        if isinstance(card_id, str) and card_id:
            knowledge_card_ids.add(card_id)

    if "knowledge_card" in evidence_kinds:
        route = "knowledge_card"
    elif "legacy_retrieval" in evidence_kinds:
        route = "vector"
    elif source_count:
        route = "canonical"
    else:
        route = "no_evidence"

    return {
        "event": "rag_evidence_selected",
        "version": 1,
        "route": route,
        "query_type": query_type,
        "rag_mode": rag_mode,
        "source_count": source_count,
        "source_ids": sorted(source_ids),
        "evidence_kinds": sorted(evidence_kinds),
        "knowledge_card_ids": sorted(knowledge_card_ids),
        "context_truncated": context_truncated,
    }
