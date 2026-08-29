from src.rag.collection_names import (
    DEFAULT_PRODUCTION_COLLECTION_NAME,
    LEGACY_COLLECTION_NAME,
    configured_collection_name,
)


def test_runtime_defaults_to_reviewed_governed_collection(monkeypatch) -> None:
    monkeypatch.delenv("RAG_COLLECTION_NAME", raising=False)

    assert configured_collection_name() == "hafagpt_governed_openai_v3"
    assert DEFAULT_PRODUCTION_COLLECTION_NAME != LEGACY_COLLECTION_NAME


def test_explicit_collection_override_remains_available(monkeypatch) -> None:
    monkeypatch.setenv("RAG_COLLECTION_NAME", "chamorro_grammar")

    assert configured_collection_name() == "chamorro_grammar"
