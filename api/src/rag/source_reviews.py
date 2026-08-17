"""Evidence-backed editorial dispositions for registered language sources.

The source registry answers whether legacy chunks may currently be retrieved.
This module answers a different question: how a source may contribute to the
next governed corpus.  Keeping those decisions separate lets HåfaGPT preserve
every resource without treating public access as permission to copy full text.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.rag.source_policy import (
    SUPPORTED_QUERY_TYPES,
    get_registered_source,
    registered_source_ids,
    resolve_source,
)


SOURCE_REVIEWS_PATH = Path(__file__).resolve().parents[2] / "data" / "source_review_records.json"

REVIEW_STATUSES = {"complete", "provisional", "quarantined"}
TEMPORAL_SCOPES = {"modern", "living", "historical", "mixed", "unknown"}
REGIONS = {"Guam", "CNMI", "Guam_and_CNMI", "unspecified"}
LINEAGES = {"independent", "derivative", "aggregator", "internal", "unknown"}
EXTRACTION_RISKS = {"low", "medium", "high", "unknown"}
CONFIDENCE_LEVELS = {"high", "medium", "low"}
USAGE_MODES = {
    "full_text",
    "knowledge_cards",
    "reference_only",
    "historical_only",
    "discovery_only",
    "evaluation_only",
    "quarantine",
}
EVIDENCE_KINDS = {
    "publisher",
    "institution",
    "terms",
    "catalog",
    "artifact",
    "local_inventory",
}


@lru_cache(maxsize=1)
def load_source_reviews() -> dict[str, Any]:
    with SOURCE_REVIEWS_PATH.open(encoding="utf-8") as handle:
        document = json.load(handle)
    validate_source_reviews(document)
    return document


def validate_source_reviews(document: dict[str, Any]) -> None:
    if document.get("schema_version") != 1:
        raise ValueError("source review records schema_version must be 1")
    if not document.get("review_policy"):
        raise ValueError("source review records require a review_policy")

    records = document.get("records")
    if not isinstance(records, list) or not records:
        raise ValueError("source review records must be a non-empty list")

    seen: set[str] = set()
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("source review record must be an object")
        source_id = record.get("source_id")
        if not source_id or source_id in seen:
            raise ValueError(f"missing or duplicate source review id: {source_id}")
        seen.add(source_id)
        if source_id not in registered_source_ids():
            raise ValueError(f"source review is not registered: {source_id}")
        if record.get("review_status") not in REVIEW_STATUSES:
            raise ValueError(f"unsupported review status for {source_id}")
        if not isinstance(record.get("reviewed_at"), str) or not record["reviewed_at"].strip():
            raise ValueError(f"source review requires reviewed_at for {source_id}")
        if not isinstance(record.get("rationale"), str) or not record["rationale"].strip():
            raise ValueError(f"source review requires a rationale for {source_id}")

        quality = record.get("quality")
        if not isinstance(quality, dict):
            raise ValueError(f"source review requires quality fields for {source_id}")
        authority_score = quality.get("authority_score")
        if not isinstance(authority_score, int) or not 0 <= authority_score <= 5:
            raise ValueError(f"authority_score must be an integer from 0 to 5 for {source_id}")
        if quality.get("temporal_scope") not in TEMPORAL_SCOPES:
            raise ValueError(f"unsupported temporal_scope for {source_id}")
        regions = quality.get("regions")
        if (
            not isinstance(regions, list)
            or not regions
            or any(region not in REGIONS for region in regions)
        ):
            raise ValueError(f"unsupported or missing regions for {source_id}")
        if quality.get("lineage") not in LINEAGES:
            raise ValueError(f"unsupported lineage for {source_id}")
        if quality.get("extraction_risk") not in EXTRACTION_RISKS:
            raise ValueError(f"unsupported extraction_risk for {source_id}")
        if quality.get("confidence") not in CONFIDENCE_LEVELS:
            raise ValueError(f"unsupported quality confidence for {source_id}")

        usage = record.get("usage")
        if not isinstance(usage, dict) or usage.get("mode") not in USAGE_MODES:
            raise ValueError(f"unsupported usage mode for {source_id}")
        if not isinstance(usage.get("full_text_vectorization"), bool):
            raise ValueError(f"full_text_vectorization must be boolean for {source_id}")
        if usage["full_text_vectorization"] and usage["mode"] not in {
            "full_text",
            "evaluation_only",
        }:
            raise ValueError(
                f"full-text vectorization conflicts with usage mode for {source_id}"
            )
        allowed_query_types = usage.get("allowed_query_types")
        if not isinstance(allowed_query_types, list):
            raise ValueError(f"allowed_query_types must be a list for {source_id}")
        unknown_query_types = set(allowed_query_types) - SUPPORTED_QUERY_TYPES
        if unknown_query_types:
            raise ValueError(
                f"unsupported source-review query types for {source_id}: "
                f"{sorted(unknown_query_types)}"
            )
        if usage["mode"] in {"discovery_only", "quarantine"} and allowed_query_types:
            raise ValueError(f"non-answering source declares query types for {source_id}")
        if usage["mode"] == "historical_only" and set(allowed_query_types) != {"historical"}:
            raise ValueError(f"historical-only source must be limited to historical queries: {source_id}")
        if usage.get("citation_required") is not True:
            raise ValueError(f"every source contribution requires citation: {source_id}")
        quote_limit = usage.get("max_source_quote_words")
        if not isinstance(quote_limit, int) or not 0 <= quote_limit <= 25:
            raise ValueError(f"invalid source quotation limit for {source_id}")

        evidence = record.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            raise ValueError(f"source review requires evidence for {source_id}")
        for item in evidence:
            if not isinstance(item, dict):
                raise ValueError(f"source evidence must be an object for {source_id}")
            if item.get("kind") not in EVIDENCE_KINDS:
                raise ValueError(f"unsupported evidence kind for {source_id}")
            for field in ("reference", "accessed_at", "supports"):
                if not isinstance(item.get(field), str) or not item[field].strip():
                    raise ValueError(f"source evidence requires {field} for {source_id}")

    missing = registered_source_ids() - seen
    extra = seen - registered_source_ids()
    if missing or extra:
        raise ValueError(
            f"source review coverage mismatch: missing={sorted(missing)}, extra={sorted(extra)}"
        )


def source_reviews_by_id() -> dict[str, dict[str, Any]]:
    return {record["source_id"]: record for record in load_source_reviews()["records"]}


def get_source_review(source_id: str) -> dict[str, Any] | None:
    return source_reviews_by_id().get(source_id)


def can_vectorize_full_text(source_id: str) -> bool:
    review = get_source_review(source_id)
    return bool(review and review["usage"]["full_text_vectorization"])


def can_create_knowledge_cards(source_id: str) -> bool:
    review = get_source_review(source_id)
    return bool(review and review["usage"]["mode"] in {"full_text", "knowledge_cards"})


def build_citation_contract(metadata: dict[str, Any] | None) -> dict[str, Any] | None:
    """Return stable public citation fields for a governed source result."""

    source = resolve_source(metadata)
    if not source:
        return None
    review = get_source_review(source["id"])
    if not review:
        return None
    metadata = metadata or {}
    page = metadata.get("page") or metadata.get("page_number")
    metadata_url = str(metadata.get("url") or metadata.get("source") or "")
    public_url = source.get("canonical_url")
    if not public_url and metadata_url.startswith(("https://", "http://")):
        public_url = metadata_url
    return {
        "source_id": source["id"],
        "name": source["name"],
        "url": public_url,
        "page": page,
        "content_role": source["content_role"],
        "region": source["region"],
        "orthography": source["orthography"],
        "temporal_scope": review["quality"]["temporal_scope"],
        "usage_mode": review["usage"]["mode"],
        "authority_score": review["quality"]["authority_score"],
        "citation_required": True,
    }


def build_registered_source_citation(source_id: str, *, page: int | None = None) -> dict[str, Any]:
    """Build a citation contract when a knowledge card already has a source id."""

    source = get_registered_source(source_id)
    review = get_source_review(source_id)
    if not source or not review:
        raise ValueError(f"unknown governed citation source: {source_id}")
    return {
        "source_id": source_id,
        "name": source["name"],
        "url": source.get("canonical_url"),
        "page": page,
        "content_role": source["content_role"],
        "region": source["region"],
        "orthography": source["orthography"],
        "temporal_scope": review["quality"]["temporal_scope"],
        "usage_mode": review["usage"]["mode"],
        "authority_score": review["quality"]["authority_score"],
        "citation_required": True,
    }
