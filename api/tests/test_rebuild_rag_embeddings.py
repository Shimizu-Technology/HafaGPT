import pytest

from scripts.rebuild_rag_embeddings import (
    _stable_id,
    source_snapshot_sha256,
    validate_names,
    validate_resume_snapshot,
)


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
