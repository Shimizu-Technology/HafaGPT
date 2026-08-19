"""Versioned embedding contracts for PGVector collections."""

from __future__ import annotations

from typing import Any


OPENAI_EMBEDDING_CONTRACT = {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 384,
    "distance_strategy": "cosine",
}
LEGACY_HUGGINGFACE_EMBEDDING_CONTRACT = {
    "provider": "huggingface",
    "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "dimensions": 384,
    "distance_strategy": "cosine",
}
CONTRACT_METADATA_KEY = "hafagpt_embedding_contract"


def runtime_embedding_contract(mode: str) -> dict[str, Any]:
    if mode.casefold() == "local":
        return dict(LEGACY_HUGGINGFACE_EMBEDDING_CONTRACT)
    return dict(OPENAI_EMBEDDING_CONTRACT)


def collection_metadata(contract: dict[str, Any], *, status: str) -> dict[str, Any]:
    return {
        CONTRACT_METADATA_KEY: contract,
        "hafagpt_collection_status": status,
    }


def validate_collection_contract(
    collection_name: str,
    metadata: dict[str, Any] | None,
    expected: dict[str, Any],
    *,
    require_ready: bool = True,
) -> None:
    """Reject a versioned collection built in a different vector space."""

    if not collection_name.startswith("hafagpt_governed_"):
        return
    actual = (metadata or {}).get(CONTRACT_METADATA_KEY)
    if actual != expected:
        raise RuntimeError(
            f"RAG collection {collection_name!r} embedding contract mismatch: "
            f"expected {expected!r}, found {actual!r}"
        )
    if require_ready and (metadata or {}).get("hafagpt_collection_status") != "ready":
        raise RuntimeError(f"RAG collection {collection_name!r} is not marked ready")
