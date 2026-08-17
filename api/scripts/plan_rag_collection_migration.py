#!/usr/bin/env python3
"""Create a read-only, fail-closed plan for a new governed RAG collection.

This command never creates, updates, copies, or deletes database rows. It is a
preflight for a future versioned migration after source permissions are ready.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import psycopg

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from scripts.audit_rag_sources import DEFAULT_COLLECTION_NAME, run_audit
from scripts.check_production_corpus_readiness import production_readiness_rows


GOVERNED_COLLECTION_PREFIX = "hafagpt_governed_"


def validate_target_collection(source_collection: str, target_collection: str) -> None:
    if target_collection == source_collection:
        raise ValueError("target collection must differ from the source collection")
    if not target_collection.startswith(GOVERNED_COLLECTION_PREFIX):
        raise ValueError(
            f"target collection must start with {GOVERNED_COLLECTION_PREFIX}"
        )


def collection_exists(database_url: str, collection_name: str) -> bool:
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS(SELECT 1 FROM langchain_pg_collection WHERE name = %s)",
                (collection_name,),
            )
            return bool(cursor.fetchone()[0])


def build_migration_plan(
    audit: dict[str, Any],
    target_collection: str,
    readiness_rows: list[dict[str, Any]],
    target_exists: bool,
) -> dict[str, Any]:
    readiness = {str(row["source_id"]): row for row in readiness_rows}
    present_source_ids = set(audit["policy"]["by_source_id"])
    approved_keys = {
        source_id: {
            (
                str(artifact.get("version") or ""),
                str(artifact.get("sha256") or "").casefold(),
            )
            for artifact in row.get("approved_artifacts", [])
            if isinstance(artifact, dict)
        }
        for source_id, row in readiness.items()
        if row.get("ready") is True
    }
    eligible_artifacts: list[dict[str, Any]] = []
    held_artifacts: list[dict[str, Any]] = []
    for artifact in audit["policy"].get("artifacts", []):
        source_id = str(artifact["source_id"])
        version = str(artifact.get("artifact_version") or "")
        sha256 = str(artifact.get("artifact_sha256") or "").casefold()
        summary = {
            "source_id": source_id,
            "artifact_version": version or None,
            "artifact_sha256": sha256 or None,
            "chunks": artifact["chunks"],
        }
        if version and sha256 and (version, sha256) in approved_keys.get(source_id, set()):
            eligible_artifacts.append(summary)
        else:
            held_artifacts.append(summary)

    ready_source_ids = sorted({item["source_id"] for item in eligible_artifacts})
    held_source_ids = sorted(
        {item["source_id"] for item in held_artifacts}
        | (present_source_ids - set(ready_source_ids))
    )

    blockers: list[str] = []
    if target_exists:
        blockers.append("target collection already exists; this planner never overwrites it")
    if audit["policy"]["unregistered_chunks"]:
        blockers.append("source collection still contains unregistered chunks")
    if not eligible_artifacts:
        blockers.append(
            "no held artifact version and SHA-256 match a production ingestion grant"
        )

    return {
        "mode": "read_only_preflight",
        "source_collection": audit["collection"]["name"],
        "target_collection": target_collection,
        "target_exists": target_exists,
        "can_build": not blockers,
        "blockers": blockers,
        "inventory": {
            "total_chunks": audit["summary"]["total_rows"],
            "unique_documents": audit["summary"]["unique_documents"],
            "redundant_exact_rows": audit["summary"]["redundant_exact_rows"],
            "exact_redundancy_percent": audit["summary"]["exact_redundancy_percent"],
            "blocked_chunks": audit["policy"]["blocked_chunks"],
            "unregistered_chunks": audit["policy"]["unregistered_chunks"],
        },
        "eligible_source_ids": ready_source_ids,
        "eligible_artifacts": eligible_artifacts,
        "held_not_reingested_source_ids": held_source_ids,
        "held_not_reingested_artifacts": held_artifacts,
        "preservation": {
            "source_collection_unchanged": True,
            "delete_operations": 0,
            "overwrite_operations": 0,
            "note": (
                "Held sources remain in the legacy collection and recovery branch; "
                "being excluded from a new build does not discard them."
            ),
        },
        "future_build_sequence": [
            "create a brand-new versioned target collection",
            "copy only permission-cleared source versions with complete provenance",
            "normalize metadata while retaining source lineage and regional labels",
            "deduplicate exact chunks within the same source/version lineage",
            "run retrieval and answer-quality benchmarks against both collections",
            "switch RAG_COLLECTION_NAME only after review and keep the old collection for rollback",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument(
        "--source-collection",
        default=os.getenv("RAG_COLLECTION_NAME", DEFAULT_COLLECTION_NAME),
    )
    parser.add_argument("--target-collection", required=True)
    parser.add_argument(
        "--require-actionable",
        action="store_true",
        help="Exit nonzero if rights, registration, or target-safety blockers remain.",
    )
    args = parser.parse_args()
    if not args.database_url:
        parser.error("DATABASE_URL or --database-url is required")

    validate_target_collection(args.source_collection, args.target_collection)
    audit = run_audit(args.database_url, args.source_collection)
    plan = build_migration_plan(
        audit,
        args.target_collection,
        production_readiness_rows(),
        collection_exists(args.database_url, args.target_collection),
    )
    print(json.dumps(plan, ensure_ascii=False, indent=2, default=str))
    return 1 if args.require_actionable and not plan["can_build"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
