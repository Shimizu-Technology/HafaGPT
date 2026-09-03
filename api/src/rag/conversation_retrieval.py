"""Build retrieval queries that preserve explicit conversational context."""

from __future__ import annotations

import re
from typing import Any

from src.rag.translation_policy import extract_translation_payload


_AMBIGUOUS_FOLLOW_UPS = (
    re.compile(r"\b(?:the|that|this) language\b", re.IGNORECASE),
    re.compile(r"^\s*(?:tell me more|what about that|can you explain more)\b", re.IGNORECASE),
)
_TRANSLATION_TARGET_PATTERNS = (
    (re.compile(r"\bwhat is\s+(.+?)\s+in\s+chamor(?:ro|u)[?.!]*$", re.IGNORECASE), "to_chamorro"),
    (re.compile(r"\b(?:the\s+)?chamor(?:ro|u) word for\s+(.+?)[?.!]*$", re.IGNORECASE), "to_chamorro"),
    (re.compile(r"\btranslate\s+(.+?)\s+to\s+chamor(?:ro|u)[?.!]*$", re.IGNORECASE), "to_chamorro"),
    (re.compile(r"\bwhat does\s+(.+?)\s+mean(?:\s+in\s+english)?[?.!]*$", re.IGNORECASE), "to_english"),
    (re.compile(r"\bwhat is\s+(.+?)\s+in\s+english[?.!]*$", re.IGNORECASE), "to_english"),
    (re.compile(r"\btranslate\s+(.+?)\s+to\s+english[?.!]*$", re.IGNORECASE), "to_english"),
)
_CANDIDATE_CORRECTION_PATTERN = re.compile(
    r"^\s*(?:i\s+thought\s+(?:it\s+)?was|"
    r"isn['’]t(?:\s+it)?|is(?:\s+it)?\s+not)\s+(.+?)[?.!]*\s*$",
    re.IGNORECASE,
)
_REPLACEMENT_TARGET_PATTERN = re.compile(
    r"^\s*(?:(?:what|how)\s+about|and)\s+(.+?)[?.!]*\s*$",
    re.IGNORECASE,
)
_SAME_TARGET_FOLLOW_UP_PATTERN = re.compile(
    r"^\s*(?:"
    r"(?:what|how)\s+about\s+(?:that|it)(?=\s*[?.!]*\s*$)|"
    r"(?:give|show|list|offer)\s+me\s+(?:some\s+)?(?:possible\s+)?(?:answers|options|alternatives|translations)|"
    r"what\s+(?:else|could\s+it\s+be)|"
    r"(?:any|some)\s+(?:other\s+)?(?:answers|options|alternatives|translations)"
    r")\b",
    re.IGNORECASE,
)
_CORRECTED_SENTENCE_FOLLOW_UP_PATTERN = re.compile(
    r"^\s*(?:can|could|would)\s+you\s+(?:please\s+)?(?:give|show|write|provide)\s+"
    r"(?:me\s+)?(?:the\s+|a\s+)?(?:corrected|fixed|right)\s+"
    r"(?:sentence|translation|version)\b",
    re.IGNORECASE,
)
_TOPIC_MARKERS = (
    (re.compile(r"\b(?:guam|guåhan|guahan)\b", re.IGNORECASE), "Guam"),
    (re.compile(r"\b(?:cnmi|northern mariana islands)\b", re.IGNORECASE), "CNMI"),
    (re.compile(r"\bsaipan\b", re.IGNORECASE), "Saipan"),
    (re.compile(r"\bchamor(?:ro|u)\b", re.IGNORECASE), "CHamoru"),
)


def _plain_user_text(message: dict[str, Any]) -> str:
    if message.get("role") != "user":
        return ""
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()
    return ""


def _clean_target(value: str) -> str:
    """Remove wrapper punctuation without damaging Chamorro apostrophes."""

    cleaned = value.strip().strip(" \t\r\n.,!?;:")
    quote_pairs = (
        ("\"", "\""),
        ("\N{LEFT DOUBLE QUOTATION MARK}", "\N{RIGHT DOUBLE QUOTATION MARK}"),
        ("\N{LEFT SINGLE QUOTATION MARK}", "\N{RIGHT SINGLE QUOTATION MARK}"),
        ("'", "'"),
    )
    for opening, closing in quote_pairs:
        if len(cleaned) > 1 and cleaned.startswith(opening) and cleaned.endswith(closing):
            return cleaned[1:-1].strip().strip(" \t\r\n.,!?;:")
    return cleaned


def _explicit_translation_request(value: str) -> tuple[str, str] | None:
    """Return an explicit target and direction from a user-authored request."""

    if re.search(r"\bhow (?:do|would) (?:you|i) say\b", value, re.IGNORECASE):
        target = _clean_target(extract_translation_payload(value))
        if target and target.casefold() not in {"this", "that", "it"}:
            return target, "to_chamorro"

    for pattern, direction in _TRANSLATION_TARGET_PATTERNS:
        match = pattern.search(value)
        if not match:
            continue
        target = _clean_target(match.group(1))
        if target and target.casefold() not in {"this", "that", "it"}:
            return target, direction
    return None


def _replacement_target(value: str) -> str:
    match = _REPLACEMENT_TARGET_PATTERN.match(value)
    if not match:
        return ""
    target = _clean_target(match.group(1))
    if target.casefold() in {"this", "that", "it", "the language", "that language"}:
        return ""
    return target


def _candidate_correction(value: str) -> str:
    """Return a learner-supplied spelling without treating it as a new target."""

    match = _CANDIDATE_CORRECTION_PATTERN.match(value)
    return _clean_target(match.group(1)) if match else ""


def _translation_thread_state(
    past_messages: list[dict[str, Any]],
) -> tuple[str, str] | None:
    """Resolve the latest contiguous user translation thread.

    Work backwards so a replacement such as ``What about tree?`` supplies the
    newest target while an older explicit request supplies the direction. Stop
    at unrelated user text to avoid carrying stale translation intent into a
    different topic.
    """

    target = ""
    for message in reversed(past_messages):
        previous = _plain_user_text(message)
        if not previous:
            continue

        explicit = _explicit_translation_request(previous)
        if explicit:
            explicit_target, direction = explicit
            return target or explicit_target, direction

        replacement = _replacement_target(previous)
        if replacement:
            target = target or replacement
            continue

        if _candidate_correction(previous):
            continue

        if _SAME_TARGET_FOLLOW_UP_PATTERN.search(previous):
            continue

        break
    return None


def _canonical_translation_query(target: str, direction: str) -> str:
    if direction == "to_english":
        return f'What does "{target}" mean in English?'
    return f'How do you say "{target}" in Chamorro?'


def _corrected_sentence_retrieval_query(
    past_messages: list[dict[str, Any]],
) -> str:
    """Recover the sentence being corrected without trusting assistant prose."""

    discussed_words: list[str] = []
    for message in reversed(past_messages):
        previous = _plain_user_text(message)
        if not previous:
            continue
        explicit = _explicit_translation_request(previous)
        if explicit:
            target, direction = explicit
            if direction == "to_chamorro":
                query = _canonical_translation_query(target, direction)
                if discussed_words:
                    quoted = ", ".join(
                        f'"{word}"' for word in reversed(discussed_words[:4])
                    )
                    query += f" Candidate words discussed: {quoted}."
                return query
            if len(target.split()) <= 4 and target not in discussed_words:
                discussed_words.append(target)
            continue
        if _candidate_correction(previous) or _SAME_TARGET_FOLLOW_UP_PATTERN.search(previous):
            continue
        break
    return ""


def build_contextual_retrieval_query(
    current_message: str,
    past_messages: list[dict[str, Any]],
) -> str:
    """Add the latest user-authored context only for genuinely vague follow-ups.

    The original message still goes to the model unchanged. This string is used
    only by retrieval, so it can resolve phrases such as "the language" without
    inventing that the user is studying, enrolled, or pursuing a learning goal.
    Assistant answers are deliberately ignored because they may contain an
    earlier unsupported assumption.
    """

    current = current_message.strip()
    if not current:
        return current_message

    if _CORRECTED_SENTENCE_FOLLOW_UP_PATTERN.search(current):
        correction_query = _corrected_sentence_retrieval_query(past_messages)
        if correction_query:
            return correction_query

    # Explicit requests already carry their own direction and target. Keeping
    # them byte-for-byte stable avoids changing passage-translation behavior.
    if _explicit_translation_request(current):
        return current_message

    replacement_target = _replacement_target(current)
    same_target_follow_up = bool(_SAME_TARGET_FOLLOW_UP_PATTERN.search(current))
    candidate_correction = _candidate_correction(current)
    if replacement_target or same_target_follow_up or candidate_correction:
        thread_state = _translation_thread_state(past_messages)
        if thread_state:
            previous_target, direction = thread_state
            target = replacement_target or previous_target
            if target:
                canonical_query = _canonical_translation_query(target, direction)
                if candidate_correction:
                    return (
                        f'{canonical_query} Candidate spelling to verify: '
                        f'"{candidate_correction}".'
                    )
                return canonical_query

    if not any(pattern.search(current) for pattern in _AMBIGUOUS_FOLLOW_UPS):
        return current_message

    for message in reversed(past_messages):
        previous = _plain_user_text(message)
        if previous and previous != current:
            topic = next(
                (label for pattern, label in _TOPIC_MARKERS if pattern.search(previous)),
                previous[:240],
            )
            if re.search(r"\b(?:the|that|this) language\b", current, re.IGNORECASE):
                return re.sub(
                    r"\b(?:the|that|this) language\b",
                    f"the language in {topic}",
                    current,
                    count=1,
                    flags=re.IGNORECASE,
                )
            return f"{current} — prior user topic: {topic}"
    return current_message
