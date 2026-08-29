"""Rights- and role-aware policy for HåfaGPT language references.

The policy intentionally lives outside the vector database so containment takes
effect immediately without destructively rewriting the current collection. A new
corpus can later persist the same fields on every chunk.
"""

from __future__ import annotations

import json
import re
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
    """Load and validate the cached language-source policy registry."""

    with REGISTRY_PATH.open("r", encoding="utf-8") as handle:
        registry = json.load(handle)
    validate_source_registry(registry)
    return registry


def validate_source_registry(registry: dict[str, Any]) -> None:
    """Reject malformed registries and unsafe retrieval or ingestion grants."""

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

        aliases = source.get("query_aliases", [])
        if not isinstance(aliases, list) or not all(
            isinstance(alias, str) and alias.strip() for alias in aliases
        ):
            raise ValueError(f"source {source_id} query_aliases must be non-empty strings")

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

        ingestion = source.get("ingestion")
        if ingestion is not None:
            if not isinstance(ingestion.get("allowed"), bool):
                raise ValueError(f"source {source_id} ingestion.allowed must be boolean")
            allowed_uses = ingestion.get("allowed_uses", [])
            if not isinstance(allowed_uses, list) or not all(
                isinstance(value, str) and value.strip() for value in allowed_uses
            ):
                raise ValueError(f"source {source_id} ingestion.allowed_uses must be non-empty strings")
            if ingestion["allowed"] and (
                not allowed_uses or not ingestion.get("permission_reference")
            ):
                raise ValueError(
                    f"source {source_id} allowed ingestion requires uses and a permission reference"
                )
            if "production_rag" in allowed_uses:
                artifacts = ingestion.get("artifacts")
                if not isinstance(artifacts, list) or not artifacts:
                    raise ValueError(
                        f"source {source_id} production ingestion requires versioned artifacts"
                    )
                for artifact in artifacts:
                    version = artifact.get("version") if isinstance(artifact, dict) else None
                    sha256 = artifact.get("sha256") if isinstance(artifact, dict) else None
                    if not isinstance(version, str) or not version.strip():
                        raise ValueError(
                            f"source {source_id} production artifact requires a version"
                        )
                    if (
                        not isinstance(sha256, str)
                        or len(sha256) != 64
                        or any(
                            character not in "0123456789abcdefABCDEF"
                            for character in sha256
                        )
                    ):
                        raise ValueError(
                            f"source {source_id} production artifact requires a SHA-256"
                        )


def _normalized_metadata(metadata: dict[str, Any] | None) -> tuple[str, str]:
    """Normalize source location and type fields for policy matching."""

    metadata = metadata or {}
    source = str(metadata.get("source") or metadata.get("url") or "").casefold()
    source_type = str(metadata.get("source_type") or "").casefold()
    return source, source_type


def resolve_source(metadata: dict[str, Any] | None) -> dict[str, Any] | None:
    """Resolve chunk metadata to the first matching registered source policy."""

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
    """Return whether a source may answer the requested evidence role."""

    if query_type not in SUPPORTED_QUERY_TYPES:
        return False
    entry = resolve_source(metadata)
    if not entry:
        return False
    retrieval = entry["retrieval"]
    return bool(retrieval["allowed"] and query_type in retrieval["allowed_query_types"])


def source_weight(metadata: dict[str, Any] | None, query_type: str) -> float:
    """Return the registered authority weight for an eligible source and role."""

    if not is_retrieval_allowed(metadata, query_type):
        return 0.0
    entry = resolve_source(metadata)
    return float(entry["retrieval"].get("weight", 1.0))


def _retrieval_match_clauses(
    query_type: str,
    content_roles: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Build deduplicated PGVector clauses for eligible sources and roles."""

    clauses: list[dict[str, Any]] = []
    seen_clauses: set[tuple[str, str, str]] = set()
    if query_type not in SUPPORTED_QUERY_TYPES:
        return clauses

    for entry in load_source_registry()["sources"]:
        retrieval = entry["retrieval"]
        if not retrieval["allowed"] or query_type not in retrieval["allowed_query_types"]:
            continue
        if content_roles is not None and entry["content_role"] not in content_roles:
            continue

        match = entry["match"]
        for pattern in match.get("source_contains", []):
            clause_key = ("source", "$ilike", str(pattern).casefold())
            if clause_key in seen_clauses:
                continue
            seen_clauses.add(clause_key)
            clauses.append({"source": {"$ilike": f"%{pattern}%"}})

        for source_type in match.get("source_types", []):
            clause_key = ("source_type", "$ilike", str(source_type).casefold())
            if clause_key in seen_clauses:
                continue
            seen_clauses.add(clause_key)
            clauses.append({"source_type": {"$ilike": source_type}})
    return clauses


def _combine_retrieval_clauses(clauses: list[dict[str, Any]]) -> dict[str, Any]:
    """Combine clauses while retaining a fail-closed empty-policy sentinel."""

    if not clauses:
        # Never fall back to an unfiltered search for an unsupported or empty
        # policy role. This sentinel cannot match a governed source path.
        return {"source": {"$eq": "internal://hafagpt/no-eligible-source"}}
    if len(clauses) == 1:
        return clauses[0]
    return {"$or": clauses}


def retrieval_metadata_filter(query_type: str) -> dict[str, Any]:
    """Build the PGVector metadata filter for sources eligible for a query role.

    Filtering inside the vector query is a safety and recall requirement. If the
    full corpus is searched first, blocked or role-ineligible chunks can consume
    the nearest-neighbor candidate window before the application policy runs.
    The application still re-checks every returned document with
    :func:`is_retrieval_allowed` so this database filter is never the sole gate.
    """

    return _combine_retrieval_clauses(_retrieval_match_clauses(query_type))


def retrieval_metadata_filter_for_roles(
    query_type: str,
    content_roles: set[str],
) -> dict[str, Any]:
    """Restrict an eligible candidate lane to particular evidence roles."""

    return _combine_retrieval_clauses(
        _retrieval_match_clauses(query_type, content_roles)
    )


def annotate_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    """Attach normalized governance fields to chunk metadata."""

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
    """Return every stable identifier in the source registry."""

    return {entry["id"] for entry in load_source_registry()["sources"]}


def get_registered_source(source_id: str) -> dict[str, Any] | None:
    """Return a registered source policy by stable identifier."""

    return next(
        (entry for entry in load_source_registry()["sources"] if entry["id"] == source_id),
        None,
    )


def sources_explicitly_mentioned(query: str, query_type: str) -> list[dict[str, Any]]:
    """Return eligible registry sources explicitly named in a user's query.

    Semantic nearest-neighbor search can miss a small source family when a much
    larger corpus dominates the candidate pool. Registry aliases enable a narrow
    source-filtered candidate search without granting that source authority for
    an incompatible query role.
    """

    if query_type not in SUPPORTED_QUERY_TYPES:
        return []

    query_text = query.casefold()
    matches: list[dict[str, Any]] = []
    for entry in load_source_registry()["sources"]:
        retrieval = entry["retrieval"]
        if not retrieval["allowed"] or query_type not in retrieval["allowed_query_types"]:
            continue
        for alias in entry.get("query_aliases", []):
            alias_pattern = rf"(?<!\w){re.escape(alias.casefold())}(?!\w)"
            if re.search(alias_pattern, query_text):
                matches.append(entry)
                break
    return matches


class SourceIngestionBlocked(RuntimeError):
    """Raised when a source has not passed the ingestion permission gate."""


def assert_collection_use_allowed(collection_name: str, intended_use: str) -> None:
    """Prevent private evaluation collections from becoming production evidence."""
    if collection_name.startswith("hafagpt_eval_") and intended_use != "model_evaluation":
        raise ValueError(
            "evaluation-only RAG collections require intended_use='model_evaluation'"
        )


def assert_ingestion_allowed(
    metadata: dict[str, Any] | None,
    intended_use: str = "production_rag",
) -> dict[str, Any]:
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
    if intended_use not in ingestion.get("allowed_uses", []):
        raise SourceIngestionBlocked(
            f"Source {entry['id']} is not approved for ingestion use: {intended_use}"
        )
    return annotate_metadata(metadata)
