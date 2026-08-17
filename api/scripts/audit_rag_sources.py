#!/usr/bin/env python3
"""Read-only audit of the current HåfaGPT PGVector language corpus."""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

import psycopg

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from src.rag.source_policy import annotate_metadata, resolve_source


DEFAULT_COLLECTION_NAME = "chamorro_grammar"


def classify_source_counts(rows: Iterable[tuple[str | None, str | None, int]]) -> dict[str, Any]:
    by_source_id: Counter[str] = Counter()
    blocked_chunks = 0
    unregistered_chunks = 0
    unregistered_sources: Counter[str] = Counter()
    policy_details: dict[str, dict[str, Any]] = {}

    for source, source_type, chunks in rows:
        metadata = {"source": source or "", "source_type": source_type or ""}
        policy = resolve_source(metadata)
        annotated = annotate_metadata(metadata)
        retrieval_allowed = bool(policy and policy["retrieval"]["allowed"])
        source_id = annotated["source_id"]
        by_source_id[source_id] += chunks
        if not retrieval_allowed:
            blocked_chunks += chunks
        if source_id == "unregistered":
            unregistered_chunks += chunks
            unregistered_sources[source or "(missing source)"] += chunks
        policy_details[source_id] = {
            "source_id": source_id,
            "content_role": annotated["content_role"],
            "rights_status": annotated["rights_status"],
            "retrieval_allowed": retrieval_allowed,
        }

    details = [
        {**policy_details[source_id], "chunks": chunks}
        for source_id, chunks in by_source_id.items()
    ]

    return {
        "by_source_id": dict(by_source_id.most_common()),
        "blocked_chunks": blocked_chunks,
        "unregistered_chunks": unregistered_chunks,
        "unregistered_examples": [
            {"source": source, "chunks": chunks}
            for source, chunks in unregistered_sources.most_common(20)
        ],
        "sources": sorted(details, key=lambda item: item["chunks"], reverse=True),
    }


def classify_artifact_counts(
    rows: Iterable[
        tuple[str | None, str | None, str | None, str | None, int]
    ],
) -> list[dict[str, Any]]:
    artifacts: Counter[tuple[str, str, str]] = Counter()
    for source, source_type, version, checksum, chunks in rows:
        annotated = annotate_metadata(
            {"source": source or "", "source_type": source_type or ""}
        )
        key = (
            annotated["source_id"],
            str(version or ""),
            str(checksum or "").casefold(),
        )
        artifacts[key] += chunks
    return [
        {
            "source_id": source_id,
            "artifact_version": version or None,
            "artifact_sha256": checksum or None,
            "provenance_complete": bool(version and checksum),
            "chunks": chunks,
        }
        for (source_id, version, checksum), chunks in sorted(artifacts.items())
    ]


def _collection_id(cursor: Any, collection_name: str) -> Any:
    cursor.execute(
        "SELECT uuid FROM langchain_pg_collection WHERE name = %s",
        (collection_name,),
    )
    row = cursor.fetchone()
    if not row:
        raise ValueError(f"RAG collection does not exist: {collection_name}")
    return row[0]


def run_audit(
    database_url: str,
    collection_name: str = DEFAULT_COLLECTION_NAME,
) -> dict[str, Any]:
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            collection_id = _collection_id(cursor, collection_name)
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_rows,
                    COUNT(DISTINCT document) AS unique_documents,
                    COUNT(*) - COUNT(DISTINCT document) AS redundant_exact_rows,
                    COUNT(*) FILTER (WHERE COALESCE(cmetadata->>'source', '') = '') AS missing_source,
                    COUNT(*) FILTER (WHERE COALESCE(cmetadata->>'source_type', '') = '') AS missing_source_type,
                    COUNT(*) FILTER (WHERE COALESCE(cmetadata->>'title', '') = '') AS missing_title,
                    COUNT(*) FILTER (WHERE COALESCE(cmetadata->>'author', '') = '') AS missing_author,
                    COUNT(*) FILTER (WHERE COALESCE(cmetadata->>'date', '') = '') AS missing_date,
                    COUNT(*) FILTER (WHERE COALESCE(cmetadata->>'license', '') = '') AS missing_license,
                    COUNT(*) FILTER (WHERE COALESCE(cmetadata->>'retrieved_at', '') = '') AS missing_retrieved_at
                FROM langchain_pg_embedding
                WHERE collection_id = %s
                """,
                (collection_id,),
            )
            columns = [column.name for column in cursor.description]
            summary = dict(zip(columns, cursor.fetchone()))

            cursor.execute(
                """
                SELECT cmetadata->>'source', cmetadata->>'source_type', COUNT(*)
                FROM langchain_pg_embedding
                WHERE collection_id = %s
                GROUP BY 1, 2
                ORDER BY 3 DESC
                """,
                (collection_id,),
            )
            source_audit = classify_source_counts(cursor.fetchall())

            cursor.execute(
                """
                SELECT
                    cmetadata->>'source',
                    cmetadata->>'source_type',
                    COALESCE(
                        NULLIF(cmetadata->>'artifact_version', ''),
                        NULLIF(cmetadata->>'source_version', ''),
                        NULLIF(cmetadata->>'version', '')
                    ) AS artifact_version,
                    COALESCE(
                        NULLIF(cmetadata->>'artifact_sha256', ''),
                        NULLIF(cmetadata->>'source_sha256', ''),
                        NULLIF(cmetadata->>'checksum', ''),
                        NULLIF(cmetadata->>'file_hash', '')
                    ) AS artifact_sha256,
                    COUNT(*)
                FROM langchain_pg_embedding
                WHERE collection_id = %s
                GROUP BY 1, 2, 3, 4
                ORDER BY 5 DESC
                """,
                (collection_id,),
            )
            source_audit["artifacts"] = classify_artifact_counts(cursor.fetchall())

            cursor.execute(
                """
                SELECT
                    COUNT(*) AS copies,
                    MD5(document) AS document_fingerprint,
                    LENGTH(document) AS document_characters
                FROM langchain_pg_embedding
                WHERE collection_id = %s
                GROUP BY document
                HAVING COUNT(*) > 1
                ORDER BY copies DESC
                LIMIT 10
                """,
                (collection_id,),
            )
            duplicate_samples = [
                {
                    "copies": copies,
                    "document_fingerprint": fingerprint,
                    "document_characters": characters,
                }
                for copies, fingerprint, characters in cursor.fetchall()
            ]

    redundant = summary["redundant_exact_rows"]
    total = summary["total_rows"]
    summary["exact_redundancy_percent"] = round((redundant / total * 100) if total else 0, 2)
    return {
        "collection": {
            "name": collection_name,
            "id": str(collection_id),
        },
        "summary": summary,
        "policy": source_audit,
        "largest_exact_duplicate_groups": duplicate_samples,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument(
        "--collection-name",
        default=os.getenv("RAG_COLLECTION_NAME", DEFAULT_COLLECTION_NAME),
        help="Audit only this PGVector collection (default: RAG_COLLECTION_NAME).",
    )
    parser.add_argument(
        "--enforce-clean-corpus-gates",
        action="store_true",
        help="Exit nonzero until the clean-corpus acceptance gates are met.",
    )
    args = parser.parse_args()
    if not args.database_url:
        parser.error("DATABASE_URL or --database-url is required")

    audit = run_audit(args.database_url, args.collection_name)
    print(json.dumps(audit, ensure_ascii=False, indent=2, default=str))

    if args.enforce_clean_corpus_gates:
        summary = audit["summary"]
        clean = (
            summary["exact_redundancy_percent"] < 1
            and summary["missing_source"] == 0
            and summary["missing_license"] == 0
            and summary["missing_retrieved_at"] == 0
            and audit["policy"]["blocked_chunks"] == 0
            and audit["policy"]["unregistered_chunks"] == 0
        )
        return 0 if clean else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
