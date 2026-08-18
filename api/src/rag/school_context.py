"""Conservative routing and prompt policy for operational school messages."""

from __future__ import annotations

import re


_EXPLICIT_SCHOOL_MESSAGE_PATTERNS = (
    re.compile(
        r"\b(?:school|class)\s+(?:announcement|message|notice|chat)\b",
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
        r"\b(?:reminders?|schedule|deadline|due|fundraiser|handbook|permission)\b",
        re.IGNORECASE,
    ),
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

_ACTION_OR_TIME_PATTERNS = (
    re.compile(r"\b(?:today|tomorrow|p[åa]['’]?go|agupa['’]?)\b", re.IGNORECASE),
    re.compile(
        r"\b(?:monday|tuesday|wednesday|thursday|friday|lunes|m[åa]ttes|"
        r"metkoles|huebes|betnes)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b", re.IGNORECASE),
    re.compile(
        r"\b(?:bring|review|sign|submit|contact|call|email|imel|mens[åa]hi|"
        r"put\s+fabot)\b",
        re.IGNORECASE,
    ),
)


def is_school_announcement_context(
    message: str,
    *,
    has_attachment: bool = False,
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
    has_action_or_time = any(pattern.search(text) for pattern in _ACTION_OR_TIME_PATTERNS)

    if has_school_identity and has_operational_content:
        return True

    # Extracted documents and user-labeled uploads often omit conversational
    # wrapper text, so an institution plus a concrete action/time is sufficient.
    if has_attachment and has_school_identity and has_action_or_time:
        return True

    return False


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
) -> tuple[str, bool]:
    """Build analysis guidance and expose the routing decision to callers."""

    has_document_text = "--- Document Content" in message
    has_attachment = has_images or has_document_text
    school_announcement = is_school_announcement_context(
        message,
        has_attachment=has_attachment,
        image_school_signal=image_school_signal,
    )

    if has_attachment:
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
