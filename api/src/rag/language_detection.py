"""Decide whether undirected text is more likely Chamorro or English.

Phone keyboards drop å, ñ, and glottal stops, so "hafa adai" carries no
orthographic hint. Instead, each token is compared, diacritic- and
glottal-insensitively, with the headwords of the local dictionaries and the
canonical ledger. The result only steers translation direction; it is never
evidence for an answer.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from src.rag.text_normalization import normalize_chamorro_match_text


_API_ROOT = Path(__file__).resolve().parents[2]
_DICTIONARY_FILES = (
    "chamorro_english_dictionary_TOD.json",
    "chamoru_info_dictionary.json",
    "revised_and_updated_chamorro_dictionary.json",
)
_CANONICAL_VOCABULARY = _API_ROOT / "language_content" / "canonical_vocabulary.json"

# Frequent English words, including short ones that are also Chamorro headwords
# ("a", "at", "in", "to", "he", "no", "be", "man", "put", "take"…). A match here
# counts as English evidence even when the token is also a headword.
_COMMON_ENGLISH_WORDS = frozenset(
    """
    a about above after again all also am an and any are area as at away back be
    because been before being below between book both bring but by can chat come
    could day did do does doing don done dont down due each eat even every few fan
    for from gas get give go going good got had has hat have he her here hers him
    his hit home how i idea if ill im in into is it its just know lean let lets
    lie like little long look love lower made make man many me met more most much
    must my name new next night no nor not now of off ok okay old on once one only
    or other our out over own pan pin please pot put really right said same say see
    she should so some son soon still such sure take tap ten than thank thanks that
    the their them then there these they thing think this those through time to
    today tomorrow too two under until up us very want was way we well went were
    what when where which while who why will with work would yes yet you youre your
    yours
    """.split()
)
_ORTHOGRAPHY_PATTERN = re.compile(r"[åÅñÑ]|\w[’']\w*[’']|\w[’']$")


@lru_cache(maxsize=1)
def chamorro_headword_tokens() -> frozenset[str]:
    """Return normalized tokens of every local dictionary and ledger headword."""

    tokens: set[str] = set()

    def add(value: object) -> None:
        if isinstance(value, str):
            tokens.update(
                normalize_chamorro_match_text(value, repair_ocr_splits=False).split()
            )

    for filename in _DICTIONARY_FILES:
        path = _API_ROOT / "dictionary_data" / filename
        try:
            entries = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for headword in entries:
            add(headword)

    try:
        ledger = json.loads(_CANONICAL_VOCABULARY.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        ledger = {}
    for entry in ledger.get("entries", []):
        add(entry.get("canonical_chamorro"))
        add(entry.get("recommended_teaching_term"))
        for variant in entry.get("variants", []):
            if isinstance(variant, dict):
                add(variant.get("term"))

    # Digits and single letters say nothing about the language.
    return frozenset(token for token in tokens if len(token) > 1 and token.isalpha())


def is_probably_chamorro(text: str) -> bool:
    """Return whether undirected learner text reads as Chamorro.

    Chamorro orthography (å, ñ, a word-internal glottal stop) is decisive. A
    plain-ASCII text counts as Chamorro when at least half of its words are
    Chamorro headwords that are not common English words and they outnumber the
    common English words. The absence of diacritics is never evidence of English.
    """

    if _ORTHOGRAPHY_PATTERN.search(text):
        return True
    tokens = normalize_chamorro_match_text(text, repair_ocr_splits=False).split()
    tokens = [token for token in tokens if token.isalpha()]
    if not tokens:
        return False
    headwords = chamorro_headword_tokens()
    english = sum(token in _COMMON_ENGLISH_WORDS for token in tokens)
    chamorro = sum(
        token in headwords and token not in _COMMON_ENGLISH_WORDS for token in tokens
    )
    return chamorro > english and chamorro * 2 >= len(tokens)
