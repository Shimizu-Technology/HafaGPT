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

    if not matches and not dictionary_matches:
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

    if matches:
        lines.append(
            "Cite canonical entries as the HåfaGPT canonical vocabulary ledger. "
            "Do not claim native review unless the review status says so."
        )
    if dictionary_matches:
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
