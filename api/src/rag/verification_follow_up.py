"""Recognize "are you sure?" follow-ups and list the terms they question.

When a learner asks the tutor to double-check its last answer, the follow-up
text ("Are you sure about these words?") says nothing about those words, so
retrieval on it finds nothing and the model retracts terms it cited correctly
one turn earlier. This module detects such follow-ups and pulls the Chamorro
terms out of the previous answer. The terms are only lookup keys: evidence for
them must still come from the dictionaries and the canonical ledger.
"""

from __future__ import annotations

import re

from src.rag.language_detection import is_distinctive_chamorro_token
from src.rag.text_normalization import normalize_chamorro_match_text
from src.rag.translation_policy import classify_translation_request


MAX_VERIFICATION_TERMS = 8
_MAX_FOLLOW_UP_CHARS = 240
_MAX_SPAN_WORDS = 5

_LEAD = (
    r"^\s*(?:(?:hey|ok(?:ay)?|so|but|wait|hm+|um+|uh+|and|sorry|also|just|"
    r"one\s+more\s+thing)[\s,.!…-]+)*"
)
_END = r"(?:\s+(?:please|pls|again|for\s+me|then))*\s*[?.!…]*\s*$"
_WHO = r"(?:(?:are|r)\s+(?:you|u|yu|ya)|you['’]?re|youre|ur|you|u|ya)"
_SURE = r"(?:sure|shure|sur|suer|certain|positive|confident)"
_REFERENCE = (
    r"(?:(?:all|each|every|both|any)\s+(?:of\s+)?)?"
    r"(?:(?:these|thes|theese|those|thos|the|that|this|them|it|your|ur)\b\s*)?"
    r"(?:(?:chamorro|chamoru)\s+)?"
    r"(?:words?|wrods?|terms?|answers?|translations?|spellings?|phrases?|"
    r"sentences?|message|draft|ones?|reply|response|one)?"
    r"(?:\s+you\s+(?:just\s+)?(?:gave|used|wrote|said|listed|suggested|gave\s+me)(?:\s+me)?)?"
)
_CORRECT = (
    r"(?:right|correct|accurate|true|ok|okay|legit|"
    r"spelled\s+(?:right|correctly)|"
    r"(?:a\s+)?real\s+(?:chamorro\s+|chamoru\s+)?words?|"
    r"the\s+right\s+(?:words?|terms?|spellings?|translations?))"
)
_SUBJECT = (
    r"(?:that|this|it|these|those|they|them|"
    r"(?:the|your|these|those)\s+(?:words?|terms?|answers?|translations?|spellings?|phrases?|sentences?))"
)
_VERIFICATION_BODIES = (
    # "Are you sure (about these words)?", "You're sure about all of these words?"
    rf"{_WHO}\s+(?:(?:really|totally|absolutely|100%?)\s+)?{_SURE}"
    rf"(?:\s+(?:about|of|on|with|abt|bout)\s+{_REFERENCE}"
    rf"|\s+(?:that['’]?s|that\s+is|this\s+is|it['’]?s|they['’]?re|these\s+are|those\s+are)"
    rf"\s+{_CORRECT}"
    rf"|\s+(?:you['’]?re|you\s+are)\s+(?:right|correct))?",
    # "How sure are you (about that)?"
    rf"how\s+{_SURE}\s+are\s+(?:you|u)(?:\s+(?:about|of|abt)\s+{_REFERENCE})?",
    # "Is that right?", "Are these words correct?", "Is that a real word?"
    rf"(?:is|are|was|were)\s+{_SUBJECT}\s+(?:(?:really|actually|all|definitely|even)\s+)?{_CORRECT}",
    # "Can you check the word you just gave me?", "Could you double-check that?"
    rf"(?:can|could|would|will)\s+(?:you|u)\s+(?:please\s+)?"
    rf"(?:double[\s-]?check|re-?check|check|verify|confirm)(?:\s+{_REFERENCE})?",
    # "Double-check that", "Please verify these words"
    rf"(?:please\s+)?(?:double[\s-]?check|re-?check|verify|confirm)(?:\s+{_REFERENCE})?",
    rf"(?:please\s+)?check\s+(?:that|this|it|them|these|those|again|"
    rf"(?:the|your)\s+(?:words?|terms?|answers?|translations?|spellings?))"
    rf"(?:\s+{_REFERENCE})?",
    # "Did you make that up?", "Did you spell that right?", "How do you know?"
    r"did\s+(?:you|u)\s+make\s+(?:that|this|it|those|these|them)\s+up",
    r"are\s+(?:you|u)\s+making\s+(?:that|this|it|those|these|them)\s+up",
    r"did\s+(?:you|u)\s+spell\s+(?:that|this|it|those|these|them)\s+(?:right|correctly)",
    r"how\s+do\s+(?:you|u)\s+know(?:\s+(?:that|this|it)(?:['’]?s\s+(?:right|correct))?)?",
    r"(?:really|for\s+real|seriously)",
)
_VERIFICATION_PATTERNS = tuple(
    re.compile(_LEAD + body + _END, re.IGNORECASE) for body in _VERIFICATION_BODIES
)
_SENTENCE_SPLIT = re.compile(r"(?<=[?!.…])\s+")


def is_verification_follow_up(message: str) -> bool:
    """Return whether the message asks the tutor to re-check its last answer.

    Only the wording is checked here. A caller must still confirm that the
    previous answer contains Chamorro terms, so "Are you sure?" in a chat that
    never gave any Chamorro is ordinary conversation. Questions about the
    tutor itself ("Are you sure you can help me?") and requests to check the
    learner's own text ("Can you check my sentence?") do not match.
    """

    text = (message or "").strip()
    if not text or len(text) > _MAX_FOLLOW_UP_CHARS:
        return False
    if classify_translation_request(text) != "none":
        return False
    sentences = [part for part in _SENTENCE_SPLIT.split(text) if part.strip()]

    def asks_to_verify(sentence: str) -> bool:
        return any(pattern.match(sentence) for pattern in _VERIFICATION_PATTERNS)

    # The question must lead. Later sentences may add context ("I want to send
    # it tonight.") but not a new question, which would otherwise be swallowed.
    return bool(sentences) and asks_to_verify(sentences[0]) and all(
        asks_to_verify(sentence) or "?" not in sentence for sentence in sentences[1:]
    )


_CITATION = re.compile(r"\[[^\]\n]{0,200}\](?:\([^)\n]*\))?|https?://\S+")
_EMPHASIS = (
    re.compile(r"\*\*(.+?)\*\*"),
    re.compile(r"__(.+?)__"),
    re.compile(r"(?<![*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*\w])"),
    re.compile(r"`([^`\n]+)`"),
    re.compile(r"\"([^\"\n]+)\""),
    re.compile(r"“([^”\n]+)”"),
)
_LETTER = r"A-Za-zÀ-ÖØ-öø-ÿĀ-žÅåÑñ"
_WORD = re.compile(rf"[{_LETTER}]+(?:['’ʼ‘-][{_LETTER}]*)*")
_ORTHOGRAPHY = re.compile(r"[åÅñÑ]|[A-Za-zÅåÑñ]['’ʼ‘][A-Za-zÅåÑñ]")
# Language names and markup words that match a headword but are not answers.
_NOT_TERMS = frozenset({"chamorro", "chamoru", "english", "guam", "cnmi", "saipan", "note"})


def is_chamorro_word(word: str) -> bool:
    if _ORTHOGRAPHY.search(word):
        return True
    parts = normalize_chamorro_match_text(word, repair_ocr_splits=False).split()
    return bool(parts) and all(
        part not in _NOT_TERMS and is_distinctive_chamorro_token(part) for part in parts
    )


def _clean_term(value: str) -> str:
    return " ".join(value.replace('"', " ").split()).strip(" \t.,;:!?()[]{}*_`-—–")


def _emphasized_terms(text: str) -> list[str]:
    terms = []
    for pattern in _EMPHASIS:
        for match in pattern.finditer(text):
            span = _clean_term(match.group(1))
            words = _WORD.findall(span)
            if (
                words
                and len(words) <= _MAX_SPAN_WORDS
                and all(is_chamorro_word(word) for word in words)
            ):
                terms.append((match.start(), span))
    return [span for _, span in sorted(terms)]


def _chamorro_runs(text: str) -> list[str]:
    """Return maximal runs of consecutive Chamorro words, in reading order."""

    plain = re.sub(r"[*_`\"“”]", " ", text)
    runs: list[str] = []
    for segment in re.split(r"[\n.,;:!?()\[\]{}/|—–]+|\s-\s", plain):
        current: list[str] = []
        previous_end = None
        for match in _WORD.finditer(segment):
            word = match.group(0)
            if match.start() > 0 and segment[match.start() - 1] in "'‘" and word[-1] in "'’":
                # 'asut' in single quotes: the closing quote is not a glottal stop.
                word = word[:-1]
            joined = previous_end is None or not segment[previous_end:match.start()].strip()
            previous_end = match.end()
            if not joined and current:
                runs.append(" ".join(current))
                current = []
            if is_chamorro_word(word):
                current.append(word)
            elif current:
                runs.append(" ".join(current))
                current = []
        if current:
            runs.append(" ".join(current))
    return runs


def extract_answer_terms(
    text: str, limit: int = MAX_VERIFICATION_TERMS,
) -> tuple[tuple[str, ...], bool]:
    """Return Chamorro terms from an earlier answer and whether more were found.

    Emphasized or quoted spans come first, then runs of consecutive words that
    are dictionary or ledger headwords (or carry Chamorro orthography) and are
    not common English. Citations are removed first so a source name is never
    mistaken for a term.
    """

    cleaned = _CITATION.sub(" ", text or "")
    terms: list[str] = []
    seen: set[str] = set()
    for term in _emphasized_terms(cleaned) + _chamorro_runs(cleaned):
        key = normalize_chamorro_match_text(term, repair_ocr_splits=False)
        if not key or key in seen:
            continue
        seen.add(key)
        terms.append(term)
    return tuple(terms[:limit]), len(terms) > limit


VERIFICATION_FOLLOW_UP_GUIDANCE = """

RE-CHECKING THE PREVIOUS ANSWER:
The user is asking you to double-check your previous answer. The supplied
references include a lookup for each term it gave: {terms}.{truncated}
These terms come from your own earlier answer and are not evidence by
themselves; only the supplied entries are.
- Go through those terms. For each, say whether a supplied dictionary or
  canonical ledger entry supports it, citing that source beside the term, or
  that no supplied entry covers it.
- Keep every supported term. Change a term only when a supplied entry
  contradicts it, and name that entry.
- If anything changed, end with the corrected full answer or draft.
- Do not apologize for or withdraw a supported term, and do not call the whole
  answer unverified because one word has no entry.
"""


def verification_follow_up_guidance(terms: tuple[str, ...], truncated: bool) -> str:
    return VERIFICATION_FOLLOW_UP_GUIDANCE.format(
        terms=", ".join(terms),
        truncated=(
            " Only these were looked up; the answer had more."
            if truncated
            else ""
        ),
    )
