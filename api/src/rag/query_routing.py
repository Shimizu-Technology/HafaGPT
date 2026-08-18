"""Side-effect-free decision for whether a chat request needs retrieval."""

from __future__ import annotations

import re


def should_use_rag(
    user_input: str,
    conversation_length: int = 0,
) -> tuple[bool, str | None]:
    """Return whether retrieval is needed and its full/light intensity."""

    del conversation_length  # Reserved for future multi-turn routing policy.
    user_lower = user_input.lower().strip()
    simple_patterns = [
        r"^(test(ing)?|testing\s*(it\s*)?(out)?|still\s*testing)[\s\?\.!,]*$",
        r"^(ok(ay)?|k|yes|no|sure|yep|nope|yeah|nah|yup)[\s\?\.!,]*$",
        r"^(thanks?|thank\s*you|ty|thx)[\s\?\.!,]*$",
        r"^(cool|nice|great|awesome|wow|lol|haha|interesting)[\s\?\.!,]*$",
        r"^(got\s*it|i\s*see|makes\s*sense|understood)[\s\?\.!,]*$",
    ]
    if any(re.search(pattern, user_lower) for pattern in simple_patterns):
        return False, None

    if any(pattern in user_lower for pattern in ("summarize", "summary", "recap", "review")):
        return False, None

    language_indicators = [
        "chamorro",
        "chamoru",
        "translate",
        "say in",
        "mean",
        "means",
        "definition",
        "grammar",
        "word for",
        "phrase",
        "pronounce",
        "spell",
        "written",
        "speak",
        "language",
        "how do i",
        "how to",
        "how can i",
        "how would",
        "what is",
        "what does",
        "what are",
        "what's",
        "tell me about",
        "tell me more",
        "explain",
        "teach me",
        "learn",
        "example",
        "guam",
        "culture",
        "history",
        "tradition",
        "people",
        "island",
        "pacific",
        "mariana",
        "indigenous",
        "native",
        "food",
        "fiesta",
        "family",
        "respect",
        "inafa'maolek",
    ]
    if any(indicator in user_lower for indicator in language_indicators):
        return True, "full"

    chamorro_greeting_patterns = [
        r"hafa\s*adai",
        r"håfa\s*adai",
        r"buenas",
        r"manana\s*si",
        r"mañana\s*si",
        r"si\s*yu'?os",
        r"adios",
        r"esta",
    ]
    if any(re.search(pattern, user_lower) for pattern in chamorro_greeting_patterns):
        return True, "light"

    english_greeting_patterns = [
        r"^(hi|hello|hey|yo|sup)[\s\?\.!,]*$",
        r"^good\s*(morning|afternoon|evening|night)[\s\?\.!,]*$",
    ]
    if any(re.search(pattern, user_lower) for pattern in english_greeting_patterns):
        return False, None

    if len(user_lower) > 15:
        question_indicators = [
            "?",
            "what",
            "how",
            "why",
            "where",
            "when",
            "who",
            "which",
            "can you",
            "could you",
            "would you",
            "do you know",
        ]
        if any(indicator in user_lower for indicator in question_indicators):
            return True, "full"

    return False, None
