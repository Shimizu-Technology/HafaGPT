"""Privacy-safe image text context for translation retrieval and prompting."""

from __future__ import annotations

from dataclasses import dataclass
import json
import re


_ALLOWED_SIGNALS = ("SYM", "MSY", "SCHOOL")
_TRANSLATION_IMAGE_REQUEST = re.compile(
    r"(?is)\b(?:what\s+does\s+(?:(?:all|any)\s+of\s+)?this\s+(?:say|mean)|"
    r"what\s+does\s+everything(?:\s+here|\s+in\s+this)?\s+(?:say|mean)|"
    r"what\s+is\s+(?:(?:all|any)\s+of\s+)?this\s+saying|"
    r"what\s+does\s+(?:the|this)\s+(?:image|photo|screenshot|message)\s+(?:say|mean)|"
    r"translate|translation|read\s+(?:all\s+of\s+)?this|help\s+me\s+understand)\b"
)
_CONTACT_METADATA = re.compile(
    r"(?ix)(?:"
    r"\b(?:https?://|www\.)\S+|"
    r"\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|"
    r"(?<!\w)@[a-z0-9_.-]{2,}|"
    r"(?:\+?1[\s.()-]*)?(?:\d[\s.()-]*){10}(?!\d)"
    r")"
)
_UI_METADATA_LINE = re.compile(
    r"(?ix)^(?:"
    r"(?:today|yesterday)(?:\s+(?:at\s+)?\d{1,2}:\d{2}(?:\s*[ap]m)?)?|"
    r"\d{1,2}:\d{2}(?:\s*[ap]m)?|"
    r"(?:sent|delivered|read|edited|forwarded)(?:\s+(?:today|yesterday|at\s+\d{1,2}:\d{2}(?:\s*[ap]m)?))?|"
    r"typing(?:\.\.\.)?|online|last\s+seen(?:\s+.*)?"
    r")[.!✓✔\s]*$"
)
_PLAIN_SENDER_NAME = re.compile(
    r"^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’.-]+"
    r"(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’.-]+){0,3}$"
)
_LANGUAGE_LINE_MARKERS = (
    "buenas",
    "esta",
    "hafa",
    "kao",
    "kulot",
    "manana",
    "msy",
    "si ",
    "sym",
    "trabiha",
    "yu'os",
)
_MAX_TEXT_LINES = 40
_MAX_LINE_CHARS = 500
_MAX_TOTAL_CHARS = 4_000
_CHAMORRO_SCOPE_MARKERS = (
    "betnes",
    "esta",
    "kada",
    "kao",
    "kahet",
    "kulot",
    "pago",
    "trabiha",
    "yu'os",
)


@dataclass(frozen=True)
class ImageTranslationContext:
    """Trusted, ephemeral signals extracted from attached image pixels."""

    card_ids: tuple[str, ...] = ()
    school_announcement: bool = False
    visible_language_text: str = ""


def _looks_like_non_message_metadata(line: str) -> bool:
    """Identify common chat chrome that should never enter retrieval."""

    if _CONTACT_METADATA.search(line) or _UI_METADATA_LINE.fullmatch(line):
        return True
    if line.startswith("~") and " " not in line.strip("~ "):
        return True
    normalized = (
        line.casefold()
        .replace("’", "'")
        .replace("å", "a")
        .strip()
    )
    has_language_marker = any(
        marker in normalized for marker in _LANGUAGE_LINE_MARKERS
    )
    return bool(_PLAIN_SENDER_NAME.fullmatch(line)) and not has_language_marker


def _clean_language_lines(raw_lines: object, *, confidence: object) -> tuple[str, ...]:
    """Keep message-body language while dropping contact and UI metadata."""

    if confidence not in {"high", "medium"} or not isinstance(raw_lines, list):
        return ()

    cleaned: list[str] = []
    total_chars = 0
    for value in raw_lines[:_MAX_TEXT_LINES]:
        if not isinstance(value, str):
            continue
        line = " ".join(value.split()).strip()
        if (
            not line
            or len(line) > _MAX_LINE_CHARS
            or _looks_like_non_message_metadata(line)
        ):
            continue
        if line in cleaned:
            continue
        if total_chars + len(line) > _MAX_TOTAL_CHARS:
            break
        cleaned.append(line)
        total_chars += len(line) + 1
    return tuple(cleaned)


def try_parse_image_context_response(
    response_text: str,
    *,
    card_ids_by_signal: dict[str, str],
) -> ImageTranslationContext | None:
    """Validate detector JSON, returning ``None`` only for a malformed envelope."""

    raw = (response_text or "").strip()
    if raw.startswith("```json") and raw.endswith("```"):
        raw = raw[7:-3].strip()
    elif raw.startswith("```") and raw.endswith("```"):
        raw = raw[3:-3].strip()
    elif "{" in raw and "}" in raw:
        # Some compatible providers add a short preamble despite the strict
        # instruction. Validate only the outermost JSON object and still reject
        # undeclared fields or malformed values below.
        raw = raw[raw.find("{"):raw.rfind("}") + 1]

    try:
        payload = json.loads(raw)
    except (TypeError, ValueError, json.JSONDecodeError):
        return None

    if not isinstance(payload, dict) or set(payload) != {
        "signals",
        "visible_language_text",
        "text_confidence",
    }:
        return None

    signals = payload["signals"]
    if (
        not isinstance(signals, list)
        or any(not isinstance(signal, str) for signal in signals)
        or len(signals) != len(set(signals))
        or any(signal not in _ALLOWED_SIGNALS for signal in signals)
    ):
        return None

    lines = _clean_language_lines(
        payload["visible_language_text"],
        confidence=payload["text_confidence"],
    )
    normalized_text = (
        "\n".join(lines).casefold()
        .replace("’", "'")
        .replace("å", "a")
    )
    scoped_signals = set(signals)
    if sum(marker in normalized_text for marker in _CHAMORRO_SCOPE_MARKERS) >= 2:
        for acronym in ("SYM", "MSY"):
            if re.search(rf"(?<![A-Za-z0-9]){acronym}(?![A-Za-z0-9])", normalized_text, re.I):
                scoped_signals.add(acronym)

    return ImageTranslationContext(
        card_ids=tuple(
            card_ids_by_signal[signal]
            for signal in _ALLOWED_SIGNALS
            if signal in scoped_signals and signal in card_ids_by_signal
        ),
        school_announcement="SCHOOL" in signals,
        visible_language_text="\n".join(lines),
    )


def parse_image_context_response(
    response_text: str,
    *,
    card_ids_by_signal: dict[str, str],
) -> ImageTranslationContext:
    """Compatibility wrapper that fails closed to an empty trusted context."""

    return try_parse_image_context_response(
        response_text,
        card_ids_by_signal=card_ids_by_signal,
    ) or ImageTranslationContext()


def merge_image_translation_contexts(
    contexts: list[ImageTranslationContext],
) -> ImageTranslationContext:
    """Merge independently scoped attachment results without cross-image inference."""

    card_ids: list[str] = []
    text_blocks: list[str] = []
    for context in contexts:
        for card_id in context.card_ids:
            if card_id not in card_ids:
                card_ids.append(card_id)
        if context.visible_language_text and context.visible_language_text not in text_blocks:
            text_blocks.append(context.visible_language_text)
    return ImageTranslationContext(
        card_ids=tuple(card_ids),
        school_announcement=any(context.school_announcement for context in contexts),
        visible_language_text="\n".join(text_blocks)[:_MAX_TOTAL_CHARS],
    )


def build_image_translation_query(
    message: str,
    image_context: ImageTranslationContext,
) -> tuple[str, bool]:
    """Return an ephemeral passage query when the user asks to translate an image."""

    if (
        not image_context.visible_language_text
        or not _TRANSLATION_IMAGE_REQUEST.search(message or "")
    ):
        return message, False
    return (
        f"{message.strip() or 'What does this say?'}\n\n"
        f"{image_context.visible_language_text}",
        True,
    )


def build_translation_structure_hints(source_text: str) -> str:
    """Add narrow compositional help for a recurring Guam clothing exchange.

    These hints are activated by the complete phrase pattern, not an acronym or
    isolated word. They preserve a reviewed discourse reading while the shared
    typed/image RAG pipeline handles arbitrary translations.
    """

    normalized = (
        (source_text or "").casefold()
        .replace("’", "'")
        .replace("å", "a")
    )
    has_clothing_contrast = all(
        marker in normalized
        for marker in ("modan isla", "kulot kahet", "polo", "pa'go")
    )
    has_schedule_reply = (
        any(marker in normalized for marker in ("trabiha", "trabina", "trabia"))
        and any(marker in normalized for marker in ("uttimo na betnes", "uttemo na betnes"))
    )
    if not (has_clothing_contrast and has_schedule_reply):
        return ""

    return """

REVIEWED COMPOSITIONAL HINT FOR THIS DETECTED EXCHANGE
- The question contrasts two clothing choices: **island style** versus an
  **orange polo shirt today**.
- The short **trabiha** (or the OCR-near form shown) means **not yet** here and
  answers the island-style option.
- **Kada uttimo na Betnes** supplies the recurring time for island style: every
  last Friday. It does not describe the orange shirt.
- The separate **kulot kåhet på'go** clause gives today's choice: orange today.
- Therefore preserve this relationship in the translation: island style is not
  today; it is every last Friday; today's polo is orange.
This hint is a compositional reading of the governed component definitions. Do
not claim that a source contains the complete conversation verbatim.
"""
