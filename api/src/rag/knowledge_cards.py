"""Validation and loading for original, citation-backed HåfaGPT knowledge cards."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.rag.source_reviews import get_source_review


KNOWLEDGE_CARDS_PATH = Path(__file__).resolve().parents[2] / "language_content" / "knowledge_cards.json"
CLAIM_TYPES = {
    "definition",
    "grammar_rule",
    "orthography_rule",
    "usage",
    "cultural_context",
    "historical_context",
}
TEMPORAL_SCOPES = {"modern", "living", "historical", "mixed"}
REGIONS = {"Guam", "CNMI", "Guam_and_CNMI", "unspecified"}
CONFIDENCE_LEVELS = {"high", "medium", "low"}
SUPPORT_TYPES = {"primary", "corroborating", "regional_variant", "historical", "usage"}
CLAIM_QUERY_TYPES = {
    "definition": "lookup",
    "grammar_rule": "educational",
    "orthography_rule": "educational",
    "usage": "usage",
    "cultural_context": "cultural",
    "historical_context": "historical",
}
CARD_ID = re.compile(r"^[a-z0-9_.-]+$")


@lru_cache(maxsize=1)
def load_knowledge_cards() -> dict[str, Any]:
    with KNOWLEDGE_CARDS_PATH.open(encoding="utf-8") as handle:
        document = json.load(handle)
    validate_knowledge_cards(document)
    return document


def validate_knowledge_cards(document: dict[str, Any]) -> None:
    if document.get("schema_version") != 1:
        raise ValueError("knowledge cards schema_version must be 1")
    metadata = document.get("metadata")
    if not isinstance(metadata, dict) or not metadata.get("editorial_policy"):
        raise ValueError("knowledge cards require an editorial policy")
    cards = document.get("cards")
    if not isinstance(cards, list):
        raise ValueError("knowledge cards must be a list")

    seen: set[str] = set()
    for card in cards:
        if not isinstance(card, dict):
            raise ValueError("knowledge card must be an object")
        card_id = card.get("id")
        if not isinstance(card_id, str) or not CARD_ID.fullmatch(card_id) or card_id in seen:
            raise ValueError(f"invalid or duplicate knowledge card id: {card_id}")
        seen.add(card_id)
        for field in ("title", "answer_text", "review_notes"):
            if not isinstance(card.get(field), str) or not card[field].strip():
                raise ValueError(f"knowledge card {card_id} requires {field}")
        if card.get("claim_type") not in CLAIM_TYPES:
            raise ValueError(f"unsupported claim_type for knowledge card {card_id}")
        if card.get("temporal_scope") not in TEMPORAL_SCOPES:
            raise ValueError(f"unsupported temporal_scope for knowledge card {card_id}")
        if card.get("region") not in REGIONS:
            raise ValueError(f"unsupported region for knowledge card {card_id}")
        if card.get("confidence") not in CONFIDENCE_LEVELS:
            raise ValueError(f"unsupported confidence for knowledge card {card_id}")
        aliases = card.get("question_aliases")
        if not isinstance(aliases, list) or not aliases or not all(
            isinstance(alias, str) and alias.strip() for alias in aliases
        ):
            raise ValueError(f"knowledge card {card_id} requires question aliases")

        citations = card.get("citations")
        if not isinstance(citations, list) or not citations:
            raise ValueError(f"knowledge card {card_id} requires citations")
        if not any(
            isinstance(citation, dict) and citation.get("support") == "primary"
            for citation in citations
        ):
            raise ValueError(f"knowledge card {card_id} requires a primary citation")
        claim_query_type = CLAIM_QUERY_TYPES[card["claim_type"]]
        for citation in citations:
            if not isinstance(citation, dict):
                raise ValueError(f"knowledge card citation must be an object: {card_id}")
            source_id = citation.get("source_id")
            review = get_source_review(str(source_id))
            if not review:
                raise ValueError(f"knowledge card {card_id} cites an unknown source: {source_id}")
            if review["usage"]["mode"] not in {"full_text", "knowledge_cards"}:
                raise ValueError(
                    f"knowledge card {card_id} cites a source not approved for cards: {source_id}"
                )
            if claim_query_type not in review["usage"]["allowed_query_types"]:
                raise ValueError(
                    f"knowledge card {card_id} uses {source_id} outside its reviewed query role"
                )
            for field in ("url", "locator", "accessed_at"):
                if not isinstance(citation.get(field), str) or not citation[field].strip():
                    raise ValueError(f"knowledge card {card_id} citation requires {field}")
            if citation.get("support") not in SUPPORT_TYPES:
                raise ValueError(f"knowledge card {card_id} citation has invalid support")
            excerpt = citation.get("source_excerpt")
            if excerpt is not None:
                if not isinstance(excerpt, str):
                    raise ValueError(f"knowledge card {card_id} source_excerpt must be text")
                word_count = len(excerpt.split())
                if word_count > review["usage"]["max_source_quote_words"]:
                    raise ValueError(
                        f"knowledge card {card_id} exceeds quote limit for {source_id}"
                    )


def cards_by_id() -> dict[str, dict[str, Any]]:
    return {card["id"]: card for card in load_knowledge_cards()["cards"]}
