"""Validation helpers for the language-source outreach and permission ledger."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


PERMISSION_RECORDS_PATH = Path(__file__).resolve().parents[2] / "data" / "source_permission_records.json"
ALLOWED_STATUSES = {
    "not_requested",
    "not_pursued",
    "requested",
    "provenance_unresolved",
    "public_domain_review_required",
    "denied",
    "expired",
    "granted",
}


@lru_cache(maxsize=1)
def load_permission_records() -> dict[str, Any]:
    with PERMISSION_RECORDS_PATH.open(encoding="utf-8") as handle:
        document = json.load(handle)
    validate_permission_records(document)
    return document


def validate_permission_records(document: dict[str, Any]) -> None:
    if document.get("schema_version") != 1:
        raise ValueError("permission records schema_version must be 1")
    records = document.get("records")
    if not isinstance(records, list):
        raise ValueError("permission records must be a list")
    seen: set[str] = set()
    for record in records:
        source_id = record.get("source_id")
        if not source_id or source_id in seen:
            raise ValueError(f"missing or duplicate permission source_id: {source_id}")
        seen.add(source_id)
        if record.get("status") not in ALLOWED_STATUSES:
            raise ValueError(f"unsupported permission status for {source_id}")
        if not isinstance(record.get("requested_uses"), list):
            raise ValueError(f"requested_uses must be a list for {source_id}")
        if record["status"] == "granted" and not record.get("evidence_reference"):
            raise ValueError(f"granted permission requires evidence for {source_id}")
        approved_artifacts = record.get("approved_artifacts", [])
        if not isinstance(approved_artifacts, list):
            raise ValueError(f"approved_artifacts must be a list for {source_id}")
        if record["status"] == "granted" and not approved_artifacts:
            raise ValueError(
                f"granted permission requires versioned approved_artifacts for {source_id}"
            )
        for artifact in approved_artifacts:
            if not isinstance(artifact, dict):
                raise ValueError(f"approved artifact must be an object for {source_id}")
            version = artifact.get("version")
            sha256 = artifact.get("sha256")
            if not isinstance(version, str) or not version.strip():
                raise ValueError(f"approved artifact requires a version for {source_id}")
            if (
                not isinstance(sha256, str)
                or len(sha256) != 64
                or any(character not in "0123456789abcdefABCDEF" for character in sha256)
            ):
                raise ValueError(f"approved artifact requires a SHA-256 for {source_id}")


def permission_records_by_source() -> dict[str, dict[str, Any]]:
    return {record["source_id"]: record for record in load_permission_records()["records"]}
