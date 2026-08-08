import pytest

from scripts.build_evaluation_corpus import (
    REQUIRED_METADATA,
    build_documents,
    validate_evaluation_collection_name,
)


def test_evaluation_corpus_is_unique_complete_and_private() -> None:
    documents = build_documents()

    assert len(documents) == 101
    assert len({document.metadata["content_sha256"] for document in documents}) == len(documents)
    assert all(REQUIRED_METADATA <= document.metadata.keys() for document in documents)
    assert all(document.metadata["allowed_uses"] == ["model_evaluation"] for document in documents)
    assert all("evidence" not in document.page_content.casefold() for document in documents)


def test_evaluation_builder_refuses_production_collection_names() -> None:
    with pytest.raises(ValueError, match="hafagpt_eval_"):
        validate_evaluation_collection_name("chamorro_grammar")

    validate_evaluation_collection_name("hafagpt_eval_canonical_v1")
