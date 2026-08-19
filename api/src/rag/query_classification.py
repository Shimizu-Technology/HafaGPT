"""Side-effect-free classification of the evidence role needed for a query."""

from __future__ import annotations

import re

from src.rag.translation_policy import classify_translation_request


def detect_query_type(query: str) -> str:
    """Return lookup, educational, usage, cultural, or historical."""

    query_lower = query.lower()

    historical_keywords = [
        "historical",
        "historically",
        "old chamorro",
        "older chamorro",
        "ancient chamorro",
        "etymology",
        "etymological",
        "word origin",
        "in 1865",
    ]
    if any(keyword in query_lower for keyword in historical_keywords):
        return "historical"

    cultural_keywords = [
        "culture",
        "cultural",
        "custom",
        "tradition",
        "traditional",
        "history of guam",
        "legend",
        "folklore",
        "values",
    ]
    if any(keyword in query_lower for keyword in cultural_keywords):
        return "cultural"

    language_identity_patterns = [
        r"\b(?:chamorro|chamoru)\b.{0,40}\b(?:native|indigenous|official) language\b",
        r"\b(?:native|indigenous|official) language\b.{0,40}\b(?:guam|guåhan|guahan|chamorro|chamoru)\b",
        r"\bwhat (?:is|are) (?:guam|guåhan|guahan)'?s? (?:native|official)?\s*languages?\b",
        r"\btell me about (?:guam|guåhan|guahan)'?s? language\b",
        r"\btell me about (?:the )?language (?:in|of) (?:guam|guåhan|guahan)\b",
    ]
    if any(re.search(pattern, query_lower) for pattern in language_identity_patterns):
        return "cultural"

    translation_intent = classify_translation_request(query)
    if translation_intent.startswith("passage_"):
        # Sentence and passage translation needs grammar plus lexical evidence,
        # rather than the single dictionary-headword lookup lane.
        return "educational"
    if translation_intent == "single_word_lookup":
        return "lookup"

    if "chamorro word for" in query_lower:
        return "lookup"

    broad_guam_patterns = [
        r"\btell me (?:all |everything )?about guam\b",
        r"\b(?:overview|facts|information) (?:about|on) guam\b",
        r"\bwhat is guam\b",
    ]
    if any(re.search(pattern, query_lower) for pattern in broad_guam_patterns):
        return "cultural"

    generic_lookup_patterns = [
        r"\bin chamorro\b",
        r"\bto chamorro\b",
        r"\bin english\b",
        r"\bto english\b",
        r"\bwhat (?:does|do|did)\b.+\bmean\b",
        r"\bmeaning of\b",
    ]
    if any(re.search(pattern, query_lower) for pattern in generic_lookup_patterns):
        return "lookup"

    usage_keywords = [
        "use in a sentence",
        "used in a sentence",
        "example sentence",
        "in context",
        "who writes",
        "newspaper",
        "article",
        "real-world use",
    ]
    if any(keyword in query_lower for keyword in usage_keywords):
        return "usage"

    educational_keywords = [
        "how do i",
        "how to",
        "how can i",
        "how would i",
        "teach me",
        "show me",
        "explain",
        "learn",
        "lesson",
        "grammar",
        "conjugate",
        "conjugation",
        "story",
        "stories",
        "tell me a",
        "tell me about",
        "example",
        "examples",
        "practice",
        "exercise",
        "form sentences",
        "word order",
        "sentence structure",
        "speak",
        "conversation",
        "talk about",
    ]
    if any(keyword in query_lower for keyword in educational_keywords):
        return "educational"

    return "lookup"
