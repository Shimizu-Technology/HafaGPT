"""Side-effect-free intent and prompt policy for translation requests."""

from __future__ import annotations

import re
from typing import Literal


TranslationIntent = Literal[
    "none",
    "single_word_lookup",
    "passage_to_english",
    "passage_to_chamorro",
]

PASSAGE_TRANSLATION_GUIDANCE = """

MULTI-WORD TRANSLATION REQUEST:
- Give the user a useful, complete translation of the supplied phrase, sentence,
  or passage. Put the natural translation first.
- Retrieved references are corroborating evidence; they do not need to contain every
  inflected word or connective before you can translate the whole passage.
- You may apply linguistic analysis to the user-supplied text. Do not refuse the
  entire translation merely because the retrieved chunks cover only some words.
- Never imply that a partial dictionary hit verifies the complete translation.
  Cite only the words, grammar, or usage that a supplied reference actually supports.
- Preserve names and quoted English terms. If a word or construction is materially
  ambiguous, identify that exact uncertainty and give the most likely reading or
  concise alternatives instead of withholding everything.
- Do not infer a person's gender from Chamorro third-person forms or from their name.
  Use a gender-neutral English pronoun unless the user's context establishes gender.
- Do not add unrelated etymology, cultural claims, or invented example sentences.
"""

PASSAGE_WITHOUT_REFERENCE_GUIDANCE = """

No governed reference was retrieved for this multi-word translation. Still provide
a clearly presented best-effort translation of the user-supplied text. Do not invent
citations or claim that the result is source-verified. Mark only material uncertainty
at the specific word or clause where it occurs.
"""

_WORD_PATTERN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žÅåÑñ'’\-]+")
_CONTEXT_PARAGRAPH_PATTERN = re.compile(
    r"(?ix)"
    r"(?:\b(?:this|it|that)\s+(?:is|was|came)\s+from\b|"
    r"\b(?:someone|a\s+parent|the\s+teacher)\s+sent\b|"
    r"\bfor\s+context\b|\b(?:my\s+)?(?:daughter|son|child)'?s\s+(?:class|school|teacher)\b|"
    r"\b(?:a\s+parent|the\s+teacher)\s+probably\b|"
    r"\bi\s+(?:saw|got|received|found)\s+(?:it|this)\b)"
)
_CHAMORRO_PASSAGE_MARKERS = {
    "dispensa",
    "eskuela",
    "fåtto",
    "guaha",
    "håfa",
    "lao",
    "manana",
    "mañana",
    "pågo",
    "yu'os",
    "yu’os",
}


def _words(value: str) -> list[str]:
    return _WORD_PATTERN.findall(value)


def _strip_wrapping_quotes(value: str) -> str:
    return value.strip().strip(" \t\r\n'\"“”‘’")


def _select_wrapper_payload(paragraphs: list[str], query: str) -> str:
    """Choose passage text while ignoring before/after explanatory notes."""

    candidates = paragraphs[1:]
    content_candidates = [
        paragraph
        for paragraph in candidates
        if not _CONTEXT_PARAGRAPH_PATTERN.search(paragraph)
    ]
    if not content_candidates:
        content_candidates = candidates

    translating_to_chamorro = bool(
        re.search(r"(?i)\b(?:to|in)\s+chamorr[ou]\b", query)
    )
    if translating_to_chamorro:
        # English prose alone cannot reliably distinguish an unlabeled passage
        # from an unlabeled before/after note. Preserve every non-recognized
        # paragraph so context can never replace or erase the requested text.
        return "\n\n".join(content_candidates)

    def passage_score(paragraph: str) -> tuple[int, int]:
        words = _words(paragraph)
        normalized_words = {word.casefold() for word in words}
        chamorro_markers = len(normalized_words & _CHAMORRO_PASSAGE_MARKERS)
        chamorro_orthography = len(re.findall(r"[åÅñÑ]|\w[’']\w", paragraph))
        language_score = 5 * (chamorro_markers + chamorro_orthography)
        return language_score + min(len(words), 40), len(words)

    return max(content_candidates, key=passage_score)


def extract_translation_payload(query: str) -> str:
    """Extract the text being translated without treating ``this`` as a word."""

    normalized = query.strip()
    if not normalized:
        return ""

    paragraphs = [part.strip() for part in re.split(r"\n\s*\n|\r?\n", normalized) if part.strip()]
    if len(paragraphs) > 1 and re.search(
        r"(?i)\b(?:what does this mean|what does this say|translate this|what is this saying)\b",
        paragraphs[0],
    ):
        return _strip_wrapping_quotes(_select_wrapper_payload(paragraphs, normalized))

    wrapper_match = re.search(
        r"(?is)\b(?:what does this mean|what does this say|what is this saying)\s*\?\s*(.+)$",
        normalized,
    )
    if wrapper_match:
        return _strip_wrapping_quotes(wrapper_match.group(1))

    quoted_candidates = [
        match.group(1).strip()
        for match in re.finditer(r"[\"“](.+?)[\"”]", normalized, re.DOTALL)
        if match.group(1).strip()
    ]
    quoted_candidates.extend(
        match.group(1).strip()
        for match in re.finditer(
            r"(?:^|\s)[‘'](.+?)[’'](?=\s|$|[?.!,])",
            normalized,
            re.DOTALL,
        )
        if match.group(1).strip()
    )
    if quoted_candidates:
        return max(quoted_candidates, key=lambda value: len(_words(value)))

    say_match = re.search(
        r"(?is)\bhow do (?:you|i) say\s*[-:–—]?\s*(.+?)(?:\s*[-–—]?\s+in\s+chamorr[ou])?(?:\?|$)",
        normalized,
    )
    if say_match:
        return _strip_wrapping_quotes(say_match.group(1))

    translate_match = re.search(
        r"(?is)\btranslate(?:\s+this(?:\s+(?:sentence|paragraph|message|phrase))?)?\s*[-:–—]?\s*(.+?)(?:\s+to\s+(?:english|chamorr[ou]))(?:\?|$)",
        normalized,
    )
    if translate_match:
        return _strip_wrapping_quotes(translate_match.group(1))

    translate_match = re.search(
        r"(?is)\btranslate(?:\s+this(?:\s+(?:sentence|paragraph|message|phrase))?)?\s*[-:–—]?\s*(.+?)(?:\?|$)",
        normalized,
    )
    if translate_match:
        return _strip_wrapping_quotes(translate_match.group(1))

    meaning_match = re.search(
        r"(?is)\bwhat does\s+(.+?)\s+mean(?:\s+in\s+english)?[?.!]*$",
        normalized,
    )
    if meaning_match:
        candidate = _strip_wrapping_quotes(meaning_match.group(1))
        if candidate.casefold() not in {"this", "it", "that"}:
            return candidate

    return ""


def classify_translation_request(query: str) -> TranslationIntent:
    """Distinguish word lookup from multi-word translation in either direction."""

    query_lower = query.casefold()
    has_translation_cue = bool(
        re.search(
            r"\b(?:translate|how do (?:you|i) say|what does .+ mean|what does this say|what is this saying)\b",
            query_lower,
            re.DOTALL,
        )
    )
    if not has_translation_cue:
        return "none"

    if not re.search(r"\b(?:translate|how do (?:you|i) say)\b", query_lower):
        contextual_non_translation = (
            "culture",
            "cultural",
            "tradition",
            "historical",
            "historically",
            "etymology",
        )
        if any(marker in query_lower for marker in contextual_non_translation):
            return "none"

    payload = extract_translation_payload(query)
    payload_words = _words(payload)
    if len(payload_words) <= 1:
        return "single_word_lookup"

    if re.search(r"\b(?:to|in)\s+chamorr[ou]\b", query_lower) or re.search(
        r"\bhow do (?:you|i) say\b", query_lower
    ):
        return "passage_to_chamorro"
    return "passage_to_english"


def is_passage_translation(query: str) -> bool:
    return classify_translation_request(query).startswith("passage_")


def translation_prompt_guidance(query: str, *, has_references: bool) -> str:
    """Return the passage-specific instruction block, if the request needs one."""

    if not is_passage_translation(query):
        return ""
    guidance = PASSAGE_TRANSLATION_GUIDANCE
    if not has_references:
        guidance += PASSAGE_WITHOUT_REFERENCE_GUIDANCE
    return guidance
