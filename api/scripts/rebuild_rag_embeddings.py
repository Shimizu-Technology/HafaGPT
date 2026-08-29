#!/usr/bin/env python3
"""Build a versioned OpenAI collection without changing the legacy collection.

This is a compatibility rebuild of the already-held corpus. It copies only
registered chunks that the current runtime policy permits for at least one
query role, exact-deduplicates them, and records the embedding contract on the
target collection. Interrupted builds are resumable; existing rows are never
deleted or overwritten.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any

import psycopg
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from src.rag.embedding_contract import (  # noqa: E402
    OPENAI_EMBEDDING_CONTRACT,
    collection_metadata,
)
from src.rag.collection_names import LEGACY_COLLECTION_NAME  # noqa: E402
from src.rag.source_policy import (  # noqa: E402
    SUPPORTED_QUERY_TYPES,
    annotate_metadata,
    is_retrieval_allowed,
)


TARGET_PREFIX = "hafagpt_governed_"


def validate_names(source: str, target: str) -> None:
    if source == target:
        raise ValueError("target collection must differ from source collection")
    if not target.startswith(TARGET_PREFIX):
        raise ValueError(f"target collection must start with {TARGET_PREFIX}")


def _eligible(metadata: dict[str, Any]) -> bool:
    return any(is_retrieval_allowed(metadata, role) for role in SUPPORTED_QUERY_TYPES)


def _stable_id(source_collection: str, content: str, metadata: dict[str, Any]) -> str:
    identity = json.dumps(
        [source_collection, content, metadata.get("source_id")],
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


def source_snapshot_sha256(ids: list[str]) -> str:
    """Fingerprint the exact eligible source set for safe resumability."""
    digest = hashlib.sha256()
    for item_id in sorted(ids):
        digest.update(item_id.encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def validate_resume_snapshot(
    prior_metadata: dict[str, Any] | None,
    prior_ids: set[str],
    source_snapshot: str,
) -> None:
    """Refuse to mix rows from two eligible source snapshots."""
    if prior_ids and (prior_metadata or {}).get("source_snapshot_sha256") != source_snapshot:
        raise RuntimeError(
            "target collection was built from a different eligible source snapshot; "
            "leave it untouched and choose a new versioned target name"
        )


def load_documents(database_url: str, source_collection: str) -> tuple[list[Document], list[str]]:
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT ON (md5(embedding.document), embedding.cmetadata->>'source')
                       embedding.document, embedding.cmetadata
                FROM langchain_pg_embedding AS embedding
                JOIN langchain_pg_collection AS collection
                  ON collection.uuid = embedding.collection_id
                WHERE collection.name = %s
                ORDER BY md5(embedding.document), embedding.cmetadata->>'source',
                         COALESCE(embedding.cmetadata->>'page', '')
                """,
                (source_collection,),
            )
            rows = cursor.fetchall()

    documents: list[Document] = []
    ids: list[str] = []
    seen_lineage: set[tuple[str, str]] = set()
    for content, raw_metadata in rows:
        metadata = dict(raw_metadata or {})
        if not _eligible(metadata):
            continue
        metadata = annotate_metadata(metadata)
        lineage_key = (content, str(metadata["source_id"]))
        if lineage_key in seen_lineage:
            continue
        seen_lineage.add(lineage_key)
        metadata["embedding_migrated_from"] = source_collection
        documents.append(Document(page_content=content, metadata=metadata))
        ids.append(_stable_id(source_collection, content, metadata))
    return documents, ids


def existing_ids(database_url: str, target_collection: str) -> set[str]:
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT embedding.id
                FROM langchain_pg_embedding AS embedding
                JOIN langchain_pg_collection AS collection
                  ON collection.uuid = embedding.collection_id
                WHERE collection.name = %s
                """,
                (target_collection,),
            )
            return {str(row[0]) for row in cursor.fetchall() if row[0]}


def target_metadata(database_url: str, target_collection: str) -> dict[str, Any] | None:
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT cmetadata FROM langchain_pg_collection WHERE name = %s",
                (target_collection,),
            )
            row = cursor.fetchone()
    return dict(row[0] or {}) if row else None


def update_status(
    database_url: str,
    target: str,
    status: str,
    count: int,
    source_snapshot: str,
) -> None:
    metadata = collection_metadata(OPENAI_EMBEDDING_CONTRACT, status=status)
    metadata["document_count"] = count
    metadata["source_snapshot_sha256"] = source_snapshot
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE langchain_pg_collection SET cmetadata = %s WHERE name = %s",
                (json.dumps(metadata), target),
            )


def rebuild(database_url: str, source: str, target: str, batch_size: int) -> dict[str, int | str]:
    validate_names(source, target)
    documents, ids = load_documents(database_url, source)
    expected_ids = set(ids)
    source_snapshot = source_snapshot_sha256(ids)
    prior_metadata = target_metadata(database_url, target)
    prior_ids = existing_ids(database_url, target) if prior_metadata is not None else set()
    validate_resume_snapshot(prior_metadata, prior_ids, source_snapshot)

    embeddings = OpenAIEmbeddings(
        model=OPENAI_EMBEDDING_CONTRACT["model"],
        dimensions=OPENAI_EMBEDDING_CONTRACT["dimensions"],
        openai_api_key=os.environ.get("OPENAI_API_KEY"),
    )
    vectorstore = PGVector(
        embeddings=embeddings,
        collection_name=target,
        collection_metadata={
            **collection_metadata(OPENAI_EMBEDDING_CONTRACT, status="building"),
            "source_snapshot_sha256": source_snapshot,
            "document_count": len(prior_ids),
        },
        connection=database_url,
        use_jsonb=True,
        embedding_length=OPENAI_EMBEDDING_CONTRACT["dimensions"],
        pre_delete_collection=False,
    )
    already_present = existing_ids(database_url, target)
    if not already_present:
        update_status(database_url, target, "building", 0, source_snapshot)
    pending = [(document, item_id) for document, item_id in zip(documents, ids) if item_id not in already_present]

    for offset in range(0, len(pending), batch_size):
        batch = pending[offset : offset + batch_size]
        vectorstore.add_documents(
            [document for document, _item_id in batch],
            ids=[item_id for _document, item_id in batch],
        )
        print(f"embedded {min(offset + len(batch), len(pending))}/{len(pending)} pending chunks", flush=True)

    completed_ids = existing_ids(database_url, target)
    missing_ids = expected_ids - completed_ids
    stale_ids = completed_ids - expected_ids
    if missing_ids or stale_ids:
        raise RuntimeError(
            "target verification failed: "
            f"missing={len(missing_ids)}, stale={len(stale_ids)}; "
            "leave this target untouched and choose a new versioned name if the source changed"
        )
    total = len(completed_ids)
    update_status(database_url, target, "ready", total, source_snapshot)
    return {
        "source_collection": source,
        "target_collection": target,
        "eligible_unique_chunks": len(documents),
        "previously_completed_chunks": len(already_present),
        "new_chunks": len(pending),
        "status": "ready",
        "source_snapshot_sha256": source_snapshot,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    parser.add_argument(
        "--source",
        default=os.environ.get("RAG_COLLECTION_NAME", LEGACY_COLLECTION_NAME),
    )
    parser.add_argument("--target", required=True)
    parser.add_argument("--batch-size", type=int, default=100)
    args = parser.parse_args()
    if not args.database_url:
        parser.error("DATABASE_URL or --database-url is required")
    if not os.environ.get("OPENAI_API_KEY"):
        parser.error("OPENAI_API_KEY is required")
    if args.batch_size < 1 or args.batch_size > 500:
        parser.error("--batch-size must be between 1 and 500")
    print(json.dumps(rebuild(args.database_url, args.source, args.target, args.batch_size), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
