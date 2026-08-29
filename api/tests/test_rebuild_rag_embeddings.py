import pytest

from scripts import rebuild_rag_embeddings
from scripts.rebuild_rag_embeddings import (
    _stable_id,
    source_snapshot_sha256,
    validate_names,
    validate_resume_snapshot,
)
from src.rag.collection_names import LEGACY_COLLECTION_NAME


def test_rebuild_requires_new_versioned_target() -> None:
    with pytest.raises(ValueError, match="must differ"):
        validate_names("chamorro_grammar", "chamorro_grammar")
    with pytest.raises(ValueError, match="must start"):
        validate_names("chamorro_grammar", "replacement")
    validate_names("chamorro_grammar", "hafagpt_governed_openai_v1")


def test_rebuild_ids_are_deterministic_and_lineage_sensitive() -> None:
    metadata = {"source": "book.pdf", "source_id": "book", "page": 34}
    first = _stable_id("legacy", "same text", metadata)
    assert first == _stable_id("legacy", "same text", metadata)
    assert first == _stable_id("legacy", "same text", {"source": "other.pdf", "source_id": "book", "page": 99})
    assert first != _stable_id("other", "same text", metadata)
    assert first != _stable_id("legacy", "different text", metadata)


def test_source_snapshot_is_order_independent_and_detects_drift() -> None:
    assert source_snapshot_sha256(["a", "b"]) == source_snapshot_sha256(["b", "a"])
    assert source_snapshot_sha256(["a", "b"]) != source_snapshot_sha256(["a", "c"])


def test_resume_rejects_rows_without_matching_source_snapshot() -> None:
    validate_resume_snapshot({"source_snapshot_sha256": "same"}, {"row"}, "same")
    validate_resume_snapshot(None, set(), "new")

    with pytest.raises(RuntimeError, match="different eligible source snapshot"):
        validate_resume_snapshot({"source_snapshot_sha256": "old"}, {"row"}, "new")

    with pytest.raises(RuntimeError, match="different eligible source snapshot"):
        validate_resume_snapshot(None, {"legacy-row"}, "new")


@pytest.mark.parametrize(
    ("configured_source", "expected_source"),
    [(None, LEGACY_COLLECTION_NAME), ("explicit_source", "explicit_source")],
)
def test_rebuild_cli_source_default_and_environment_override(
    monkeypatch,
    configured_source: str | None,
    expected_source: str,
) -> None:
    """Keep legacy fallback and environment override behavior explicit."""

    if configured_source is None:
        monkeypatch.delenv("RAG_COLLECTION_NAME", raising=False)
    else:
        monkeypatch.setenv("RAG_COLLECTION_NAME", configured_source)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    observed: dict[str, str] = {}

    def fake_rebuild(
        _database_url: str,
        source: str,
        _target: str,
        _batch_size: int,
    ) -> dict[str, str]:
        """Capture the parsed source without running an embedding build."""

        observed["source"] = source
        return {"status": "ready"}

    monkeypatch.setattr(rebuild_rag_embeddings, "rebuild", fake_rebuild)
    monkeypatch.setattr(
        rebuild_rag_embeddings.sys,
        "argv",
        [
            "rebuild_rag_embeddings.py",
            "--database-url",
            "postgresql://unused",
            "--target",
            "hafagpt_governed_openai_test",
        ],
    )

    assert rebuild_rag_embeddings.main() == 0
    assert observed["source"] == expected_source
