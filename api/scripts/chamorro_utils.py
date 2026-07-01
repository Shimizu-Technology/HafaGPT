"""Shared text utilities for HåfaGPT language-content scripts."""

from __future__ import annotations

import re
import unicodedata


CHAMORRO_NORMALIZATION_REPLACEMENTS = {
    "å": "a",
    "ñ": "n",
    "'": "",
    "’": "",
    "`": "",
    "´": "",
    "‑": "-",
    "–": "-",
    "—": "-",
}


def normalize_text(value: str) -> str:
    """Normalize Chamorro/English text for fuzzy dictionary/content matching.

    The normalization intentionally strips diacritics and punctuation so audit
    tooling can compare dictionary headwords with app strings that may use
    alternate orthography, ASCII fallbacks, or phrase punctuation.
    """
    value = value.strip().lower()
    for old, new in CHAMORRO_NORMALIZATION_REPLACEMENTS.items():
        value = value.replace(old, new)
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()
