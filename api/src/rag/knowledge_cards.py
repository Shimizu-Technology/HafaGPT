"""Validation and loading for original, citation-backed HåfaGPT knowledge cards."""

from __future__ import annotations

import json
import re
from datetime import date
from functools import lru_cache
from ipaddress import ip_address
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from src.rag.query_classification import detect_query_type
from src.rag.source_reviews import build_registered_source_citation, get_source_review


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
RELEASE_STATUSES = {"draft", "reviewed", "production_ready"}
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
ROOT_FIELDS = {"schema_version", "metadata", "cards"}
METADATA_FIELDS = {"purpose", "created_at", "editorial_policy"}
CARD_FIELDS = {
    "id",
    "title",
    "claim_type",
    "answer_text",
    "question_aliases",
    "region",
    "temporal_scope",
    "confidence",
    "release_status",
    "citations",
    "review_notes",
}
CITATION_REQUIRED_FIELDS = {"source_id", "url", "locator", "accessed_at", "support"}
CITATION_FIELDS = CITATION_REQUIRED_FIELDS | {"source_excerpt"}
URI_CHARACTERS = re.compile(r"[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+")
INVALID_PERCENT_ESCAPE = re.compile(r"%(?![0-9A-Fa-f]{2})")
DOMAIN_LABEL = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?")
LEGACY_IP_LABEL = re.compile(r"(?:0[xX][0-9A-Fa-f]+|[0-9]+)")
REGION_QUERY_MARKERS = {
    "Guam": {"guam", "guåhan", "guahan"},
    "CNMI": {"cnmi", "saipan", "tinian", "rota", "marianas"},
}
CARD_INTENT_MARKERS = {
    "orthography_rule": {
        "spell",
        "spelling",
        "spellings",
        "orthography",
        "orthographic",
        "utugrafihan",
        "write",
        "writing",
    },
}


def _validate_exact_fields(
    value: dict[str, Any],
    *,
    required: set[str],
    allowed: set[str],
    label: str,
) -> None:
    missing = required - set(value)
    extra = set(value) - allowed
    if missing:
        raise ValueError(f"{label} is missing fields: {sorted(missing)}")
    if extra:
        raise ValueError(f"{label} has undeclared fields: {sorted(extra)}")


def _is_iso_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def is_public_http_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip() or value != value.strip():
        return False
    # Keep runtime validation aligned with the schema's RFC 3986 `uri` format.
    # urlsplit() is deliberately permissive and otherwise accepts whitespace and
    # other characters that must be percent-encoded in a URI.
    if not URI_CHARACTERS.fullmatch(value) or INVALID_PERCENT_ESCAPE.search(value):
        return False
    parsed = urlsplit(value)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        return False
    if parsed.username is not None or parsed.password is not None:
        return False
    try:
        parsed.port
    except ValueError:
        return False
    hostname = (parsed.hostname or "").casefold().rstrip(".")
    if not hostname or hostname == "localhost" or hostname.endswith((".localhost", ".local")):
        return False
    try:
        return ip_address(hostname).is_global
    except ValueError:
        labels = hostname.split(".")
        # Legacy IPv4 notations such as 127.1, 0177.0.0.1, and 0x7f.0.0.1
        # are accepted by some clients even though ip_address() rejects them.
        # Do not let those numeric forms fall through as apparent domain names.
        if all(LEGACY_IP_LABEL.fullmatch(label) for label in labels):
            return False
        return (
            len(hostname) <= 253
            and len(labels) >= 2
            and all(DOMAIN_LABEL.fullmatch(label) for label in labels)
            and any(character.isalpha() for character in labels[-1])
        )


@lru_cache(maxsize=1)
def load_knowledge_cards() -> dict[str, Any]:
    with KNOWLEDGE_CARDS_PATH.open(encoding="utf-8") as handle:
        document = json.load(handle)
    validate_knowledge_cards(document)
    return document


def validate_knowledge_cards(document: dict[str, Any]) -> None:
    if not isinstance(document, dict):
        raise ValueError("knowledge cards root must be an object")
    _validate_exact_fields(
        document,
        required=ROOT_FIELDS,
        allowed=ROOT_FIELDS,
        label="knowledge cards root",
    )
    if document.get("schema_version") != 1:
        raise ValueError("knowledge cards schema_version must be 1")
    metadata = document.get("metadata")
    if not isinstance(metadata, dict):
        raise ValueError("knowledge cards metadata must be an object")
    _validate_exact_fields(
        metadata,
        required=METADATA_FIELDS,
        allowed=METADATA_FIELDS,
        label="knowledge cards metadata",
    )
    for field in ("purpose", "editorial_policy"):
        if not isinstance(metadata.get(field), str) or not metadata[field].strip():
            raise ValueError(f"knowledge cards metadata requires {field}")
    if not _is_iso_date(metadata.get("created_at")):
        raise ValueError("knowledge cards metadata requires an ISO created_at date")
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
        _validate_exact_fields(
            card,
            required=CARD_FIELDS,
            allowed=CARD_FIELDS,
            label=f"knowledge card {card_id}",
        )
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
        if card.get("release_status") not in RELEASE_STATUSES:
            raise ValueError(f"unsupported release_status for knowledge card {card_id}")
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
            _validate_exact_fields(
                citation,
                required=CITATION_REQUIRED_FIELDS,
                allowed=CITATION_FIELDS,
                label=f"knowledge card {card_id} citation",
            )
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
            if card["release_status"] == "production_ready" and review["review_status"] != "complete":
                raise ValueError(
                    f"production-ready card {card_id} cites incomplete source review: {source_id}"
                )
            if not is_public_http_url(citation.get("url")):
                raise ValueError(f"knowledge card {card_id} citation requires a public HTTP(S) URL")
            if not isinstance(citation.get("locator"), str) or not citation["locator"].strip():
                raise ValueError(f"knowledge card {card_id} citation requires locator")
            if not _is_iso_date(citation.get("accessed_at")):
                raise ValueError(f"knowledge card {card_id} citation requires an ISO accessed_at date")
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


def production_cards() -> list[dict[str, Any]]:
    return [
        card
        for card in load_knowledge_cards()["cards"]
        if card["release_status"] == "production_ready"
    ]


def _normalize_match_text(value: str) -> str:
    normalized_apostrophes = value.casefold().replace("’", "'").replace("‘", "'")
    return " ".join(re.sub(r"[^a-z0-9åñ'-]+", " ", normalized_apostrophes).split())


def matching_production_cards(query: str, *, limit: int = 3) -> list[dict[str, Any]]:
    """Return approved cards whose reviewed question aliases match the query.

    Knowledge cards are intentionally deterministic: they are not placed in the
    vector collection and cannot be selected merely because they are vaguely
    semantically similar to a request.
    """

    normalized_query = _normalize_match_text(query)
    if not normalized_query or limit <= 0:
        return []

    query_tokens = set(normalized_query.split())
    query_type = detect_query_type(query)
    scored: list[tuple[float, dict[str, Any]]] = []
    for card in production_cards():
        if (
            query_type == "historical"
            and card["temporal_scope"] not in {"historical", "mixed"}
        ):
            continue
        region_markers = REGION_QUERY_MARKERS.get(card["region"])
        missing_region_marker = bool(
            region_markers and query_tokens.isdisjoint(region_markers)
        )
        intent_markers = CARD_INTENT_MARKERS.get(card["claim_type"])
        if intent_markers and query_tokens.isdisjoint(intent_markers):
            continue
        best_score = 0.0
        for alias in card["question_aliases"]:
            normalized_alias = _normalize_match_text(alias)
            if not normalized_alias:
                continue
            if normalized_alias == normalized_query:
                best_score = max(best_score, 3.0)
                continue
            if normalized_alias in normalized_query:
                best_score = max(best_score, 2.0)
                continue
            if len(query_tokens) >= 3 and normalized_query in normalized_alias:
                best_score = max(best_score, 1.5)
                continue
            alias_tokens = set(normalized_alias.split())
            if len(alias_tokens) >= 3 and alias_tokens <= query_tokens:
                # A concise reviewed alias can act as a deterministic set of
                # required terms even when natural wording separates them.
                best_score = max(best_score, 2.0)
                continue
            overlap = len(query_tokens & alias_tokens)
            if overlap >= 3:
                best_score = max(best_score, overlap / len(alias_tokens | query_tokens))
        # Region-specific reviewed answers normally require an explicit place
        # marker. A contained, editorially reviewed alias is the narrow escape
        # hatch for context such as an image prompt where the regional marker is
        # visible to the model but absent from the user's typed message. Generic
        # token overlap can never bypass the regional guardrail.
        if missing_region_marker and best_score < 2.0:
            continue
        if best_score >= 0.5:
            scored.append((best_score, card))

    scored.sort(key=lambda item: (-item[0], item[1]["id"]))
    return [card for _score, card in scored[:limit]]


def get_knowledge_card_context(
    query: str,
    *,
    include_card_ids: tuple[str, ...] = (),
) -> tuple[str, list[dict[str, Any]]]:
    """Build prompt context and public citations from approved cards.

    ``include_card_ids`` is for trusted application context that cannot be
    represented in typed query text, such as a vision request whose visible
    contents have not yet been transcribed. Only production-ready cards can be
    included through this path.
    """

    cards = matching_production_cards(query)
    selected_ids = {card["id"] for card in cards}
    production_by_id = {card["id"]: card for card in production_cards()}
    for card_id in include_card_ids:
        card = production_by_id.get(card_id)
        if card and card_id not in selected_ids:
            selected_ids.add(card_id)
            cards.append(card)
    if not cards:
        return "", []

    lines = [
        "=== APPROVED HÅFAGPT KNOWLEDGE CARDS ===",
        "These are original reviewed explanations. Use only the claims and scope stated here.",
        "Cite supporting sources by their exact displayed names in square brackets.",
        "",
    ]
    citations: list[dict[str, Any]] = []
    seen_citations: set[tuple[str, str]] = set()
    for card in cards:
        lines.extend(
            [
                f"[Knowledge card: {card['id']}]",
                f"Title: {card['title']}",
                f"Approved explanation: {card['answer_text']}",
                f"Region: {card['region']}",
                f"Time scope: {card['temporal_scope']}",
                f"Confidence: {card['confidence']}",
                "Supporting citations:",
            ]
        )
        for item in card["citations"]:
            source = build_registered_source_citation(item["source_id"])
            source.update(
                {
                    "url": item["url"],
                    "locator": item["locator"],
                    "accessed_at": item["accessed_at"],
                    "support": item["support"],
                    "knowledge_card_id": card["id"],
                    "evidence_kind": "knowledge_card",
                }
            )
            lines.append(f"- {source['name']}: {item['locator']}")
            key = (source["source_id"], item["locator"])
            if key not in seen_citations:
                seen_citations.add(key)
                citations.append(source)
        lines.append("")

    lines.append("=" * 60)
    return "\n".join(lines), citations
