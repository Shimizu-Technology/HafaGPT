#!/usr/bin/env python3
"""Report which language sources are genuinely cleared for production ingestion."""

from __future__ import annotations

import argparse
from typing import Any

from src.rag.permission_records import permission_records_by_source
from src.rag.source_policy import load_source_registry


def _artifact_keys(artifacts: Any) -> set[tuple[str, str]]:
    if not isinstance(artifacts, list):
        return set()
    keys: set[tuple[str, str]] = set()
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            continue
        version = str(artifact.get("version") or "").strip()
        sha256 = str(artifact.get("sha256") or "").strip().casefold()
        if version and len(sha256) == 64:
            keys.add((version, sha256))
    return keys


def production_readiness_rows() -> list[dict[str, Any]]:
    permissions = permission_records_by_source()
    rows: list[dict[str, Any]] = []
    for source in load_source_registry()["sources"]:
        if source["id"].startswith("hafagpt_") or source["review_status"] == "quarantined":
            continue
        ingestion = source.get("ingestion", {})
        permission = permissions.get(source["id"], {})
        allowed_uses = ingestion.get("allowed_uses", [])
        registry_artifacts = _artifact_keys(ingestion.get("artifacts"))
        permission_artifacts = _artifact_keys(permission.get("approved_artifacts"))
        approved_artifacts = sorted(registry_artifacts & permission_artifacts)
        ready = bool(
            ingestion.get("allowed")
            and "production_rag" in allowed_uses
            and ingestion.get("permission_reference")
            and permission.get("status") == "granted"
            and permission.get("evidence_reference")
            and ingestion.get("permission_reference") == permission.get("evidence_reference")
            and approved_artifacts
        )
        rows.append({
            "source_id": source["id"],
            "ready": ready,
            "permission_status": permission.get("status", "missing"),
            "review_status": source["review_status"],
            "approved_artifacts": [
                {"version": version, "sha256": sha256}
                for version, sha256 in approved_artifacts
            ],
        })
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--require-ready",
        action="store_true",
        help="Exit unsuccessfully when no source is fully cleared for production RAG.",
    )
    args = parser.parse_args()
    rows = production_readiness_rows()
    ready = [row for row in rows if row["ready"]]
    print(f"Production-cleared sources: {len(ready)}/{len(rows)}")
    for row in rows:
        marker = "READY" if row["ready"] else "BLOCKED"
        print(
            f"{marker:7} {row['source_id']}: permission={row['permission_status']}, "
            f"review={row['review_status']}"
        )
    return 1 if args.require_ready and not ready else 0


if __name__ == "__main__":
    raise SystemExit(main())
