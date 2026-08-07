"""Rights- and role-aware policy for HåfaGPT language references.

The policy intentionally lives outside the vector database so containment takes
effect immediately without destructively rewriting the current collection. A new
corpus can later persist the same fields on every chunk.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


REGISTRY_PATH = Path(__file__).resolve().parents[2] / "data" / "language_source_registry.json"
SUPPORTED_QUERY_TYPES = {"lookup", "educational", "usage", "cultural", "historical"}
REQUIRED_SOURCE_FIELDS = {
    "id",
    "name",
    "match",
    "content_role",
    "region",
    "orthography",
    "rights_status",
    "review_status",
    "retrieval",
    "decision",
}


@lru_cache(maxsize=1)
def load_source_registry() -> dict[str, Any]:
    with REGISTRY_PATH.open("r", encoding="utf-8") as handle:
        registry = json.load(handle)
    validate_source_registry(registry)
    return registry


def validate_source_registry(registry: dict[str, Any]) -> None:
    if registry.get("schema_version") != 1:
        raise ValueError("language source registry schema_version must be 1")
    if not registry.get("policy_version"):
        raise ValueError("language source registry requires policy_version")

    default_policy = registry.get("default_policy")
    if not isinstance(default_policy, dict) or default_policy.get("retrieval_allowed") is not False:
        raise ValueError("unknown sources must fail closed")

    sources = registry.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError("language source registry requires sources")

    seen_ids: set[str] = set()
    for source in sources:
        missing = REQUIRED_SOURCE_FIELDS - set(source)
        if missing:
            raise ValueError(f"source is missing required fields: {sorted(missing)}")
        source_id = source["id"]
        if source_id in seen_ids:
            raise ValueError(f"duplicate language source id: {source_id}")
        seen_ids.add(source_id)

        match = source["match"]
        if not isinstance(match, dict) or not any(match.get(key) for key in ("source_contains", "source_types")):
            raise ValueError(f"source {source_id} requires at least one match rule")

        retrieval = source["retrieval"]
        if not isinstance(retrieval.get("allowed"), bool):
            raise ValueError(f"source {source_id} retrieval.allowed must be boolean")
        allowed_query_types = set(retrieval.get("allowed_query_types", []))
        unknown_types = allowed_query_types - SUPPORTED_QUERY_TYPES
        if unknown_types:
            raise ValueError(f"source {source_id} has unsupported query types: {sorted(unknown_types)}")
        if retrieval["allowed"] and not allowed_query_types:
            raise ValueError(f"source {source_id} is allowed but has no allowed query types")
        if not retrieval["allowed"] and allowed_query_types:
            raise ValueError(f"source {source_id} is blocked but declares allowed query types")
        weight = retrieval.get("weight")
        if not isinstance(weight, (int, float)) or weight < 0:
            raise ValueError(f"source {source_id} retrieval.weight must be non-negative")
        if retrieval["allowed"] and weight <= 0:
            raise ValueError(f"source {source_id} is allowed but has no retrieval weight")
        if not retrieval["allowed"] and weight != 0:
            raise ValueError(f"source {source_id} is blocked but has a nonzero retrieval weight")


def _normalized_metadata(metadata: dict[str, Any] | None) -> tuple[str, str]:
    metadata = metadata or {}
    source = str(metadata.get("source") or metadata.get("url") or "").casefold()
    source_type = str(metadata.get("source_type") or "").casefold()
    return source, source_type


def resolve_source(metadata: dict[str, Any] | None) -> dict[str, Any] | None:
    source, source_type = _normalized_metadata(metadata)
    for entry in load_source_registry()["sources"]:
        match = entry["match"]
        source_patterns = [str(pattern).casefold() for pattern in match.get("source_contains", [])]
        source_types = [str(value).casefold() for value in match.get("source_types", [])]
        if any(pattern in source for pattern in source_patterns):
            return entry
        if source_type and source_type in source_types:
            return entry
    return None


def is_retrieval_allowed(metadata: dict[str, Any] | None, query_type: str) -> bool:
    if query_type not in SUPPORTED_QUERY_TYPES:
        return False
    entry = resolve_source(metadata)
    if not entry:
        return False
    retrieval = entry["retrieval"]
    return bool(retrieval["allowed"] and query_type in retrieval["allowed_query_types"])


def source_weight(metadata: dict[str, Any] | None, query_type: str) -> float:
    if not is_retrieval_allowed(metadata, query_type):
        return 0.0
    entry = resolve_source(metadata)
    return float(entry["retrieval"].get("weight", 1.0))


def annotate_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    annotated = dict(metadata or {})
    entry = resolve_source(annotated)
    if not entry:
        annotated.update(
            {
                "source_id": "unregistered",
                "content_role": "unregistered",
                "rights_status": "unregistered",
                "source_review_status": "blocked",
            }
        )
        return annotated

    annotated.update(
        {
            "source_id": entry["id"],
            "content_role": entry["content_role"],
            "source_region": entry["region"],
            "source_orthography": entry["orthography"],
            "rights_status": entry["rights_status"],
            "source_review_status": entry["review_status"],
        }
    )
    return annotated


def registered_source_ids() -> set[str]:
    return {entry["id"] for entry in load_source_registry()["sources"]}


def get_registered_source(source_id: str) -> dict[str, Any] | None:
    return next(
        (entry for entry in load_source_registry()["sources"] if entry["id"] == source_id),
        None,
    )


class SourceIngestionBlocked(RuntimeError):
    """Raised when a source has not passed the ingestion permission gate."""


def assert_ingestion_allowed(metadata: dict[str, Any] | None) -> dict[str, Any]:
    """Return governed metadata or stop ingestion until approval is recorded.

    Phase 0 deliberately treats the absence of an explicit ``ingestion.allowed``
    registry field as denied. Source owners and reviewers can later authorize a
    versioned source by adding that field plus ``permission_reference``.
    """

    entry = resolve_source(metadata)
    if not entry:
        raise SourceIngestionBlocked("Unregistered language source; ingestion fails closed")

    ingestion = entry.get("ingestion", {})
    if ingestion.get("allowed") is not True:
        raise SourceIngestionBlocked(
            f"Source {entry['id']} is not approved for ingestion: {entry['decision']}"
        )
    if not ingestion.get("permission_reference"):
        raise SourceIngestionBlocked(
            f"Source {entry['id']} is missing an ingestion permission reference"
        )
    return annotate_metadata(metadata)
