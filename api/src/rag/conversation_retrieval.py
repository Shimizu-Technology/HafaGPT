"""Build retrieval queries that preserve explicit conversational context."""

from __future__ import annotations

import re
from typing import Any


_AMBIGUOUS_FOLLOW_UPS = (
    re.compile(r"\b(?:the|that|this) language\b", re.IGNORECASE),
    re.compile(r"^\s*(?:tell me more|what about that|can you explain more)\b", re.IGNORECASE),
)
_TOPIC_MARKERS = (
    (re.compile(r"\b(?:guam|guåhan|guahan)\b", re.IGNORECASE), "Guam"),
    (re.compile(r"\b(?:cnmi|northern mariana islands)\b", re.IGNORECASE), "CNMI"),
    (re.compile(r"\bsaipan\b", re.IGNORECASE), "Saipan"),
    (re.compile(r"\bchamorr[ou]\b", re.IGNORECASE), "CHamoru"),
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
    if not current or not any(pattern.search(current) for pattern in _AMBIGUOUS_FOLLOW_UPS):
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
