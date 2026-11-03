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
import unicodedata
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
_ACUTE = re.compile(r"[áéíóú]")
_APOSTROPHES = str.maketrans("", "", "'’ʼ‘")
_ORTHOGRAPHY_PATTERN = re.compile(r"[åÅñÑ]|\w[’']\w*[’']|\w[’']$")


def _ledger_headwords() -> list[str]:
    try:
        ledger = json.loads(_CANONICAL_VOCABULARY.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        ledger = {}
    headwords: list[str] = []
    for entry in ledger.get("entries", []):
        headwords.append(entry.get("canonical_chamorro"))
        headwords.append(entry.get("recommended_teaching_term"))
        for variant in entry.get("variants", []):
            if isinstance(variant, dict):
                headwords.append(variant.get("term"))
    return [headword for headword in headwords if isinstance(headword, str)]


@lru_cache(maxsize=1)
def _all_headwords() -> tuple[str, ...]:
    """Return every local dictionary and ledger headword as written."""

    headwords: list[str] = []
    for filename in _DICTIONARY_FILES:
        path = _API_ROOT / "dictionary_data" / filename
        try:
            entries = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        headwords.extend(headword for headword in entries if isinstance(headword, str))
    return (*headwords, *_ledger_headwords())


def _tokens(headwords) -> frozenset[str]:
    tokens = {
        token
        for headword in headwords
        for token in normalize_chamorro_match_text(headword, repair_ocr_splits=False).split()
    }
    # Digits and single letters say nothing about the language.
    return frozenset(token for token in tokens if len(token) > 1 and token.isalpha())


@lru_cache(maxsize=1)
def chamorro_headword_tokens() -> frozenset[str]:
    """Return normalized tokens of every local dictionary and ledger headword."""

    return _tokens(_all_headwords())


@lru_cache(maxsize=1)
def canonical_ledger_tokens() -> frozenset[str]:
    """Return normalized tokens of the canonical ledger's terms and variants."""

    return _tokens(_ledger_headwords())


@lru_cache(maxsize=1)
def accented_headword_words() -> frozenset[str]:
    """Return headword words that carry an acute accent, as written.

    The dictionaries mark stress with an acute accent in some entries
    ("Kafé", "Kulót"). The words are casefolded and their apostrophes removed.
    """

    words = set()
    for headword in _all_headwords():
        for word in unicodedata.normalize("NFC", headword).casefold().split():
            word = word.strip(".,;:!?()-").translate(_APOSTROPHES)
            if _ACUTE.search(word):
                words.add(word)
    return frozenset(words)


def is_distinctive_chamorro_token(token: str) -> bool:
    """Return whether a normalized token is a headword and not common English."""

    return token in chamorro_headword_tokens() and token not in _COMMON_ENGLISH_WORDS


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
