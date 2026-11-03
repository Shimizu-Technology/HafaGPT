"""Side-effect-free intent and prompt policy for translation requests."""

from __future__ import annotations

import re
from typing import Literal

from src.rag.language_detection import is_probably_chamorro


TranslationIntent = Literal[
    "none",
    "single_word_lookup",
    "passage_to_english",
    "passage_to_chamorro",
]

PASSAGE_TRANSLATION_GUIDANCE = """

TRANSLATION REQUEST (phrase, sentence, or passage):
- Put the complete natural translation first. References corroborate it; they do
  not need to contain every inflected word or connective.
- Where a supplied dictionary or canonical entry covers a concept, use that word
  (or the form the grammar requires) rather than a different word from memory,
  and cite it. A match for some words does not verify the whole translation.
- Mark only a materially uncertain word or construction, inline where it occurs,
  with the most likely reading or a short alternative.
- Preserve names and quoted English terms. In a dialogue, resolve short answers
  and omitted repeated words from the preceding turn, and keep the scope of
  alternatives, negation, recurring schedules, and present-time phrases.
- Read familiar loanwords from their sentence context. In a clothing exchange,
  for example, "polo" denotes a polo shirt, not a pole; combine dictionary
  meanings with linkers and surrounding nouns rather than translating each token
  in isolation.
- Do not infer a person's gender from Chamorro third-person forms or from their
  name. Use a gender-neutral English pronoun unless the context establishes it.
- Do not add etymology, cultural claims, or example sentences.
"""

PASSAGE_WITHOUT_REFERENCE_GUIDANCE = """
No governed reference was retrieved for this translation. Still give the complete
best-effort translation. Do not cite sources or call it verified; mark only the
specific uncertain words.
"""

_WORD_PATTERN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žÅåÑñ'’\-]+")
# "to", "in", "into", or "in to" before a destination language. Every pattern
# that reads a destination uses this one alternation, so "Translate X into
# Chamorro" can never be read as a request for English.
DESTINATION_PREPOSITION = r"(?:in\s+to|into|to|in)"
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
# would we". Ambiguous cues are narrowed in ``_accepts_natural_payload``.
_HOW_SAY_PATTERN = re.compile(
    r"\bhow\s+(?:do|would|should|can|could|might)\s+(?:you|i|we|one)\s+"
    r"(?P<verb>say|day|sau|sya|write|put)\b",
    re.IGNORECASE,
)
_WANT_TO_SAY_PATTERN = re.compile(
    r"\b(?:i|we)(?:\s+(?:just|really|also|kind\s+of|kinda))?"
    # Present-tense requests only: "I wanted to say thanks yesterday" reports
    # something already said rather than asking for Chamorro wording.
    r"(?:\s+(?:want\s+to|wanna|need\s+to|would\s+like\s+to)|['’]d\s+like\s+to)"
    r"\s+say\b(?:\s+(?:something|anything)\s+like\b)?",
    re.IGNORECASE,
)
_NAMES_CHAMORRO_PATTERN = re.compile(rf"(?i)\b{DESTINATION_PREPOSITION}\s+chamor(?:ro|u)\b")
_QUOTED_PAYLOAD_PATTERN = re.compile(
    r"[\"“][^\"”]*\w[^\"”]*[\"”]|(?:^|\s)[‘'][^’']*\w[^’']*[’'](?=\s|$|[?.!,])"
)
# Signals that a natural-cue payload is something to say to someone: laughter,
# greetings and thanks, direct address, or first-person speech.
_UTTERANCE_PATTERN = re.compile(
    r"(?ix)\b(?:"
    r"(?:ha){2,}h?|(?:he){2,}h?|lol|hey|hi|hello|bye|goodbye|yay|wow|oops|"
    r"ok(?:ay)?|yes|yeah|please|sorry|thanks?|thank\s+you|welcome|congrat\w*|cheers|"
    r"happy\s+\w+|merry\s+\w+|good\s+(?:morning|afternoon|evening|night|luck|job)|"
    r"see\s+you|take\s+care|(?:love|miss)\s+you|god\s+bless|bless\s+you|"
    r"excuse\s+me|nice\s+to\s+meet|"
    r"you|your|you['’](?:re|ll|ve|d)|y['’]all|i['’](?:ll|m|ve|d)|we['’](?:ll|re)"
    r")\b"
)
_IMPERATIVE_START_PATTERN = re.compile(
    r"(?i)(?:don['’]?t|do\s+not|never|please|let['’]?s)\b"
)
# Natural cues that are really feedback about the app or an answer, questions
# about a topic or opinion, or requests to write prose or code.
_APP_FEEDBACK_PATTERN = re.compile(
    r"(?ix)\b(?:"
    r"(?:this|the|your)\s+(?:app|application|site|website|tool|chat\s*bot|bot|"
    r"platform|feature|answer|translation|response|reply|explanation)|"
    r"h[åa]fa\s*gpt|you\s+guys"
    r")\b"
)
_TOPIC_QUESTION_PATTERN = re.compile(
    r"(?ix)\b(?:culture|cultural|traditions?|traditional|history|historical(?:ly)?|"
    r"etymology|over\s+time|ha(?:s|ve)\s+changed|opinion)\b"
)
_WRITING_TASK_PATTERN = re.compile(
    r"(?ix)\b(?:python|javascript|typescript|java|sql|html|css|code|coding|"
    r"program(?:ming)?|script|function|regex|algorithm|essay|e-?mail|letter|"
    r"resume|report|paragraph|thesis|article|blog|poem|story|summary|proposal)\b"
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
        rf"\s+{DESTINATION_PREPOSITION}\s+(english|chamor(?:ro|u))\b",
        instruction_text,
    )
    if wrapper_match:
        return wrapper_match.group(1).casefold()

    trailing_match = re.search(
        rf"(?i)\b{DESTINATION_PREPOSITION}\s+(english|chamor(?:ro|u))\b[?.!]*\s*$",
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

    translating_to_chamorro = bool(_NAMES_CHAMORRO_PATTERN.search(query))
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
            rf"(?is)\s*[-–—]?\s+{DESTINATION_PREPOSITION}\s+chamor(?:ro|u)[?.!]*\s*$",
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
        r"(?is)\btranslate(?:\s+this(?:\s+(?:sentence|paragraph|message|phrase))?)?\s*[-:–—]?\s*(.+?)"
        rf"(?:\s+{DESTINATION_PREPOSITION}\s+(?:english|chamor(?:ro|u)))(?:\?|[?.!]*$)",
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


def _natural_to_chamorro_cue(query: str) -> str:
    """Classify natural to-Chamorro phrasing as "strong", "typo", "ambiguous", or "".

    "How do/would you/I say X" has always been a translation request. "I want to
    say X", "how should we say X", and "how would we write X" are also ordinary
    English ("I want to say I love this app"), so they stay ambiguous until
    ``_accepts_natural_payload`` finds a translation signal.
    """

    say_match = _HOW_SAY_PATTERN.search(query)
    if say_match:
        verb = say_match.group("verb").casefold()
        tail = query[say_match.end():].lstrip(" \t-:–—\"“'‘")
        if verb in {"write", "put"}:
            if _NAMES_CHAMORRO_PATTERN.search(query):
                return "strong"
            # Without a named language, "How do I write an essay?" is a writing
            # question and "How do I put the app in dark mode?" is a how-to.
            if verb == "put" or not tail or re.match(
                r"(?i)(?:a|an|about|my|your|this|that|it|"
                r"the\s+(?:essay|letter|report|paragraph|story))\b",
                tail,
            ):
                return ""
            return "ambiguous"
        if verb in {"day", "sau", "sya"}:
            # "How do you day trade?" is English; otherwise these are phone
            # typos for "say", which never form an ordinary English question.
            if re.match(r"(?i)(?:trad\w*|care|dream\w*|job|off|trip|pass|camp)\b", tail):
                return ""
            return "typo"
        if re.search(r"(?i)\bhow\s+(?:do|would)\s+(?:you|i)\s+say\b", query):
            return "strong"
        return "ambiguous"

    want_match = _WANT_TO_SAY_PATTERN.search(query)
    if want_match:
        # "I want to say something to my grandma" asks for help composing, not
        # for a translation of the words "something to my grandma".
        tail = query[want_match.end():].lstrip(" \t-:–—")
        if tail and not re.match(r"(?i)(?:something|anything)\b", tail):
            return "ambiguous"
    return ""


def _natural_payload_is_excluded(query: str, payload: str) -> bool:
    """Reject app feedback, topic/opinion questions, and writing or coding tasks."""

    if _APP_FEEDBACK_PATTERN.search(payload) or _TOPIC_QUESTION_PATTERN.search(payload):
        return True
    say_match = _HOW_SAY_PATTERN.search(query)
    return bool(
        say_match
        and say_match.group("verb").casefold() == "write"
        and _WRITING_TASK_PATTERN.search(payload)
    )


def _accepts_natural_payload(query: str, cue: str) -> bool:
    """Decide whether an ambiguous or typo cue is really a translation request.

    A named Chamorro destination or a quoted payload always is. Otherwise the
    payload must not be app feedback, a topic question, or a writing task, and an
    ambiguous cue also needs a payload that reads as something said to someone:
    a greeting, thanks, laughter, direct address, or an imperative.
    """

    if cue == "strong":
        return True
    if not cue:
        return False
    if _NAMES_CHAMORRO_PATTERN.search(query) or _QUOTED_PAYLOAD_PATTERN.search(query):
        return True
    payload = extract_translation_payload(query)
    if not payload or _natural_payload_is_excluded(query, payload):
        return False
    if cue == "typo" or re.search(r"(?i)\b(?:something|anything)\s+like\b", query):
        return True
    return bool(
        _UTTERANCE_PATTERN.search(payload) or _IMPERATIVE_START_PATTERN.match(payload)
    )


def _has_to_chamorro_cue(query: str) -> bool:
    """Recognize natural "how would we say/write" and "I want to say" requests."""

    return _accepts_natural_payload(query, _natural_to_chamorro_cue(query))


def natural_translation_payload(query: str) -> str:
    """Return the payload of a natural cue that conversation context may confirm.

    "I want to say the store closes at five" carries no utterance marker, so on
    its own it stays ordinary chat. A preceding translation turn or the selected
    Translate task shows the learner wants Chamorro wording. App feedback, topic
    questions, and writing tasks are never returned.
    """

    if not _natural_to_chamorro_cue(query):
        return ""
    payload = extract_translation_payload(query)
    if not payload or _natural_payload_is_excluded(query, payload):
        return ""
    return payload


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
    if _NAMES_CHAMORRO_PATTERN.search(query_lower) or to_chamorro_cue:
        return "passage_to_chamorro"
    return "passage_to_english"


def looks_like_chamorro(text: str) -> bool:
    """Direction hint for undirected text; never used as evidence.

    Uses orthography, marker words, and a diacritic-insensitive comparison with
    local dictionary and ledger headwords, so "hafa adai" typed without å still
    reads as Chamorro.
    """

    normalized_words = {word.casefold() for word in _words(text)}
    return bool(normalized_words & _CHAMORRO_PASSAGE_MARKERS) or is_probably_chamorro(text)


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
    if _NAMES_CHAMORRO_PATTERN.search(query) or re.search(r"(?i)\bchamor(?:ro|u)\s+(?:word|term|phrase)?\s*for\b", query):
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
        rf"(?i)[\s,;:\-–—]*\b{DESTINATION_PREPOSITION}\s+{direction_language}\b\s*$",
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
