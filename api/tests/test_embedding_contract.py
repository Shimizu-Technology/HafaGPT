import pytest

from src.rag.embedding_contract import (
    OPENAI_EMBEDDING_CONTRACT,
    collection_metadata,
    validate_collection_contract,
)


def test_versioned_collection_requires_exact_ready_contract() -> None:
    validate_collection_contract(
        "hafagpt_governed_openai_v1",
        collection_metadata(OPENAI_EMBEDDING_CONTRACT, status="ready"),
        OPENAI_EMBEDDING_CONTRACT,
    )

    with pytest.raises(RuntimeError, match="contract mismatch"):
        validate_collection_contract(
            "hafagpt_governed_openai_v1",
            None,
            OPENAI_EMBEDDING_CONTRACT,
        )

    with pytest.raises(RuntimeError, match="not marked ready"):
        validate_collection_contract(
            "hafagpt_governed_openai_v1",
            collection_metadata(OPENAI_EMBEDDING_CONTRACT, status="building"),
            OPENAI_EMBEDDING_CONTRACT,
        )


def test_legacy_collection_remains_available_for_rollback() -> None:
    validate_collection_contract("chamorro_grammar", None, OPENAI_EMBEDDING_CONTRACT)
