"""Backward-compatible formatting for public chat source citations."""

from __future__ import annotations

from typing import Any, Iterable

from src.rag.knowledge_cards import is_public_http_url
from src.rag.source_reviews import build_registered_source_citation


LEGACY_SOURCE_IDS = {
    "HåfaGPT canonical vocabulary": "hafagpt_canonical_evaluation",
    "Chamoru.info dictionary": "chamoru_info_dictionary",
    "Topping, Ogo, and Dungca dictionary": "topping_ogo_dungca_1975",
    "Revised and updated Chamorro dictionary": "local_revised_dictionary_snapshot",
}
PUBLIC_CITATION_FIELDS = {
    "source_id",
    "name",
    "url",
    "page",
    "locator",
    "content_role",
    "region",
    "orthography",
    "temporal_scope",
    "usage_mode",
    "authority_score",
    "citation_required",
    "accessed_at",
    "support",
    "knowledge_card_id",
    "evidence_kind",
}


def _legacy_source_citation(name: str, page: object) -> dict[str, Any]:
    source_id = LEGACY_SOURCE_IDS.get(name)
    citation = build_registered_source_citation(source_id) if source_id else None
    result = citation or {"source_id": None, "name": name, "url": None}
    result["page"] = page if isinstance(page, int) and page > 0 else None
    if result["page"]:
        result["locator"] = f"Page {result['page']}"
    return result


def format_source_citations(sources: Iterable[object]) -> list[dict[str, Any]]:
    """Normalize new citation dictionaries and historical ``(name, page)`` pairs."""

    formatted: list[dict[str, Any]] = []
    seen: set[tuple[object, object, object]] = set()
    for source in sources:
        if isinstance(source, dict):
            citation = {
                key: value
                for key, value in source.items()
                if key in PUBLIC_CITATION_FIELDS
            }
            if not isinstance(citation.get("name"), str) or not citation["name"].strip():
                continue
            url = citation.get("url")
            if not is_public_http_url(url):
                citation["url"] = None
        elif isinstance(source, (tuple, list)) and source:
            name = str(source[0]).strip()
            if not name:
                continue
            page = source[1] if len(source) > 1 else None
            citation = _legacy_source_citation(name, page)
        else:
            continue

        key = (
            citation.get("source_id") or citation["name"],
            citation.get("page"),
            citation.get("locator"),
        )
        if key in seen:
            continue
        seen.add(key)
        formatted.append(citation)
    return formatted
