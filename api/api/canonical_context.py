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
    classify_translation_request,
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
MAX_PASSAGE_DICTIONARY_MATCHES = 8
MAX_ENGLISH_CONCEPT_MATCHES = 8
_PASSAGE_WORD_PATTERN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žÅåÑñ'’\-]+")
_ENGLISH_CONCEPT_STOP_WORDS = {
    "a",
    "about",
    "an",
    "and",
    "for",
    "i",
    "in",
    "is",
    "it",
    "like",
    "of",
    "something",
    "the",
    "to",
    "we",
    "you",
}
_IRREGULAR_ENGLISH_FORMS = {
    "forgot": "forget",
    "forgotten": "forget",
    "thought": "think",
    "taught": "teach",
    "went": "go",
    "gone": "go",
    "said": "say",
}
_DICTIONARY_SOURCE_IDS = {
    "Chamoru.info dictionary": "chamoru_info_dictionary",
    "Topping, Ogo, and Dungca dictionary": "topping_ogo_dungca_1975",
    "Revised and updated Chamorro dictionary": "local_revised_dictionary_snapshot",
}


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


def _normalize_learner_headword(value: str) -> str:
    """Collapse phone/OCR spacing only for candidate retrieval."""

    return re.sub(r"[^a-z0-9]", "", _normalize_for_match(value))


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
    match = re.search(
        r"what does\s+(.+?)\s+mean(?:\s+in\s+english)?[?.!]*\s*$",
        user_input,
        re.I | re.S,
    )
    if not match:
        return ""
    target = match.group(1).strip()
    if target.casefold() in {"this", "that", "it", "all of this", "everything"}:
        return ""
    if len(target) > 80 or len(_PASSAGE_WORD_PATTERN.findall(target)) > 6:
        return ""
    return target


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
def _learner_headword_index() -> dict[str, tuple[tuple[str, str, object], ...]]:
    """Index governed headwords by a display-independent phone/OCR key."""

    index: dict[str, list[tuple[str, str, object]]] = {}
    for display_name, dictionary in _exact_dictionary_data():
        for entry_headword, definition in dictionary.items():
            normalized = _normalize_learner_headword(entry_headword)
            if len(normalized) >= 4:
                index.setdefault(normalized, []).append(
                    (display_name, entry_headword, definition)
                )
    return {key: tuple(values) for key, values in index.items()}


def _lookup_learner_headword_candidates(
    headword: str,
) -> list[tuple[str, str, object]]:
    """Return spacing/diacritic-tolerant candidates only after exact lookup fails."""

    if not headword or _lookup_exact_dictionary_entries(headword):
        return []
    normalized = _normalize_learner_headword(headword)
    if len(normalized) < 4:
        return []
    matches = _learner_headword_index().get(normalized, ())
    lexical_matches = tuple(
        match for match in matches if not _is_proper_name_definition(match[2])
    )
    if lexical_matches:
        matches = lexical_matches
    result: list[tuple[str, str, object]] = []
    seen: set[tuple[str, str]] = set()
    for display_name, entry_headword, definition in matches:
        key = (display_name, _normalize_exact_headword(entry_headword))
        if key in seen:
            continue
        seen.add(key)
        result.append((display_name, entry_headword, definition))
        if len(result) >= MAX_CANONICAL_MATCHES:
            break
    return result


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


def _english_lookup_forms(word: str) -> tuple[str, ...]:
    """Return conservative dictionary forms for an English surface word."""

    normalized = _normalize_for_match(word)
    if not normalized or " " in normalized:
        return ()
    forms = [normalized]
    irregular = _IRREGULAR_ENGLISH_FORMS.get(normalized)
    if irregular:
        forms.append(irregular)
    if len(normalized) >= 5 and normalized.endswith("ies"):
        forms.append(f"{normalized[:-3]}y")
    if len(normalized) >= 5 and normalized.endswith("ed"):
        forms.extend((normalized[:-2], f"{normalized[:-1]}"))
    if len(normalized) >= 6 and normalized.endswith("ing"):
        forms.extend((normalized[:-3], f"{normalized[:-3]}e"))
    if len(normalized) >= 6 and normalized.endswith("er"):
        forms.extend((normalized[:-2], f"{normalized[:-1]}"))
    if len(normalized) >= 5 and normalized.endswith("s"):
        forms.append(normalized[:-1])
    return tuple(dict.fromkeys(form for form in forms if len(form) >= 3))


def _english_passage_concept_matches(
    user_input: str,
) -> list[tuple[str, str, str, str, object]]:
    """Retrieve direct dictionary anchors for an English-to-Chamorro passage.

    Results contain the observed text, matched dictionary gloss, source name,
    Chamorro headword, and definition. Inflection handling changes only English
    retrieval keys; it never rewrites or manufactures Chamorro content.
    """

    if classify_translation_request(user_input) != "passage_to_chamorro":
        return []
    payload = extract_translation_retrieval_payload(user_input)
    if not payload:
        return []
    words = [
        word.casefold()
        for word in _PASSAGE_WORD_PATTERN.findall(payload)
        if re.search(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žÅåÑñ]", word)
    ]
    if not words:
        return []

    index = _exact_english_gloss_index()
    candidates: list[tuple[int, int, str, str]] = []
    covered_positions: set[int] = set()

    for width in range(min(4, len(words)), 1, -1):
        for position in range(len(words) - width + 1):
            if any(
                offset in covered_positions
                for offset in range(position, position + width)
            ):
                continue
            observed = " ".join(words[position:position + width])
            gloss = _normalize_for_match(observed)
            if gloss not in index:
                continue
            candidates.append((width, position, observed, gloss))
            covered_positions.update(range(position, position + width))

    for position, observed in enumerate(words):
        if position in covered_positions or observed in _ENGLISH_CONCEPT_STOP_WORDS:
            continue
        gloss = next(
            (form for form in _english_lookup_forms(observed) if form in index),
            "",
        )
        if gloss:
            candidates.append((1, position, observed, gloss))

    candidates.sort(key=lambda item: (-item[0], item[1], item[3]))
    matches: list[tuple[str, str, str, str, object]] = []
    seen_concepts: set[str] = set()
    for _width, _position, observed, gloss in candidates:
        if gloss in seen_concepts:
            continue
        seen_concepts.add(gloss)
        ranked_matches = index[gloss]
        best_rank = ranked_matches[0][0]
        for rank, display_name, entry_headword, definition in ranked_matches:
            if rank != best_rank:
                break
            matches.append(
                (observed, gloss, display_name, entry_headword, definition)
            )
            break
        if len(matches) >= MAX_ENGLISH_CONCEPT_MATCHES:
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


def _is_proper_name_definition(definition: object) -> bool:
    """Keep dictionary name records from outranking ordinary passage words."""

    if isinstance(definition, dict):
        part_of_speech = str(
            definition.get("PartOfSpeech") or definition.get("wc") or ""
        ).casefold()
        definition_text = str(
            definition.get("Definition")
            or definition.get("definition")
            or definition.get("df")
            or ""
        ).casefold()
    else:
        part_of_speech = ""
        definition_text = str(definition).casefold()
    return (
        part_of_speech.startswith("name")
        or definition_text.startswith("nickname for ")
        or definition_text in {"surname", "first name", "family name"}
    )


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
            if normalized_phrase in index and any(
                not _is_proper_name_definition(definition)
                for _display_name, _entry_headword, definition in index[normalized_phrase]
            ):
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
    learner_index = _learner_headword_index()
    for position, observed in enumerate(normalized_words):
        compact = _normalize_learner_headword(observed)
        if len(compact) < 4:
            continue
        for _display_name, entry_headword, definition in learner_index.get(
            compact, ()
        ):
            headword = _normalize_exact_headword(entry_headword)
            if (
                headword == observed
                or " " in headword
                or _is_proper_name_definition(definition)
            ):
                continue
            candidates.append((1, len(headword), position, observed, headword, True))

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
        lexical_entries = [
            entry
            for entry in index[headword]
            if not _is_proper_name_definition(entry[2])
        ]
        for display_name, entry_headword, definition in lexical_entries[:1]:
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


def _dictionary_source(
    display_name: str,
    *,
    support: str,
    support_scope: str,
) -> dict:
    source_id = _DICTIONARY_SOURCE_IDS.get(display_name)
    citation = (
        build_registered_source_citation(source_id)
        if source_id
        else {"source_id": None, "name": display_name, "url": None, "page": None}
    )
    citation.update(
        {
            "support": support,
            "support_scope": support_scope,
            "evidence_kind": "deterministic_dictionary_match",
        }
    )
    return citation


def get_canonical_tutor_context(user_input: str) -> tuple[str, list[object]]:
    """Return exact curriculum matches before semantic RAG material.

    This is intentionally a lexical bridge, not a replacement for retrieval. It
    prevents a semantically similar legacy chunk from overriding an exact,
    governed beginner term that already exists in HåfaGPT's canonical ledger.
    """

    normalized_input = _normalize_for_match(user_input)
    if not normalized_input:
        return "", []
    passage_request = is_passage_translation(user_input)

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
    learner_headword_candidates = _lookup_learner_headword_candidates(
        requested_headword
    )
    requested_english_gloss = _extract_requested_english_gloss(user_input)
    english_gloss_matches = _lookup_exact_english_glosses(requested_english_gloss)
    passage_dictionary_matches = _passage_dictionary_matches(user_input)
    english_passage_concept_matches = _english_passage_concept_matches(user_input)

    if (
        not matches
        and not dictionary_matches
        and not learner_headword_candidates
        and not english_gloss_matches
        and not passage_dictionary_matches
        and not english_passage_concept_matches
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

    for display_name, entry_headword, definition in learner_headword_candidates:
        lines.extend(
            [
                f"[Phone/OCR-normalized headword candidate for {requested_headword}: {entry_headword}]",
                f"Source: {display_name}",
                f"Definition: {_format_dictionary_definition(definition)}",
                "The compact spelling matches after removing spaces, apostrophes, and diacritics. "
                "Present the dictionary spelling as a likely interpretation, not as an exact transcription.",
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

    for (
        observed,
        gloss,
        display_name,
        entry_headword,
        definition,
    ) in english_passage_concept_matches:
        lines.extend(
            [
                f"[English passage concept: {observed} -> {gloss}]",
                f"Chamorro headword: {entry_headword}",
                f"Source: {display_name}",
                f"Definition: {_format_dictionary_definition(definition)}",
                "This directly supports this lexical concept only; it does not verify the complete sentence.",
                "",
            ]
        )

    if matches:
        lines.append(
            "Cite canonical entries as the HåfaGPT canonical vocabulary ledger. "
            "Do not claim native review unless the review status says so."
        )
    if (
        dictionary_matches
        or learner_headword_candidates
        or english_gloss_matches
        or passage_dictionary_matches
        or english_passage_concept_matches
    ):
        lines.append(
            "Cite exact headword definitions by the dictionary source name shown above."
        )
    lines.append("=" * 60)
    sources: list[object] = []
    if matches:
        canonical_source = build_registered_source_citation(
            "hafagpt_canonical_evaluation"
        )
        canonical_source.update(
            {
                "name": "HåfaGPT canonical vocabulary",
                "support": (
                    "Supports one or more canonical vocabulary components."
                    if passage_request
                    else "Supports the requested canonical vocabulary."
                ),
                "support_scope": "partial" if passage_request else "answer",
                "evidence_kind": "canonical_vocabulary_match",
            }
        )
        sources.append(canonical_source)
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
                        "support_scope": "partial" if passage_request else "answer",
                    }
                )
                sources.append(source_contract)
    sources.extend(
        _dictionary_source(
            display_name,
            support=f"Defines the requested headword {entry_headword}.",
            support_scope="answer",
        )
        for display_name, entry_headword, _definition in dictionary_matches
    )
    sources.extend(
        _dictionary_source(
            display_name,
            support=f"Provides a normalized spelling candidate, {entry_headword}.",
            support_scope="candidate",
        )
        for display_name, entry_headword, _definition in learner_headword_candidates
    )
    sources.extend(
        _dictionary_source(
            display_name,
            support=f"Defines {entry_headword} for the requested English gloss.",
            support_scope="answer",
        )
        for display_name, entry_headword, _definition in english_gloss_matches
    )
    sources.extend(
        _dictionary_source(
            display_name,
            support=f"Defines the passage component {entry_headword}.",
            support_scope="partial",
        )
        for _observed, display_name, entry_headword, _definition, _near_match
        in passage_dictionary_matches
    )
    sources.extend(
        _dictionary_source(
            display_name,
            support=f"Supports {observed!r} via the dictionary gloss {gloss!r} ({entry_headword}).",
            support_scope="partial",
        )
        for observed, gloss, display_name, entry_headword, _definition
        in english_passage_concept_matches
    )
    deduplicated_sources: list[object] = []
    seen_source_keys: dict[tuple[object, object], int] = {}
    for source in sources:
        if isinstance(source, dict):
            key = (source.get("source_id") or source.get("name"), source.get("url"))
        else:
            key = (source[0], source[1])
        if key in seen_source_keys:
            existing = deduplicated_sources[seen_source_keys[key]]
            if isinstance(existing, dict) and isinstance(source, dict):
                support = str(source.get("support") or "").strip()
                existing_support = str(existing.get("support") or "").strip()
                if support and support not in existing_support:
                    existing["support"] = " ".join(
                        value for value in (existing_support, support) if value
                    )
                scope_rank = {"candidate": 1, "partial": 2, "answer": 3}
                if scope_rank.get(str(source.get("support_scope")), 0) > scope_rank.get(
                    str(existing.get("support_scope")), 0
                ):
                    existing["support_scope"] = source.get("support_scope")
            continue
        seen_source_keys[key] = len(deduplicated_sources)
        deduplicated_sources.append(source)
    return "\n".join(lines), deduplicated_sources
