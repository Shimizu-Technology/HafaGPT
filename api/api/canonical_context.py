"""Small, deterministic canonical-vocabulary context for tutor requests."""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

from src.rag.source_policy import resolve_source
from src.rag.source_reviews import build_registered_source_citation
from src.rag.text_normalization import normalize_chamorro_match_text
from src.rag.translation_policy import (
    extract_translation_retrieval_payload,
    is_passage_translation,
)


CANONICAL_VOCABULARY_PATH = (
    Path(__file__).resolve().parents[1]
    / "language_content"
    / "canonical_vocabulary.json"
)
DICTIONARY_DATA_PATH = Path(__file__).resolve().parents[1] / "dictionary_data"
EXACT_DICTIONARY_FILES = (
    ("chamoru_info_dictionary.json", "Chamoru.info dictionary"),
    ("chamorro_english_dictionary_TOD.json", "Topping, Ogo, and Dungca dictionary"),
    (
        "revised_and_updated_chamorro_dictionary.json",
        "Revised and updated Chamorro dictionary",
    ),
)
MAX_CANONICAL_MATCHES = 8
MAX_PASSAGE_DICTIONARY_MATCHES = 8
_PASSAGE_WORD_PATTERN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žÅåÑñ'’\-]+")


def _normalize_for_match(value: str) -> str:
    return normalize_chamorro_match_text(value)


def _normalize_exact_headword(value: str) -> str:
    apostrophe_normalized = (
        (value or "")
        .casefold()
        .replace("’", "'")
        .replace("‘", "'")
        .replace("ʼ", "'")
        .replace("ʻ", "'")
        .replace("`", "'")
    )
    composed = unicodedata.normalize("NFC", apostrophe_normalized)
    return " ".join(re.sub(r"[^\w'-]+", " ", composed).split())


@lru_cache(maxsize=1)
def _canonical_entries() -> tuple[dict, ...]:
    payload = json.loads(CANONICAL_VOCABULARY_PATH.read_text(encoding="utf-8"))
    return tuple(payload.get("entries", []))


@lru_cache(maxsize=1)
def _exact_dictionary_data() -> tuple[tuple[str, dict], ...]:
    dictionaries = []
    for filename, display_name in EXACT_DICTIONARY_FILES:
        path = DICTIONARY_DATA_PATH / filename
        if path.exists():
            dictionaries.append(
                (display_name, json.loads(path.read_text(encoding="utf-8")))
            )
    return tuple(dictionaries)


def _extract_requested_headword(user_input: str) -> str:
    if not re.search(r"\b(what does|what is|define|meaning|in english)\b", user_input, re.I):
        return ""
    for pattern in (
        r'"([^"]+)"',
        r"'([^']+)'",
        r"[“”]([^“”]+)[“”]",
        r"[‘’]([^‘’]+)[‘’]",
    ):
        match = re.search(pattern, user_input)
        if match:
            return match.group(1).strip()
    match = re.search(r"what does\s+([^\s?,]+)\s+mean", user_input, re.I)
    return match.group(1).strip() if match else ""


def _lookup_exact_dictionary_entries(headword: str) -> list[tuple[str, str, object]]:
    normalized_headword = _normalize_exact_headword(headword)
    if not normalized_headword:
        return []
    matches = []
    for display_name, dictionary in _exact_dictionary_data():
        for entry_headword, definition in dictionary.items():
            if _normalize_exact_headword(entry_headword) == normalized_headword:
                matches.append((display_name, entry_headword, definition))
                break
    return matches


@lru_cache(maxsize=1)
def _exact_dictionary_index() -> dict[str, tuple[tuple[str, str, object], ...]]:
    """Index governed local dictionaries once for deterministic passage evidence."""

    index: dict[str, list[tuple[str, str, object]]] = {}
    for display_name, dictionary in _exact_dictionary_data():
        for entry_headword, definition in dictionary.items():
            normalized = _normalize_exact_headword(entry_headword)
            if normalized:
                index.setdefault(normalized, []).append(
                    (display_name, entry_headword, definition)
                )
    return {key: tuple(values) for key, values in index.items()}


@lru_cache(maxsize=1)
def _near_dictionary_headword_index() -> dict[tuple[str, int], tuple[str, ...]]:
    """Bucket single-word headwords so OCR-near lookup stays bounded."""

    buckets: dict[tuple[str, int], list[str]] = {}
    for headword in _exact_dictionary_index():
        if " " in headword or len(headword) < 4:
            continue
        buckets.setdefault((headword[:2], len(headword)), []).append(headword)
    return {key: tuple(values) for key, values in buckets.items()}


def _edit_distance_at_most_one(left: str, right: str) -> bool:
    """Return true for one substitution, insertion, or deletion at most."""

    if left == right:
        return True
    if abs(len(left) - len(right)) > 1:
        return False
    if len(left) > len(right):
        left, right = right, left
    if len(left) == len(right):
        return sum(a != b for a, b in zip(left, right, strict=True)) == 1
    left_index = right_index = differences = 0
    while left_index < len(left) and right_index < len(right):
        if left[left_index] == right[right_index]:
            left_index += 1
            right_index += 1
            continue
        differences += 1
        if differences > 1:
            return False
        right_index += 1
    return True


def _passage_dictionary_matches(
    user_input: str,
) -> list[tuple[str, str, str, object, bool]]:
    """Find exact and conservative near matches for a translation passage.

    The boolean marks a one-edit OCR/spelling candidate. These matches are prompt
    evidence only and never rewrite the user's or image's supplied text.
    """

    if not is_passage_translation(user_input):
        return []
    payload = extract_translation_retrieval_payload(user_input)
    if not payload:
        return []

    raw_words = _PASSAGE_WORD_PATTERN.findall(payload)
    normalized_words = [_normalize_exact_headword(word) for word in raw_words]
    index = _exact_dictionary_index()
    candidates: list[tuple[int, int, int, str, str, bool]] = []
    for width in range(min(4, len(normalized_words)), 0, -1):
        for position in range(len(normalized_words) - width + 1):
            normalized_phrase = " ".join(normalized_words[position:position + width])
            if len(normalized_phrase.replace(" ", "")) < 4:
                continue
            if normalized_phrase in index:
                candidates.append(
                    (
                        width,
                        len(normalized_phrase),
                        position,
                        normalized_phrase,
                        normalized_phrase,
                        False,
                    )
                )

    exact_single_words = {
        candidate[3] for candidate in candidates if candidate[0] == 1
    }
    near_index = _near_dictionary_headword_index()
    for position, observed in enumerate(normalized_words):
        if len(observed) < 5 or observed in exact_single_words:
            continue
        bucket_candidates = (
            headword
            for candidate_length in range(
                max(4, len(observed) - 1),
                len(observed) + 2,
            )
            for headword in near_index.get((observed[:2], candidate_length), ())
        )
        near_headwords = [
            headword
            for headword in bucket_candidates
            if _edit_distance_at_most_one(observed, headword)
        ]
        for headword in near_headwords[:3]:
            candidates.append((1, len(headword), position, observed, headword, True))

    candidates.sort(key=lambda item: (-item[0], -item[1], item[2], item[4]))
    matches: list[tuple[str, str, str, object, bool]] = []
    seen_headwords: set[str] = set()
    for _width, _length, _position, observed, headword, near_match in candidates:
        if headword in seen_headwords:
            continue
        seen_headwords.add(headword)
        # One governed definition per passage headword keeps the prompt compact;
        # exact single-word lookups still return all eligible dictionary sources.
        for display_name, entry_headword, definition in index[headword][:1]:
            matches.append(
                (observed, display_name, entry_headword, definition, near_match)
            )
        if len(seen_headwords) >= MAX_PASSAGE_DICTIONARY_MATCHES:
            break
    return matches


def _format_dictionary_definition(definition: object) -> str:
    if isinstance(definition, str):
        return definition.strip()
    if not isinstance(definition, dict):
        return str(definition)
    for key in ("Definition", "definition", "df", "meaning"):
        value = definition.get(key)
        if value:
            return str(value).strip()
    return json.dumps(definition, ensure_ascii=False)[:1000]


def _phrase_matches(normalized_input: str, phrase: str | None) -> bool:
    normalized_phrase = _normalize_for_match(phrase or "")
    if len(normalized_phrase) < 4:
        return False
    return f" {normalized_phrase} " in f" {normalized_input} "


def get_canonical_tutor_context(user_input: str) -> tuple[str, list[object]]:
    """Return exact curriculum matches before semantic RAG material.

    This is intentionally a lexical bridge, not a replacement for retrieval. It
    prevents a semantically similar legacy chunk from overriding an exact,
    governed beginner term that already exists in HåfaGPT's canonical ledger.
    """

    normalized_input = _normalize_for_match(user_input)
    if not normalized_input:
        return "", []

    matches = []
    for entry in _canonical_entries():
        candidate_phrases = [
            entry.get("english"),
            entry.get("canonical_chamorro"),
            entry.get("recommended_teaching_term"),
        ]
        candidate_phrases.extend(
            variant.get("term")
            for variant in entry.get("variants") or []
            if isinstance(variant, dict)
        )
        candidate_phrases.extend(
            citation.get("headword")
            for citation in entry.get("source_citations") or []
            if isinstance(citation, dict)
        )
        if any(_phrase_matches(normalized_input, phrase) for phrase in candidate_phrases):
            matches.append(entry)
        if len(matches) >= MAX_CANONICAL_MATCHES:
            break

    requested_headword = _extract_requested_headword(user_input)
    dictionary_matches = _lookup_exact_dictionary_entries(requested_headword)
    passage_dictionary_matches = _passage_dictionary_matches(user_input)

    if not matches and not dictionary_matches and not passage_dictionary_matches:
        return "", []

    lines = [
        "=== HÅFAGPT EXACT GOVERNED REFERENCE MATCHES ===",
        "These deterministic matches outrank non-canonical or semantically similar retrieved usage.",
        "Do not present a complete sentence as fully reference-backed merely because some component words are verified; identify the exact scope of support.",
        "",
    ]
    for entry in matches:
        lines.extend(
            [
                f"[Canonical {entry.get('id', 'entry')}]",
                f"English: {entry.get('english', '')}",
                f"Recommended teaching term: {entry.get('recommended_teaching_term', '')}",
                f"Review status: {entry.get('review_status', 'unspecified')}",
                f"Confidence: {entry.get('confidence', 'unspecified')}",
            ]
        )
        variants = entry.get("variants") or []
        if variants:
            lines.append("Other recorded variants (not the primary beginner term):")
            for variant in variants:
                lines.append(
                    f"- {variant.get('term', '')} | status={variant.get('status', 'unspecified')} | "
                    f"{variant.get('notes', 'No editorial note supplied.')}"
                )
        citations = entry.get("source_citations") or []
        if citations:
            lines.append("Canonical evidence:")
            for citation in citations[:3]:
                lines.append(
                    f"- {citation.get('source', 'unspecified source')}: "
                    f"{citation.get('headword', '')} — {citation.get('definition', '')}"
                )
        if entry.get("notes"):
            lines.append(f"Editorial note: {entry['notes']}")
        lines.append("")

    for display_name, entry_headword, definition in dictionary_matches:
        lines.extend(
            [
                f"[Exact dictionary headword: {entry_headword}]",
                f"Source: {display_name}",
                f"Definition: {_format_dictionary_definition(definition)}",
                "",
            ]
        )

    for (
        observed,
        display_name,
        entry_headword,
        definition,
        near_match,
    ) in passage_dictionary_matches:
        label = (
            f"Possible OCR/spelling-near dictionary evidence for {observed}: {entry_headword}"
            if near_match
            else f"Exact passage dictionary evidence: {entry_headword}"
        )
        lines.extend(
            [
                f"[{label}]",
                f"Source: {display_name}",
                f"Definition: {_format_dictionary_definition(definition)}",
                (
                    "Use this near match only as an interpretation clue. Recheck the image "
                    "and do not silently replace the supplied spelling."
                    if near_match
                    else "This headword occurs exactly in the supplied passage text."
                ),
                "",
            ]
        )

    if matches:
        lines.append(
            "Cite canonical entries as the HåfaGPT canonical vocabulary ledger. "
            "Do not claim native review unless the review status says so."
        )
    if dictionary_matches or passage_dictionary_matches:
        lines.append(
            "Cite exact headword definitions by the dictionary source name shown above."
        )
    lines.append("=" * 60)
    sources: list[object] = []
    if matches:
        sources.append(("HåfaGPT canonical vocabulary", None))
        for entry in matches:
            for citation in entry.get("source_citations") or []:
                if not isinstance(citation, dict) or not citation.get("url"):
                    continue
                registered_source = resolve_source({"source": citation["url"]})
                source_contract = (
                    build_registered_source_citation(registered_source["id"])
                    if registered_source
                    else {
                        "source_id": None,
                        "name": citation.get("source", "Underlying canonical source"),
                        "url": citation["url"],
                        "page": None,
                    }
                )
                source_contract.update(
                    {
                        "support": (
                            f"Attests {citation.get('headword', 'the recorded variant')} "
                            f"as {citation.get('definition', 'public usage')}."
                        ),
                        "evidence_kind": "canonical_underlying_source",
                    }
                )
                sources.append(source_contract)
    sources.extend(
        (display_name, None)
        for display_name, _headword, _definition in dictionary_matches
    )
    sources.extend(
        (display_name, None)
        for _observed, display_name, _headword, _definition, _near_match
        in passage_dictionary_matches
    )
    deduplicated_sources: list[object] = []
    seen_source_keys: set[tuple[object, object]] = set()
    for source in sources:
        if isinstance(source, dict):
            key = (source.get("source_id") or source.get("name"), source.get("url"))
        else:
            key = (source[0], source[1])
        if key not in seen_source_keys:
            seen_source_keys.add(key)
            deduplicated_sources.append(source)
    return "\n".join(lines), deduplicated_sources
