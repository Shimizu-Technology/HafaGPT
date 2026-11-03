"""Build retrieval queries that preserve explicit conversational context."""

from __future__ import annotations

import re
from typing import Any

from src.rag.translation_policy import (
    classify_translation_request,
    extract_translation_payload,
    natural_translation_payload,
    selected_task_translation_query,
    translation_direction,
)


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
    # "and the second part?" asks about part of the previous text, not a new one.
    r"(?:and|(?:what|how)\s+about)\s+(?:the\s+)?"
    r"(?:(?:first|second|third|middle|last|final|next|other|remaining)\s+"
    r"(?:part|half|bit|line|sentence|clause)s?|rest)(?=\s*[?.!]*\s*$)|"
    r"(?:give|show|list|offer)\s+me\s+(?:some\s+)?(?:possible\s+)?(?:answers|options|alternatives|translations)|"
    r"what\s+(?:else|could\s+it\s+be)|"
    r"(?:any|some)\s+(?:other\s+)?(?:answers|options|alternatives|translations)"
    r")\b",
    re.IGNORECASE,
)
_MAX_REPLACEMENT_TARGET_WORDS = 4
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
            # "How do you say håfa adai in English?" asks for English.
            return target, translation_direction(value) or "to_chamorro"

    for pattern, direction in _TRANSLATION_TARGET_PATTERNS:
        match = pattern.search(value)
        if not match:
            continue
        target = _clean_target(match.group(1))
        if target and target.casefold() not in {"this", "that", "it"}:
            return target, direction

    # Natural phrasing ("I want to say…", "how would we write…") recognized by
    # the shared classifier.
    direction = translation_direction(value)
    if direction:
        target = _clean_target(extract_translation_payload(value))
        if target and target.casefold() not in {"this", "that", "it"}:
            return target, direction
    return None


def _replacement_target(value: str) -> str:
    if _SAME_TARGET_FOLLOW_UP_PATTERN.search(value):
        return ""
    match = _REPLACEMENT_TARGET_PATTERN.match(value)
    if not match:
        return ""
    target = _clean_target(match.group(1))
    if target.casefold() in {"this", "that", "it", "the language", "that language"}:
        return ""
    # "What about tree?" swaps the lookup target; a longer "what about…" is a
    # new question rather than a replacement word or short phrase.
    if len(target.split()) > _MAX_REPLACEMENT_TARGET_WORDS:
        return ""
    return target


def _candidate_correction(value: str) -> str:
    """Return a learner-supplied spelling without treating it as a new target."""

    match = _CANDIDATE_CORRECTION_PATTERN.match(value)
    return _clean_target(match.group(1)) if match else ""


ThreadState = tuple[str, str]


class ConversationHistory(list):
    """Model-ready history plus the tutor task recorded for each user turn.

    ``user_turn_intents[i]`` is the task selected when the i-th user message
    was sent, or ``None`` when no task was recorded. The intents live beside
    the messages rather than inside them so the provider never receives an
    unknown message field. Plain lists are accepted everywhere and mean every
    task is unknown.
    """

    user_turn_intents: tuple[str | None, ...] = ()


def _user_turns(past_messages: list[dict[str, Any]]) -> list[tuple[str, str | None]]:
    """Return each user turn's text with its recorded task, oldest first."""

    intents = tuple(getattr(past_messages, "user_turn_intents", ()) or ())
    user_count = sum(1 for message in past_messages if message.get("role") == "user")
    if len(intents) != user_count:
        # Trimmed or hand-built history: the recorded tasks cannot be matched
        # to turns, so treat every task as unknown.
        intents = (None,) * user_count
    turns = []
    index = 0
    for message in past_messages:
        if message.get("role") != "user":
            continue
        turns.append((_plain_user_text(message), intents[index]))
        index += 1
    return turns


def _resolve_turn(
    text: str,
    state: ThreadState | None,
    tutor_intent: str | None,
) -> tuple[str, ThreadState | None]:
    """Resolve one user turn against the translation thread before it.

    Returns the routing query ("" when the turn is ordinary chat) and the
    thread state after the turn. Live routing and history reconstruction both
    use this function, so an earlier turn is read exactly as it was routed
    when it was sent: with its own recorded task, never the current one.
    """

    current = text.strip()
    if not current:
        return "", state
    if classify_translation_request(current) != "none":
        return current, _explicit_translation_request(current)

    replacement_target = _replacement_target(current)
    same_target_follow_up = bool(_SAME_TARGET_FOLLOW_UP_PATTERN.search(current))
    candidate_correction = _candidate_correction(current)
    if replacement_target or same_target_follow_up or candidate_correction:
        if state:
            previous_target, direction = state
            target = replacement_target or previous_target
            query = _canonical_translation_query(target, direction)
            if candidate_correction:
                query = (
                    f'{query} Candidate spelling to verify: '
                    f'"{candidate_correction}".'
                )
            return query, (target, direction)
        if tutor_intent == "translate" and replacement_target:
            # No translation thread: translate the new target on its own and
            # infer its direction from the target itself.
            query = selected_task_translation_query(replacement_target)
            return query, _explicit_translation_request(query)
        # "What about that?" with nothing to refer back to has no payload.
        return "", None

    natural_payload = natural_translation_payload(current)
    if natural_payload and (tutor_intent == "translate" or state):
        if "\n" in natural_payload or len(natural_payload) > 200:
            return f"Translate this to Chamorro:\n\n{natural_payload}", (
                natural_payload.strip(), "to_chamorro",
            )
        target = _clean_target(natural_payload)
        return _canonical_translation_query(target, "to_chamorro"), (
            target, "to_chamorro",
        )
    if tutor_intent == "translate":
        query = selected_task_translation_query(current)
        return query, _explicit_translation_request(query)
    # Unrelated text ends the translation thread.
    return "", None


def _translation_thread_state(past_messages: list[dict[str, Any]]) -> ThreadState | None:
    """Replay user turns oldest-first and return the open translation thread.

    Each turn is resolved with the task recorded when it was sent. A turn with
    no recorded task counts only if its own text is a translation request or a
    follow-up inside an open thread. Assistant answers are never consulted.
    """

    state: ThreadState | None = None
    for text, turn_intent in _user_turns(past_messages):
        if text:
            _, state = _resolve_turn(text, state, turn_intent)
    return state


def _canonical_translation_query(target: str, direction: str) -> str:
    if direction == "to_english":
        return f'What does "{target}" mean in English?'
    return f'How do you say "{target}" in Chamorro?'


def _translation_follow_up_query(
    current: str,
    past_messages: list[dict[str, Any]],
) -> str:
    """Restate a short follow-up inside a translation thread, or return ""."""

    if not (
        _replacement_target(current)
        or _SAME_TARGET_FOLLOW_UP_PATTERN.search(current)
        or _candidate_correction(current)
    ):
        return ""
    state = _translation_thread_state(past_messages)
    if not state:
        return ""
    query, _ = _resolve_turn(current, state, None)
    return query


def resolve_translation_routing_query(
    current_message: str,
    past_messages: list[dict[str, Any]],
    tutor_intent: str | None = None,
) -> str:
    """Return the request text that decides translation policy and retrieval.

    A recognized request is returned unchanged. A short follow-up such as
    "What about tree?" inherits the direction of the open translation thread,
    and "What about that?" keeps its target. An ambiguous natural cue ("I want
    to say the store closes at five") counts as a translation inside a thread
    or under the Translate task, and any other message typed under the
    Translate task is the text to translate. Earlier turns are replayed with
    their own recorded task, so switching tasks never changes what an earlier
    turn meant. Only user-authored history is consulted. The model still
    receives the original message; this string only steers routing.
    """

    current = current_message.strip()
    if not current or classify_translation_request(current) != "none":
        return current_message
    query, _ = _resolve_turn(
        current, _translation_thread_state(past_messages), tutor_intent,
    )
    return query or current_message


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

    # Explicit requests already carry their own direction and target. Keeping
    # them byte-for-byte stable avoids changing passage-translation behavior.
    if _explicit_translation_request(current):
        return current_message

    follow_up = _translation_follow_up_query(current, past_messages)
    if follow_up:
        return follow_up

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
