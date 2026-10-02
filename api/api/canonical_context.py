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
    extract_translation_payload,
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
MAX_PASSAGE_DICTIONARY_MATCHES = 24
MAX_PASSAGE_SPELLING_CANDIDATES = 2
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
    candidate_match = re.search(
        r'candidate spelling to verify:\s*["“]([^"”]+)["”]',
        user_input,
        re.I,
    )
    if candidate_match:
        return candidate_match.group(1).strip()
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


def _extract_requested_english_gloss(user_input: str) -> str:
    """Return a short English target from an English-to-Chamorro lookup."""

    if not re.search(
        r"(?i)\b(?:how (?:do|would) (?:you|i) say|"
        r"what is .+ in chamor(?:ro|u)|chamor(?:ro|u) word for|"
        r"translate .+ to chamor(?:ro|u))\b",
        user_input,
    ):
        return ""
    target = extract_translation_payload(user_input).strip(" \t\r\n.,!?;:")
    words = _PASSAGE_WORD_PATTERN.findall(target)
    if not words or len(words) > 4 or len(target) > 80:
        return ""
    return target


def _definition_gloss_segments(definition: object) -> tuple[tuple[str, int], ...]:
    """Return direct gloss keys without indexing examples or incidental prose."""

    definition_text = _format_dictionary_definition(definition)
    segments: list[tuple[str, int]] = []
    qualifier_starts = (
        "also ",
        "but ",
        "especially ",
        "from ",
        "longer ",
        "shorter ",
        "similar ",
        "that ",
        "usually ",
        "used ",
        "when ",
        "which ",
        "with ",
    )

    def add_segment(raw_segment: str, rank: int) -> None:
        segment = re.sub(
            r"(?i)^\s*(?:noun|verb|adjective|adverb|n|v|adj|adv)\.\s*",
            "",
            raw_segment,
        ).strip(" \t\r\n.:–—-")
        normalized = _normalize_for_match(segment)
        if normalized:
            segments.append((normalized, rank))
        without_parenthetical = re.sub(r"\([^)]*\)", " ", segment)
        normalized_without_parenthetical = _normalize_for_match(without_parenthetical)
        if (
            normalized_without_parenthetical
            and normalized_without_parenthetical != normalized
        ):
            segments.append((normalized_without_parenthetical, max(rank, 2)))

    for clause in re.split(r"[;\n]", definition_text):
        add_segment(clause, 1)

        dash_parts = re.split(r"--|\s[-–—]\s", clause, maxsplit=1)
        if len(dash_parts) == 2:
            add_segment(dash_parts[0], 3)

        comma_parts = [part.strip() for part in clause.split(",")]
        if len(comma_parts) <= 1 or len(_PASSAGE_WORD_PATTERN.findall(clause)) > 8:
            continue
        normalized_tail = _normalize_for_match(comma_parts[1])
        first_rank = (
            3
            if any(normalized_tail.startswith(prefix) for prefix in qualifier_starts)
            else 1
        )
        add_segment(comma_parts[0], first_rank)
        if first_rank == 1:
            for comma_part in comma_parts[1:]:
                add_segment(comma_part, 1)
    return tuple(segments)


@lru_cache(maxsize=1)
def _exact_english_gloss_index(
) -> dict[str, tuple[tuple[int, str, str, object], ...]]:
    """Index direct dictionary glosses for deterministic reverse lookup."""

    index: dict[str, list[tuple[int, str, str, object]]] = {}
    for display_name, dictionary in _exact_dictionary_data():
        for entry_headword, definition in dictionary.items():
            for gloss, rank in _definition_gloss_segments(definition):
                index.setdefault(gloss, []).append(
                    (rank, display_name, entry_headword, definition)
                )
    return {
        gloss: tuple(sorted(matches, key=lambda match: (match[0], len(match[2]), match[2])))
        for gloss, matches in index.items()
    }


def _lookup_exact_english_glosses(
    english_gloss: str,
) -> list[tuple[str, str, object]]:
    """Return only the best-ranked headwords for an exact English gloss."""

    normalized_gloss = _normalize_for_match(english_gloss)
    ranked_matches = _exact_english_gloss_index().get(normalized_gloss, ())
    if not ranked_matches:
        return []
    best_rank = ranked_matches[0][0]
    matches: list[tuple[str, str, object]] = []
    seen: set[tuple[str, str]] = set()
    for rank, display_name, entry_headword, definition in ranked_matches:
        if rank != best_rank:
            break
        key = (display_name, _normalize_exact_headword(entry_headword))
        if key in seen:
            continue
        seen.add(key)
        matches.append((display_name, entry_headword, definition))
        if len(matches) >= MAX_CANONICAL_MATCHES:
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


def _spelling_candidate_key(headword: str) -> str:
    """Group a narrow set of orthographic possibilities, not equivalent meanings.

    These operations are only a retrieval aid for passage interpretation. Exact
    headword lookup retains its stricter normalization and distinction of senses.
    """

    decomposed = unicodedata.normalize("NFD", headword)
    return "".join(char for char in decomposed if not unicodedata.combining(char)).replace("'", "").replace("o", "u")


@lru_cache(maxsize=1)
def _spelling_candidate_index() -> dict[str, tuple[str, ...]]:
    buckets: dict[str, list[str]] = {}
    for headword in _exact_dictionary_index():
        if " " not in headword and len(headword) >= 3:
            buckets.setdefault(_spelling_candidate_key(headword), []).append(headword)
    return {key: tuple(sorted(values)) for key, values in buckets.items()}


def _passage_dictionary_matches(
    user_input: str, *, match_limit: int = MAX_PASSAGE_DICTIONARY_MATCHES,
) -> list[tuple[str, str, str, object, bool]]:
    """Find bounded evidence fairly across passage lines and answer choices.

    Preserve distinct governed definitions and narrowly related spellings even
    when an exact match exists: an exact spelling is not proof of the right sense.
    The boolean marks an interpretation candidate, never an input correction.
    """

    if not is_passage_translation(user_input):
        return []
    payload = extract_translation_retrieval_payload(user_input)
    if not payload:
        return []

    index = _exact_dictionary_index()
    spelling_index = _spelling_candidate_index()
    near_index = _near_dictionary_headword_index()
    # A line keeps its own priority queue, so a long first question cannot consume
    # the entire allowance before short choices or later questions are considered.
    line_candidates: list[list[tuple[str, tuple[str, ...]]]] = []
    for line in payload.splitlines():
        words = [_normalize_exact_headword(word) for word in _PASSAGE_WORD_PATTERN.findall(line)]
        candidates: dict[str, tuple[int, int, tuple[str, ...]]] = {}
        for width in range(min(4, len(words)), 0, -1):
            for position in range(len(words) - width + 1):
                observed = " ".join(words[position:position + width])
                if len(observed.replace(" ", "")) >= 3 and observed in index:
                    candidates.setdefault(observed, (width, position, (observed,)))
        for position, observed in enumerate(words):
            if len(observed) < 3:
                continue
            spelling_candidates = [
                headword for headword in spelling_index.get(_spelling_candidate_key(observed), ())
                if headword != observed and _edit_distance_at_most_one(observed, headword)
            ]
            # Prefer the same length; tie-breaking is deterministic and
            # does not rank one dictionary meaning as the correct translation.
            spelling_candidates.sort(key=lambda headword: (
                abs(len(observed) - len(headword)), headword,
            ))
            related = spelling_candidates[:MAX_PASSAGE_SPELLING_CANDIDATES]
            if not related and observed not in index and len(observed) >= 5:
                related = sorted({
                    headword
                    for length in range(max(4, len(observed) - 1), len(observed) + 2)
                    for headword in near_index.get((observed[:2], length), ())
                    if _edit_distance_at_most_one(observed, headword)
                })[:MAX_PASSAGE_SPELLING_CANDIDATES]
            headwords = ((observed,) if observed in index else ()) + tuple(related)
            if headwords:
                candidates[observed] = (1, position, headwords)
        ordered = sorted(candidates.items(), key=lambda item: (
            -item[1][0], -len(item[0]), item[1][1], item[0],
        ))
        if ordered:
            line_candidates.append([(observed, values[2]) for observed, values in ordered])

    selected: list[tuple[str, tuple[str, ...]]] = []
    seen_observed: set[str] = set()
    # Round-robin, skipping duplicates without spending a line's turn on them.
    offsets = [0] * len(line_candidates)
    while len(selected) < match_limit:
        progressed = False
        for line_index, candidates in enumerate(line_candidates):
            while offsets[line_index] < len(candidates):
                observed, headwords = candidates[offsets[line_index]]
                offsets[line_index] += 1
                if observed in seen_observed:
                    continue
                selected.append((observed, headwords))
                seen_observed.add(observed)
                progressed = True
                break
            if len(selected) >= match_limit:
                break
        if not progressed:
            break

    matches: list[tuple[str, str, str, object, bool]] = []
    seen_evidence: set[tuple[str, str, str, str]] = set()
    for observed, headwords in selected:
        for headword in headwords:
            for display_name, entry_headword, definition in index[headword]:
                key = (observed, display_name, entry_headword, _format_dictionary_definition(definition))
                if key in seen_evidence:
                    continue
                seen_evidence.add(key)
                matches.append((observed, display_name, entry_headword, definition, headword != observed))
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


def get_canonical_tutor_context(user_input: str, *, passage_match_limit: int = MAX_PASSAGE_DICTIONARY_MATCHES) -> tuple[str, list[object]]:
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
    requested_english_gloss = _extract_requested_english_gloss(user_input)
    english_gloss_matches = _lookup_exact_english_glosses(requested_english_gloss)
    passage_dictionary_matches = _passage_dictionary_matches(user_input, match_limit=passage_match_limit)

    if (
        not matches
        and not dictionary_matches
        and not english_gloss_matches
        and not passage_dictionary_matches
    ):
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

    for display_name, entry_headword, definition in english_gloss_matches:
        lines.extend(
            [
                f"[Exact English dictionary gloss: {requested_english_gloss}]",
                f"Chamorro headword: {entry_headword}",
                f"Source: {display_name}",
                f"Definition: {_format_dictionary_definition(definition)}",
                "This is direct dictionary evidence for the requested English gloss.",
                "",
            ]
        )

    if passage_dictionary_matches:
        lines.append(
            "Passage definitions may describe different senses. Choose only the reading supported "
            "by the full sentence/image; flag unresolved conflicts. Possible spelling matches "
            "are interpretation clues, not synonyms: recheck the image and do not silently "
            "replace the supplied spelling."
        )
    prior_passage_label = None
    for observed, display_name, entry_headword, definition, near_match in passage_dictionary_matches:
        label = (
            f"Possible OCR/spelling-near dictionary evidence for {observed}: {entry_headword}"
            if near_match
            else f"Exact passage dictionary evidence: {entry_headword}"
        )
        if label != prior_passage_label:
            lines.append(f"[{label}]")
            prior_passage_label = label
        lines.extend([
            f"Source: {display_name}",
            f"Definition: {_format_dictionary_definition(definition)}",
        ])
    if passage_dictionary_matches:
        lines.append("")

    if matches:
        lines.append(
            "Cite canonical entries as the HåfaGPT canonical vocabulary ledger. "
            "Do not claim native review unless the review status says so."
        )
    if dictionary_matches or english_gloss_matches or passage_dictionary_matches:
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
        for display_name, _headword, _definition in english_gloss_matches
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
