from src.rag.chamorro_rag import (
    _chamorro_keyword_query_params,
    _english_keyword_query_params,
)


def test_chamorro_keyword_collection_parameter_follows_ranking_patterns() -> None:
    params = _chamorro_keyword_query_params("hanom", "collection-v1", 3)

    assert params[3] == "collection-v1"
    assert params[-1] == 6


def test_english_keyword_collection_parameter_follows_four_ranking_patterns() -> None:
    params = _english_keyword_query_params("water", "collection-v1", 3)

    assert params[4] == "collection-v1"
    assert params[-1] == 9
