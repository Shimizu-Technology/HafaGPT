#!/usr/bin/env python3
"""Build a private, reproducible RAG index from HåfaGPT canonical records."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector


API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from src.rag.source_policy import assert_ingestion_allowed


SOURCE_PATH = API_ROOT / "language_content" / "canonical_vocabulary.json"
DEFAULT_COLLECTION = "hafagpt_eval_canonical_v1"
PARSER_VERSION = "canonical-eval-v1"
REQUIRED_METADATA = {
    "source_id",
    "source",
    "source_type",
    "title",
    "author",
    "publisher",
    "edition",
    "retrieved_at",
    "content_role",
    "region",
    "orthography",
    "rights_status",
    "permission_reference",
    "allowed_uses",
    "review_status",
    "content_sha256",
    "source_sha256",
    "parser_version",
    "chunk_index",
}


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def validate_evaluation_collection_name(collection_name: str) -> None:
    if not collection_name.startswith("hafagpt_eval_"):
        raise ValueError("evaluation collection names must start with hafagpt_eval_")


def build_documents(source_path: Path = SOURCE_PATH) -> list[Document]:
    source_bytes = source_path.read_bytes()
    source_sha = hashlib.sha256(source_bytes).hexdigest()
    source = json.loads(source_bytes)
    created_at = source["metadata"]["created_at"]
    documents: list[Document] = []
    seen_content: set[str] = set()
    for entry in source["entries"]:
        if entry.get("review_status") != "source_backed":
            continue
        variants = [
            variant["term"]
            for variant in entry.get("variants", [])
            if variant.get("status") == "source_backed"
        ]
        citation_labels = [
            f"{citation['source']}:{citation.get('headword', '')}"
            for citation in entry.get("source_citations", [])
        ]
        content = "\n".join(
            line
            for line in (
                f"English: {entry['english']}",
                f"Recommended teaching term: {entry['recommended_teaching_term']}",
                f"Canonical Chamorro: {entry['canonical_chamorro']}",
                f"Part of speech: {entry.get('part_of_speech', 'unspecified')}",
                f"Source-backed variants: {'; '.join(variants)}" if variants else "",
                f"Confidence: {entry['confidence']}",
                f"Citation locators: {'; '.join(citation_labels)}",
            )
            if line
        )
        content_sha = sha256_text(content)
        if content_sha in seen_content:
            continue
        seen_content.add(content_sha)
        raw_metadata = {
            "source": "internal://hafagpt_canonical_evaluation/v1",
            "source_type": "hafagpt_canonical_evaluation",
        }
        governed = assert_ingestion_allowed(raw_metadata, "model_evaluation")
        metadata = {
            **governed,
            "title": entry["id"],
            "author": "HåfaGPT language-resource program",
            "publisher": "Shimizu Technology",
            "edition": "canonical-vocabulary-v1",
            "retrieved_at": created_at,
            "region": governed["source_region"],
            "orthography": governed["source_orthography"],
            "permission_reference": "internal://language-resource-program/canonical-evaluation-v1",
            "allowed_uses": ["model_evaluation"],
            "review_status": entry["review_status"],
            "content_sha256": content_sha,
            "source_sha256": source_sha,
            "parser_version": PARSER_VERSION,
            "chunk_index": len(documents),
        }
        missing = REQUIRED_METADATA - metadata.keys()
        if missing:
            raise ValueError(f"{entry['id']} is missing metadata: {sorted(missing)}")
        documents.append(Document(page_content=content, metadata=metadata))
    return documents


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--openai-api-key", default=os.getenv("OPENAI_API_KEY"))
    parser.add_argument("--collection", default=DEFAULT_COLLECTION)
    parser.add_argument("--plan", action="store_true", help="Validate and report without writing")
    parser.add_argument("--replace", action="store_true", help="Replace only the named evaluation collection")
    args = parser.parse_args()
    validate_evaluation_collection_name(args.collection)
    documents = build_documents()
    report = {
        "collection": args.collection,
        "documents": len(documents),
        "unique_content_sha256": len({doc.metadata["content_sha256"] for doc in documents}),
        "source": str(SOURCE_PATH),
        "intended_use": "model_evaluation",
    }
    print(json.dumps(report, indent=2))
    if args.plan:
        return 0
    if not args.replace:
        parser.error("writing requires --replace so reruns cannot append duplicate documents")
    if not args.database_url or not args.openai_api_key:
        parser.error("DATABASE_URL and OPENAI_API_KEY are required unless --plan is used")

    vectorstore = PGVector(
        embeddings=OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=args.openai_api_key,
            dimensions=384,
        ),
        collection_name=args.collection,
        connection=args.database_url,
        use_jsonb=True,
        embedding_length=384,
    )
    vectorstore.delete_collection()
    vectorstore.create_collection()
    vectorstore.add_documents(documents)
    print(f"Built private evaluation collection {args.collection} with {len(documents)} documents.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
