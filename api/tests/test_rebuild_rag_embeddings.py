import pytest

from scripts.rebuild_rag_embeddings import _stable_id, validate_names


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
