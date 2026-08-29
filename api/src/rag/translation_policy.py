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
- For a dialogue, resolve short answers and omitted repeated words from the preceding
  turn. Preserve the scope of alternatives, negation, recurring schedules, and
  present-time phrases instead of flattening them into one clause.
- Interpret familiar loanwords from their local sentence context. In a clothing
  exchange, for example, "polo" denotes a polo shirt, not a pole; combine dictionary
  meanings with linkers and surrounding nouns rather than translating each token
  in isolation.
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
_TRANSLATION_INSTRUCTION_PATTERN = re.compile(
    r"(?ix)"
    r"(?:^\s*(?:please|could\s+you|can\s+you|i(?:'d|\s+would)\s+like|i\s+want)\b"
    r".*\b(?:translation|translated|result|response|output|wording|tone|phrasing)\b|"
    r"\b(?:make|keep)\s+(?:it|the\s+(?:wording|translation|result))\b|"
    r"\b(?:sound|feel|read)\s+(?:more\s+)?(?:warm|gentle|natural|formal|casual|polite)\b)"
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


def _strip_matching_wrapper_quotes(value: str) -> str:
    """Remove only a complete pair of outer quotes from a lexical target."""

    cleaned = value.strip()
    quote_pairs = (
        ("\"", "\""),
        ("'", "'"),
        ("\u201c", "\u201d"),
        ("\u2018", "\u2019"),
        ("\u00ab", "\u00bb"),
    )
    for opening, closing in quote_pairs:
        if len(cleaned) >= 2 and cleaned.startswith(opening) and cleaned.endswith(closing):
            return cleaned[len(opening) : -len(closing)].strip(" \t\r\n.,!?;:")
    return cleaned


def _explicit_translation_destination(query: str) -> str:
    """Return an explicitly requested destination without reading quoted payload text."""

    instruction_text = re.sub(
        r'(?s)".*?"|\u201c.*?\u201d|\u2018.*?\u2019|\u00ab.*?\u00bb',
        " ",
        query,
    )
    wrapper_match = re.search(
        r"(?i)\btranslate\s+this(?:\s+(?:sentence|paragraph|message|phrase))?"
        r"\s+to\s+(english|chamor(?:ro|u))\b",
        instruction_text,
    )
    if wrapper_match:
        return wrapper_match.group(1).casefold()

    trailing_match = re.search(
        r"(?i)\b(?:to|in)\s+(english|chamor(?:ro|u))\b[?.!]*\s*$",
        instruction_text,
    )
    if trailing_match:
        return trailing_match.group(1).casefold()
    return ""


def _select_wrapper_payload(paragraphs: list[str], query: str) -> str:
    """Choose passage text while ignoring before/after explanatory notes."""

    candidates = paragraphs[1:]
    content_candidates = [
        paragraph
        for paragraph in candidates
        if not _CONTEXT_PARAGRAPH_PATTERN.search(paragraph)
        and not _TRANSLATION_INSTRUCTION_PATTERN.search(paragraph)
    ]
    if not content_candidates:
        content_candidates = candidates

    translating_to_chamorro = bool(
        re.search(r"(?i)\b(?:to|in)\s+chamor(?:ro|u)\b", query)
    )
    if translating_to_chamorro:
        # This value is used for intent classification, not retrieval. Preserve
        # every remaining block because English prose cannot reliably distinguish
        # an arbitrary unlabeled passage from an arbitrary unlabeled note.
        return "\n\n".join(content_candidates)

    def passage_score(paragraph: str) -> tuple[int, int]:
        words = _words(paragraph)
        normalized_words = {word.casefold() for word in words}
        chamorro_markers = len(normalized_words & _CHAMORRO_PASSAGE_MARKERS)
        chamorro_orthography = len(re.findall(r"[åÅñÑ]|\w[’']\w", paragraph))
        language_score = 5 * (chamorro_markers + chamorro_orthography)
        return language_score + min(len(words), 40), len(words)

    return max(content_candidates, key=passage_score)


def _extract_translation_payload(query: str, *, require_unambiguous: bool) -> str:
    """Extract translation text, optionally refusing ambiguous retrieval text."""

    normalized = query.strip()
    if not normalized:
        return ""

    # A single newline can be part of the source passage. Only blank lines create
    # wrapper/context boundaries.
    paragraphs = [
        part.strip()
        for part in re.split(r"(?:\r?\n)[ \t]*(?:\r?\n)+", normalized)
        if part.strip()
    ]
    if len(paragraphs) > 1 and re.search(
        r"(?i)\b(?:what does this mean|what does this say|translate this|what is this saying)\b",
        paragraphs[0],
    ):
        selected = _select_wrapper_payload(paragraphs, normalized)
        if require_unambiguous:
            candidates = [
                paragraph
                for paragraph in paragraphs[1:]
                if not _CONTEXT_PARAGRAPH_PATTERN.search(paragraph)
                and not _TRANSLATION_INSTRUCTION_PATTERN.search(paragraph)
            ]
            if len(candidates) != 1:
                return ""
            selected = candidates[0]
        return _strip_wrapping_quotes(selected)

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
        r"(?is)\bhow (?:do|would) (?:you|i) say\s*[-:–—]?\s*(.+?)(?:\?|$)",
        normalized,
    )
    if say_match:
        payload = re.sub(
            r"(?is)\s*[-–—]?\s+in\s+chamor(?:ro|u)\s*$",
            "",
            say_match.group(1),
        )
        return _strip_wrapping_quotes(payload)

    word_for_match = re.search(
        r"(?is)\b(?:what is\s+)?(?:the\s+)?chamor(?:ro|u)\s+word\s+for\s+"
        r"(.+?)[?.!]*$",
        normalized,
    )
    if word_for_match:
        return _strip_wrapping_quotes(word_for_match.group(1))

    what_is_match = re.search(
        r"(?is)\bwhat is\s+(.+?)\s+in\s+chamor(?:ro|u)[?.!]*$",
        normalized,
    )
    if what_is_match:
        return _strip_wrapping_quotes(what_is_match.group(1))

    translate_match = re.search(
        r"(?is)\btranslate(?:\s+this(?:\s+(?:sentence|paragraph|message|phrase))?)?\s*[-:–—]?\s*(.+?)(?:\s+to\s+(?:english|chamor(?:ro|u)))(?:\?|$)",
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


def extract_translation_payload(query: str) -> str:
    """Extract text for intent classification without treating ``this`` as a word."""

    return _extract_translation_payload(query, require_unambiguous=False)


def extract_translation_retrieval_payload(query: str) -> str:
    """Return passage text only when it is safe to attach retrieved citations.

    Multiple unlabeled prose blocks are inherently ambiguous. Returning no vector
    query is safer than retrieving evidence for the wrong block; the original
    message still reaches the model for a best-effort translation.
    """

    return _extract_translation_payload(query, require_unambiguous=True)


def classify_translation_request(query: str) -> TranslationIntent:
    """Distinguish word lookup from multi-word translation in either direction."""

    query_lower = query.casefold()
    has_translation_cue = bool(
        re.search(
            r"\b(?:translate|how (?:do|would) (?:you|i) say|what does .+ mean|what does this say|what is this saying)\b",
            query_lower,
            re.DOTALL,
        )
    )
    if not has_translation_cue:
        return "none"

    if not re.search(
        r"\b(?:translate|how (?:do|would) (?:you|i) say)\b", query_lower
    ):
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

    explicit_destination = _explicit_translation_destination(query)
    if explicit_destination == "english":
        return "passage_to_english"
    if explicit_destination in {"chamorro", "chamoru"}:
        return "passage_to_chamorro"
    if re.search(r"\b(?:to|in)\s+chamor(?:ro|u)\b", query_lower) or re.search(
        r"\bhow (?:do|would) (?:you|i) say\b", query_lower
    ):
        return "passage_to_chamorro"
    return "passage_to_english"


def is_passage_translation(query: str) -> bool:
    return classify_translation_request(query).startswith("passage_")


def extract_short_lexical_target(query: str, max_words: int = 4) -> str:
    """Return a short phrase that is worth an exact dictionary lookup first.

    A phrase such as ``banana tree`` is grammatically multi-word, but treating it
    only as a passage sends it straight to embeddings and can miss a dictionary
    definition that contains the exact phrase. Longer or multi-line text remains
    on the passage-translation path.
    """

    translation_intent = classify_translation_request(query)
    if translation_intent not in {"passage_to_chamorro", "passage_to_english"}:
        return ""
    payload = extract_translation_payload(query).strip()
    if not payload or "\n" in payload or len(payload) > 80:
        return ""
    payload = payload.strip(" \t.,!?;:")
    direction_language = (
        r"chamor(?:ro|u)"
        if translation_intent == "passage_to_chamorro"
        else "english"
    )
    payload = re.sub(
        rf"(?i)[\s,;:\-–—]*\b(?:in|to)\s+{direction_language}\b\s*$",
        "",
        payload,
    ).strip(" \t.,!?;:")
    payload = _strip_matching_wrapper_quotes(payload)
    if not payload:
        return ""
    words = _words(payload)
    if not 2 <= len(words) <= max_words:
        return ""
    return payload.casefold()


def translation_prompt_guidance(query: str, *, has_references: bool) -> str:
    """Return the passage-specific instruction block, if the request needs one."""

    if not is_passage_translation(query):
        return ""
    guidance = PASSAGE_TRANSLATION_GUIDANCE
    if not has_references:
        guidance += PASSAGE_WITHOUT_REFERENCE_GUIDANCE
    return guidance
