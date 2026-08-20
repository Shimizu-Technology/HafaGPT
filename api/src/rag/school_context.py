"""Conservative routing and prompt policy for operational school messages."""

from __future__ import annotations

import re


IMAGE_CONTEXT_CARD_IDS = {
    "SYM": "usage.guam.school.sym_signoff",
    "MSY": "usage.guam.school.msy_greeting",
}
_SCHOOL_CARD_TOKEN_PATTERNS = {
    "SYM": re.compile(
        r"(?<![A-Za-z0-9])S(?:[.\t ·_-]{0,3})Y"
        r"(?:[.\t ·_-]{0,3})M(?![A-Za-z0-9])",
        re.IGNORECASE,
    ),
    "MSY": re.compile(
        r"(?<![A-Za-z0-9])M(?:[.\t ·_-]{0,3})S"
        r"(?:[.\t ·_-]{0,3})Y(?![A-Za-z0-9])",
        re.IGNORECASE,
    ),
}

_MSY_TURN_OPENING_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:[-*>•]\s*)?M(?:[.\t ·_-]{0,3})S"
    r"(?:[.\t ·_-]{0,3})Y\s*[.,!:;—-]",
    re.IGNORECASE,
)
_SYM_TURN_SIGNOFF_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:[-*>•]\s*)?(?:esta\s*,?\s*)?"
    r"S(?:[.\t ·_-]{0,3})Y(?:[.\t ·_-]{0,3})M\s*[.!?]*\s*$",
    re.IGNORECASE,
)
_CHAMORRO_EXCHANGE_MARKER_PATTERN = re.compile(
    r"\b(?:kao|pat|trabiha|kada|betnes|kulot|polo|na|"
    r"p[åa]['’]?go|h[åa]fa|familia|yu['’]?os|ma['’]?[åa]se)\b",
    re.IGNORECASE,
)


_EXPLICIT_SCHOOL_MESSAGE_PATTERNS = (
    re.compile(
        r"\b(?:school|class|academy|campus)\s+"
        r"(?:announcement|message|notice|reminder|chat)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:parent|student|family)\s+(?:handbook|school\s+notice)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\bfrom\s+(?:my|our)\s+(?:daughter'?s|son'?s|child'?s)?\s*"
        r"(?:school|class|teacher)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:teacher|school|academy)\s+(?:sent|posted|shared|announced)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\bt[åa]ya['’]?\s+klas\b", re.IGNORECASE),
    re.compile(r"\bno\s+classes?\s+(?:today|tomorrow)\b", re.IGNORECASE),
)

_SCHOOL_IDENTITY_PATTERNS = (
    re.compile(r"\bhurao\b|maga['’]l[åa]hen\s+hurao", re.IGNORECASE),
    re.compile(
        r"\b(?:school|academy|campus|class|teacher|student|parent|guardian)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:eskuela|iskuela|klas|famagu['’]on|ma[ñn]aina)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:buenas|h[åa]fa\s+adai|ma[nñ]ana\s+si\s+yu['’]os)\s+familia\b"
        r".{0,160}\b(?:office|ofisina|principal)\b",
        re.IGNORECASE | re.DOTALL,
    ),
)

_OPERATIONAL_PATTERNS = (
    re.compile(
        r"\b(?:drop[ -]?off|pick[ -]?up|dismissal|gate\s+(?:opens?|closes?))\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:school|class|campus|office)\s+"
        r"(?:starts?|opens?|closes?|closed|cancelled|canceled)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?:first|last)\s+day\s+of\s+school\b", re.IGNORECASE),
    re.compile(
        r"\b(?:phone\s+lines?|water|power)\b.{0,40}"
        r"\b(?:down|out|low|closed|issue|problem)\b",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"\b(?:fanhassuyan|hinatsan\s+sal[åa]ppe['’]?|ginihan\s+familia)\b",
        re.IGNORECASE,
    ),
)


def is_school_announcement_context(
    message: str,
    *,
    image_school_signal: bool = False,
) -> bool:
    """Return true only when operational school-message evidence is present.

    A generic mention of school or a vocabulary question is intentionally not
    enough. Image-only requests rely on a separate strict vision preflight.
    """

    if image_school_signal:
        return True

    text = message or ""
    if any(pattern.search(text) for pattern in _EXPLICIT_SCHOOL_MESSAGE_PATTERNS):
        return True

    has_school_identity = any(pattern.search(text) for pattern in _SCHOOL_IDENTITY_PATTERNS)
    has_operational_content = any(pattern.search(text) for pattern in _OPERATIONAL_PATTERNS)

    if has_school_identity and has_operational_content:
        return True

    return False


def school_context_card_ids(
    message: str,
    *,
    school_announcement: bool,
) -> tuple[str, ...]:
    """Select scoped acronym cards from a trusted school routing decision.

    Dots and spaces are accepted because phones and OCR often render a compact
    sign-off as ``S.Y.M.`` or ``S Y M``. The caller must first establish school
    announcement context; an acronym alone never receives a Guam-specific card.
    """

    if not school_announcement:
        return ()
    text = message or ""
    return tuple(
        IMAGE_CONTEXT_CARD_IDS[token]
        for token, pattern in _SCHOOL_CARD_TOKEN_PATTERNS.items()
        if pattern.search(text)
    )


def contextual_school_exchange_card_ids(message: str) -> tuple[str, ...]:
    """Return reviewed cards for a strongly structured pasted school exchange.

    A bare acronym or a generic request mentioning both acronyms is not enough.
    This narrow path requires MSY in greeting position, SYM in sign-off position,
    and multiple Chamorro/local-language markers in the intervening exchange. It
    lets a pasted transcript retain the same reviewed context as a screenshot
    without labeling every use of these acronyms as Guam school usage.
    """

    text = message or ""
    if not (
        _MSY_TURN_OPENING_PATTERN.search(text)
        and _SYM_TURN_SIGNOFF_PATTERN.search(text)
    ):
        return ()

    # Count distinct message-body evidence. ``Esta`` is deliberately excluded:
    # when it introduces the accepted SYM sign-off it must not help prove the
    # school context that authorizes the sign-off card.
    local_markers = {
        match.group(0).casefold()
        for match in _CHAMORRO_EXCHANGE_MARKER_PATTERN.finditer(text)
    }
    if len(local_markers) < 2:
        return ()

    return (
        IMAGE_CONTEXT_CARD_IDS["SYM"],
        IMAGE_CONTEXT_CARD_IDS["MSY"],
    )


GENERAL_DOCUMENT_ANALYSIS_GUIDANCE = """

DOCUMENT ANALYSIS MODE
You are analyzing Chamorro language content from {doc_type}.
Be thorough and proactive - provide a COMPLETE analysis in ONE response!

REQUIRED OUTPUT FORMAT (use these exact headers):

## Document Overview
- Briefly identify each document (type, title, source if visible)

## Full Transcription
- List all Chamorro text exactly as shown (for images) or key sections (for long documents)
- Use bullet points or numbered lists for clarity

## English Translation
- Provide complete translations of all Chamorro content
- Format: **Chamorro phrase** → English meaning

## Key Information
| Category | Details |
|----------|---------|
| Dates | List any dates mentioned |
| Events | List any events, activities |
| People/Organizations | Names, contacts |
| Locations | Places mentioned |

## Grammar & Cultural Notes
- Highlight interesting Chamorro language features
- Explain cultural context where relevant

## Summary
- 2-3 sentence overview of the document's purpose and key takeaways

IMPORTANT: Always use this consistent structure. Be comprehensive but organized!
"""


IMAGE_TRANSLATION_GUIDANCE = """

IMAGE TRANSLATION MODE
The user is asking what visible text in an uploaded image means.

- Put a natural, complete English translation first. For a short conversation,
  preserve each turn and make omitted words understandable from context.
- Prefer the meaning of the whole exchange over disconnected word-for-word glosses.
  Keep contrasts, alternatives, negation, time words, and the scope of each clause
  attached to the correct idea.
- In dialogue, resolve short replies and omitted repeated words from the immediately
  preceding question. For an "A or B?" question, a standalone "not yet/still" plus
  a recurring schedule normally explains when A applies; a separate B + "today"
  phrase states the present choice. Do not merge the recurring schedule into B.
- Use the supplied lexical evidence compositionally. In clothing context, **moda**
  (fashion/custom of dress) plus a linked descriptor names a style, and **polo**
  means a polo shirt—not a pole. A color phrase linked with **na polo** describes
  the polo shirt. Keep those phrases as the alternatives in the dialogue.
- Be concise and phone-friendly. Do not produce a document overview, metadata table,
  list of people, or inventory of dates/locations unless the user asks for one.
- Do not repeat sender names, usernames, phone numbers, email addresses, timestamps,
  or app-interface text unless the user specifically asks about that metadata.
- If the text is unclear, mark the exact word or clause as **[unclear]** and translate
  the rest. Do not turn a local uncertainty into a refusal of the whole translation.
- After the translation, add only brief language notes that materially help explain
  the result. Cite governed references only for claims those references support.
- Preserve names and quoted English terms that are part of the message body. Never
  infer private facts about the people shown.
"""


SCHOOL_ANNOUNCEMENT_GUIDANCE = """

OPERATIONAL SCHOOL ANNOUNCEMENT MODE
The supplied content has strong evidence of being a school message. Use the
action-first structure below. Do not apply this structure to ordinary language,
culture, history, or general document questions.

REQUIRED OUTPUT FORMAT (use these exact headers):

## What This Means
- Start with a natural, complete English rendering in one to three short paragraphs.
- For mixed Chamorro/English text, translate the Chamorro and integrate the existing
  English into one coherent meaning without translating or repeating it awkwardly.
- Preserve names and quoted terms. Do not infer a child's identity or private facts.

## What You Need to Do
- Put every explicit parent/student action in short bullets.
- If no action is stated, say: **No action is stated.**
- Never invent a deadline, requirement, closure, or recommendation.

## Important Details
| Category | Details |
|----------|---------|
| Class or school status | Open, closed, cancelled, changed, or not stated |
| Date and time | Exact dates/times stated, or not stated |
| Location | Exact location stated, or not stated |
| Contact | Only the contact method needed for the announcement, or not stated |

## Complete Translation
- Provide a complete passage-level translation, not disconnected dictionary glosses.
- Preserve already-English wording while making the overall English easy to read.
- Identify uncertainty at the exact word or clause; do not withhold the rest.

## Original Text
- Transcribe the relevant Chamorro text exactly as supplied.
- Mark unreadable image text as **[unclear]** instead of guessing.
- Do not silently replace the writer's spelling, capitalization, apostrophes, or diacritics.

## Language Notes
- Explain only the most useful recurring phrases, abbreviations, or spelling variants.
- A normalized form may be shown separately, but never presented as though the writer used it.
- Cite only claims actually supported by supplied governed references. Do not imply that
  a partial dictionary match verifies the complete announcement.

Keep the first three sections concise enough to be useful on a phone. Detailed learning
notes belong after the actionable information.
"""


def document_analysis_guidance(doc_type: str, *, school_announcement: bool) -> str:
    """Return the appropriate attachment-analysis contract."""

    if school_announcement:
        return SCHOOL_ANNOUNCEMENT_GUIDANCE
    return GENERAL_DOCUMENT_ANALYSIS_GUIDANCE.format(doc_type=doc_type)


def content_analysis_guidance(
    message: str,
    *,
    has_images: bool,
    image_school_signal: bool = False,
    image_translation: bool = False,
) -> tuple[str, bool]:
    """Build analysis guidance and expose the routing decision to callers."""

    has_document_text = "--- Document Content" in message
    has_attachment = has_images or has_document_text
    school_announcement = is_school_announcement_context(
        message,
        image_school_signal=image_school_signal,
    )

    if has_attachment:
        if has_images and image_translation:
            return IMAGE_TRANSLATION_GUIDANCE, school_announcement
        if has_images and has_document_text:
            doc_type = "uploaded image(s) and document(s)"
        elif has_images:
            doc_type = "uploaded image(s)"
        else:
            doc_type = "uploaded document(s)"
        return (
            document_analysis_guidance(
                doc_type,
                school_announcement=school_announcement,
            ),
            school_announcement,
        )

    if school_announcement:
        return SCHOOL_ANNOUNCEMENT_GUIDANCE, True
    return "", False


def resolve_school_message_context(
    message: str,
    *,
    has_images: bool,
    image_school_signal: bool,
    image_card_ids: tuple[str, ...],
    image_translation: bool = False,
) -> tuple[str, bool, tuple[str, ...]]:
    """Resolve one shared school routing result for prompt and retrieval use."""

    guidance, school_announcement = content_analysis_guidance(
        message,
        has_images=has_images,
        image_school_signal=image_school_signal,
        image_translation=image_translation,
    )
    card_ids = tuple(
        dict.fromkeys(
            (
                *image_card_ids,
                *school_context_card_ids(
                    message,
                    school_announcement=school_announcement,
                ),
                *contextual_school_exchange_card_ids(message),
            )
        )
    )
    return guidance, school_announcement, card_ids
