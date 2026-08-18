"""Lightweight normalization for deterministic Chamorro reference matching."""

from __future__ import annotations

import re
import unicodedata


_APOSTROPHE_LIKE = str.maketrans(
    {
        "'": "",
        "’": "",
        "‘": "",
        "ʼ": "",
        "ʻ": "",
        "ʹ": "",
        "ꞌ": "",
        "`": "",
        "´": "",
    }
)
_OCR_SPLIT_REPAIRS = (
    (re.compile(r"\bm\s+s\s+y\b"), "msy"),
    (re.compile(r"\bs\s+y\s+m\b"), "sym"),
    (re.compile(r"\byu\s+os\b"), "yuos"),
    (re.compile(r"\bma\s+ase\b"), "maase"),
    (re.compile(r"\bpa\s+go\b"), "pago"),
    (re.compile(r"\bta\s+ya\b"), "taya"),
)


def normalize_chamorro_match_text(value: str, *, repair_ocr_splits: bool = True) -> str:
    """Return an ASCII lookup key tolerant of phone and OCR spelling loss.

    This key is only for retrieval and governed-card selection. It must never be
    shown as a corrected transcription or used to overwrite source text.
    """

    decomposed = unicodedata.normalize("NFKD", (value or "").casefold())
    without_diacritics = "".join(
        character
        for character in decomposed
        if unicodedata.category(character) != "Mn"
    )
    without_apostrophes = without_diacritics.translate(_APOSTROPHE_LIKE)
    normalized = " ".join(
        re.sub(r"[^a-z0-9]+", " ", without_apostrophes).split()
    )
    if repair_ocr_splits:
        for pattern, replacement in _OCR_SPLIT_REPAIRS:
            normalized = pattern.sub(replacement, normalized)
    return normalized
