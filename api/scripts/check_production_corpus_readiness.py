#!/usr/bin/env python3
"""Report which language sources are genuinely cleared for production ingestion."""

from __future__ import annotations

import argparse

from src.rag.permission_records import permission_records_by_source
from src.rag.source_policy import load_source_registry


def production_readiness_rows() -> list[dict[str, str | bool]]:
    permissions = permission_records_by_source()
    rows: list[dict[str, str | bool]] = []
    for source in load_source_registry()["sources"]:
        if source["id"].startswith("hafagpt_") or source["review_status"] == "quarantined":
            continue
        ingestion = source.get("ingestion", {})
        permission = permissions.get(source["id"], {})
        allowed_uses = ingestion.get("allowed_uses", [])
        ready = bool(
            ingestion.get("allowed")
            and "production_rag" in allowed_uses
            and ingestion.get("permission_reference")
            and permission.get("status") == "granted"
            and permission.get("evidence_reference")
        )
        rows.append({
            "source_id": source["id"],
            "ready": ready,
            "permission_status": permission.get("status", "missing"),
            "review_status": source["review_status"],
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
