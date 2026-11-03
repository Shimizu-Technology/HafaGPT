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
_WHAT_IS = r"what(?:['’]s|\s+is)"
_CHAMORRO_FOR = (
    rf"(?:{_WHAT_IS}\s+(?:the\s+)?chamor(?:ro|u)\s+(?:word\s+|term\s+|phrase\s+)?for|"
    r"(?:the\s+)?chamor(?:ro|u)\s+(?:word|term|phrase)\s+for)"
)
_EXPLICIT_TO_CHAMORRO_LOOKUP_PATTERN = re.compile(
    rf"\b(?:{_WHAT_IS}\s+.+?\s+in\s+chamor(?:ro|u)|{_CHAMORRO_FOR})\b",
    re.IGNORECASE | re.DOTALL,
)
# Natural English-to-Chamorro requests. "day"/"sau"/"sya" tolerate common phone
# typos for "say"; none of them form an ordinary English question after "how
# would we". "write" and "put" are narrowed in ``_has_to_chamorro_cue``.
_HOW_SAY_PATTERN = re.compile(
    r"\bhow\s+(?:do|would|should|can|could|might)\s+(?:you|i|we|one)\s+"
    r"(?P<verb>say|day|sau|sya|write|put)\b",
    re.IGNORECASE,
)
_WANT_TO_SAY_PATTERN = re.compile(
    r"\b(?:i|we)(?:\s+(?:just|really|also|kind\s+of|kinda))?"
    r"(?:\s+(?:want(?:ed)?\s+to|wanna|need\s+to|would\s+like\s+to)|['’]d\s+like\s+to)"
    r"\s+say\b(?:\s+(?:something|anything)\s+like\b)?",
    re.IGNORECASE,
)
_DEICTIC_TRANSLATION_CUE_PATTERN = re.compile(
    r"(?i)\b(?:what\s+does\s+(?:(?:all|any)\s+of\s+)?this\s+(?:mean|say)|"
    r"what\s+is\s+(?:(?:all|any)\s+of\s+)?this\s+saying)\b"
)
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
    if len(paragraphs) > 1 and (
        _DEICTIC_TRANSLATION_CUE_PATTERN.search(paragraphs[0])
        or re.search(r"(?i)\btranslate\s+(?:all\s+of\s+)?this\b", paragraphs[0])
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
        r"(?is)\b(?:what\s+does\s+(?:(?:all|any)\s+of\s+)?this\s+(?:mean|say)|"
        r"what\s+is\s+(?:(?:all|any)\s+of\s+)?this\s+saying)\s*\?\s*(.+)$",
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

    say_match = _HOW_SAY_PATTERN.search(normalized)
    payload_match = (
        re.match(r"(?s)\s*[-:–—]?\s*(.+?)(?:\?|$)", normalized[say_match.end():])
        if say_match
        else None
    )
    want_match = _WANT_TO_SAY_PATTERN.search(normalized)
    if not payload_match and want_match:
        payload_match = re.match(
            r"(?s)\s*[-:–—]?\s*(.+?)\s*$", normalized[want_match.end():]
        )
    if payload_match:
        payload = re.sub(
            r"(?is)\s*[-–—]?\s+(?:in|into)\s+chamor(?:ro|u)[?.!]*\s*$",
            "",
            payload_match.group(1),
        )
        return _strip_wrapping_quotes(payload)

    word_for_match = re.search(
        rf"(?is)\b{_CHAMORRO_FOR}\s+(.+?)[?.!]*$",
        normalized,
    )
    if word_for_match:
        return _strip_wrapping_quotes(word_for_match.group(1))

    what_is_match = re.search(
        rf"(?is)\b{_WHAT_IS}\s+(.+?)\s+in\s+chamor(?:ro|u)[?.!]*$",
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


def _has_to_chamorro_cue(query: str) -> bool:
    """Recognize natural "how would we say/write" and "I want to say" requests."""

    want_match = _WANT_TO_SAY_PATTERN.search(query)
    if want_match:
        # "I want to say something to my grandma" asks for help composing, not
        # for a translation of the words "something to my grandma".
        tail = query[want_match.end():].lstrip(" \t-:–—")
        if tail and not re.match(r"(?i)(?:something|anything)\b", tail):
            return True

    say_match = _HOW_SAY_PATTERN.search(query)
    if not say_match:
        return False
    if say_match.group("verb").casefold() not in {"write", "put"}:
        return True
    if re.search(r"(?i)\b(?:in|into)\s+chamor(?:ro|u)\b", query):
        return True
    if say_match.group("verb").casefold() == "put":
        return False
    # Without a named language, "How do I write an essay?" is a writing question.
    tail = query[say_match.end():].lstrip(" \t-:–—\"“'‘")
    return bool(tail) and not re.match(
        r"(?i)(?:a|an|about|my|your|this|that|it|the\s+(?:essay|letter|report|paragraph|story))\b",
        tail,
    )


def classify_translation_request(query: str) -> TranslationIntent:
    """Distinguish word lookup from multi-word translation in either direction."""

    query_lower = query.casefold()
    explicit_to_chamorro_lookup = bool(
        _EXPLICIT_TO_CHAMORRO_LOOKUP_PATTERN.search(query)
    )
    to_chamorro_cue = _has_to_chamorro_cue(query)
    has_translation_cue = (
        explicit_to_chamorro_lookup
        or to_chamorro_cue
        or bool(_DEICTIC_TRANSLATION_CUE_PATTERN.search(query))
        or bool(
            re.search(r"\b(?:translate|what does .+ mean)\b", query_lower, re.DOTALL)
        )
    )
    if not has_translation_cue:
        return "none"

    if (
        not explicit_to_chamorro_lookup
        and not to_chamorro_cue
        and not re.search(r"\btranslate\b", query_lower)
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
    if not payload_words:
        return "none"
    if re.search(rf"\b{_CHAMORRO_FOR}\b", query_lower) and len(payload_words) <= 4:
        return "single_word_lookup"
    if len(payload_words) <= 1:
        return "single_word_lookup"

    explicit_destination = _explicit_translation_destination(query)
    if explicit_destination == "english":
        return "passage_to_english"
    if explicit_destination in {"chamorro", "chamoru"}:
        return "passage_to_chamorro"
    if re.search(r"\b(?:to|in)\s+chamor(?:ro|u)\b", query_lower) or to_chamorro_cue:
        return "passage_to_chamorro"
    return "passage_to_english"


def looks_like_chamorro(text: str) -> bool:
    """Cheap orthographic hint for undirected text; never used as evidence."""

    normalized_words = {word.casefold() for word in _words(text)}
    return bool(
        normalized_words & _CHAMORRO_PASSAGE_MARKERS
        or re.search(r"[åÅñÑ]|\w[’']\w*[’']|\w[’']$", text)
    )


def translation_direction(query: str) -> Literal["to_chamorro", "to_english", ""]:
    """Return the translation direction of a classified request, if any."""

    intent = classify_translation_request(query)
    if intent == "none":
        return ""
    if intent == "passage_to_english":
        return "to_english"
    if intent == "passage_to_chamorro":
        return "to_chamorro"
    if _explicit_translation_destination(query) == "english" or re.search(
        r"(?is)\bwhat does\b.+\bmean\b", query
    ):
        return "to_english"
    if _explicit_translation_destination(query) or _has_to_chamorro_cue(query):
        return "to_chamorro"
    if re.search(r"(?i)\b(?:to|in)\s+chamor(?:ro|u)\b|\bchamor(?:ro|u)\s+(?:word|term|phrase)?\s*for\b", query):
        return "to_chamorro"
    return "to_english" if looks_like_chamorro(extract_translation_payload(query)) else "to_chamorro"


def selected_task_translation_query(message: str) -> str:
    """Restate a message typed under the Translate task as an explicit request.

    The learner already chose "Translate", so text such as "hahaha thank you"
    is the payload rather than chat. The restatement only steers routing and
    retrieval; the model still receives the learner's original message.
    """

    text = message.strip()
    if not text or classify_translation_request(text) != "none":
        return message
    if looks_like_chamorro(text):
        if "\n" not in text and '"' not in text and len(_words(text)) <= 4:
            return f'What does "{text}" mean in English?'
        return f"Translate this to English:\n\n{text}"
    if "\n" not in text and '"' not in text and len(text) <= 200:
        return f'How do you say "{text}" in Chamorro?'
    return f"Translate this to Chamorro:\n\n{text}"


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
