"""Undirected text is read as Chamorro from local headwords, not diacritics."""

import pytest

from src.rag.language_detection import chamorro_headword_tokens, is_probably_chamorro


@pytest.mark.parametrize(
    "text",
    ["hafa adai", "Håfa adai", "buenas dias", "si yuos maase", "hanom", "guma'", "hu guaiya hao"],
)
def test_plain_and_accented_chamorro_is_detected(text: str) -> None:
    assert is_probably_chamorro(text)


@pytest.mark.parametrize(
    "text",
    [
        "tree",
        "blue",
        "good morning",
        "see you tomorrow at school",
        "hahaha thank you, I'll be over in a bit",
        # Short English words that are also Chamorro headwords.
        "no",
        "at",
        "go to the man",
        "",
    ],
)
def test_english_is_not_mistaken_for_chamorro(text: str) -> None:
    assert not is_probably_chamorro(text)


def test_headword_index_is_built_once_and_normalized() -> None:
    tokens = chamorro_headword_tokens()

    assert tokens is chamorro_headword_tokens()
    assert {"hafa", "adai", "hanom", "guma", "maase"} <= tokens
    assert not any("'" in token or "å" in token for token in tokens)
