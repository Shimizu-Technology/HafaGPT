"""Conservative gloss segmentation shared by search and direct tutor evidence."""

import re

from src.rag.text_normalization import normalize_chamorro_match_text

# Words after these markers are examples of the gloss, not synonyms of it. A
# marker standing alone ("such as, for example, like") is itself the gloss.
_EXAMPLE_MARKER = re.compile(
    r"(?i)(?<!\w)(?<!to )(?:such as|e\.\s?g\.|for (?:example|instance)|including|like|"
    r"(?:a |any )?(?:type|kind|sort) of)\s+\w"
)
# "said, for instance, of an ailment": an aside inside a usage note.
_PARENTHETICAL = re.compile(r"(?i)for (?:example|instance)|e\.\s?g\.?|i\.\s?e\.?")
_PREPOSITION_START = re.compile(r"(?i)(?:of|to|for|with|in|on|at|when|about)\b")
_USAGE_NOTE = re.compile(
    r"(?i)^\s*(?:(?:said|used|spoken|applied)\s+(?:of|for|to|with|when|about|in)\b|refer(?:s|ring)?\s+to\b)"
)
# "rope-like in appearance": a description of the head noun.
_DESCRIPTION = re.compile(r"(?i)\w-like\b|\bin (?:appearance|shape|colou?r|form|size|texture)\b")
# "v. Hold; seize": a part-of-speech marker opening the definition or a sense.
_POS_WORD = r"(?:noun|verb|adjective|adverb|n|v|vt|vi|adj|adv)"
_SERIES_END = re.compile(r"(?i)^(?:and|or)\s+\w")
# "in which anything occurs": a defining relative clause. "which?" or "which
# (demonstrative)" glosses the pronoun itself and is not one.
_RELATIVE_CLAUSE = re.compile(
    r"(?i)^(?:(?:in|on|at|by|from|of|to|with|for|under|through|during)\s+)?(?:which|whom|whose|where)\s+\w"
)
_OTHER_MEMBERS = re.compile(r"(?i)^(?:and|or)\s+(?:other|similar)\b")
_INFINITIVE_HEAD = re.compile(r"(?i)\w\s+to\s+\w+$")


def _complement_members(parts: list[str]) -> set[int]:
    """Members of a coordinated series that complete another member's head.

    "hard to do, make, or carry out" lists what is hard to do, and "suck
    noodles, soup, or other liquid" lists what is sucked: "make" and "soup"
    are complements of the opening member, never synonyms of the headword.
    In "time, place, or circumstances, in which anything occurs" a relative
    clause describes the whole series, so no member stands alone. Returns the
    indexes to drop; a plain synonym series ("hit, strike, or beat") has none.
    """

    end = next((index for index, part in enumerate(parts) if index >= 2 and _SERIES_END.match(part)), None)
    if end is None:
        return set()
    if end + 1 < len(parts) and _RELATIVE_CLAUSE.match(parts[end + 1]):
        return set(range(len(parts)))
    multi_word = [index for index in range(end) if len(re.findall(r"\w+", parts[index])) > 1]
    if _OTHER_MEMBERS.match(parts[end]):
        head = multi_word[-1] if multi_word else -1
        return set(range(head + 1, end + 1))
    head = next((index for index in range(end) if _INFINITIVE_HEAD.search(parts[index])), None)
    if head is not None and all(len(re.findall(r"\w+", parts[index])) <= 1 for index in range(head + 1, end)):
        return set(range(head + 1, end + 1))
    return set()


def format_definition(definition: object) -> str:
    if isinstance(definition, str):
        return definition.strip()
    if isinstance(definition, dict):
        for key in ("Definition", "definition", "df", "meaning"):
            if definition.get(key):
                return str(definition[key]).strip()
    return ""


def definition_gloss_segments(definition: object) -> tuple[tuple[str, int], ...]:
    """Index whole glosses, not line wraps or words inside descriptions.

    Newlines in the bundled dictionaries are PDF line wraps. Semicolons are
    sense separators, and so is a sentence break before a capitalized gloss
    (Chamoru.info writes "Type of plant--bambusa arundinacea. Bamboo
    (general)."). Short comma lists may be synonyms. Commas inside a
    parenthesis or a dash explanation cannot create new direct glosses.
    """
    text = " ".join(format_definition(definition).split())
    segments: list[tuple[str, int]] = []

    def add(raw: str, rank: int) -> None:
        raw = re.sub(rf"(?i)^\s*{_POS_WORD}\.\s*", "", raw)
        raw = raw.strip(" .:–—-")
        normalized = normalize_chamorro_match_text(raw)
        if normalized:
            segments.append((normalized, rank))
        plain = normalize_chamorro_match_text(re.sub(r"\([^)]*\)", " ", raw))
        if plain and plain != normalized:
            segments.append((plain, max(rank, 2)))

    # Split punctuation only outside parenthetical qualifiers. A cross-reference
    # sentence ("Also primera (female)", "See ...") is not a gloss.
    clauses = [
        clause
        for sense in re.split(r";(?![^()]*\))", text)
        for clause in re.split(r"(?<=[a-z)])\.\s+(?=[A-Z])(?![^()]*\))", sense)
        if not re.match(r"(?i)\s*(?:also|see|syn|var|cf|from|ant)\b", clause)
    ]
    # "Type of plant--<taxon>" opens a species entry. A later sentence such as
    # "Tree" describes that species rather than glossing the general word,
    # unless the source marks it "(general)" as in "Bamboo (general)".
    species_entry = bool(clauses) and bool(re.match(r"(?i)\s*type of [\w ]+?\s*(?:--|-)", clauses[0]))
    for clause_index, clause in enumerate(clauses):
        # The sentence split reads the "v" of "v. Hold" as a sentence of its
        # own; a part-of-speech marker is never a gloss.
        if re.fullmatch(rf"(?i)\s*{_POS_WORD}\s*", clause):
            continue
        clause = re.sub(rf"(?i)^\s*{_POS_WORD}\.\s+", "", clause)
        if species_entry and clause_index and not re.search(r"(?i)\(general\)", clause):
            add(clause, 3)
            continue
        add(clause, 1)
        dash_parts = re.split(r"--|\s[-–—]\s", clause, maxsplit=1)
        if len(dash_parts) == 2:
            add(dash_parts[0], 3)
            continue
        parts = [part.strip() for part in re.split(r",(?![^()]*\))", clause)]
        if len(parts) <= 1 or len(re.findall(r"\w+", clause)) > 8:
            continue
        # "said, for instance, of an ailment" is a usage note, and "sea
        # cucumber, long, rope-like in appearance" describes its head noun.
        # Neither names a synonym.
        if _USAGE_NOTE.match(clause) or any(
            _PARENTHETICAL.fullmatch(part) and _PREPOSITION_START.match(following)
            for part, following in zip(parts[1:-1], parts[2:])
        ):
            continue
        if any(_DESCRIPTION.search(part) for part in parts[1:]):
            add(parts[0], 3)
            continue
        # "sweet fruit, such as pineapple, watermelon, orange" names examples
        # of the gloss before the marker, never synonyms.
        example = next((index for index, part in enumerate(parts) if _EXAMPLE_MARKER.search(part)), None)
        if example is not None:
            parts = parts[:example]
            if len(parts) == 1:
                add(parts[0], 1)
            if len(parts) <= 1:
                continue
        # "joint of stalk of cane, bamboo, corn, etc" and "follow as a pattern,
        # model, or example" list complements; neither the complements nor
        # "etc" are synonyms.
        if re.search(r"(?i)\betc\b", clause) or re.search(
            r"(?i)\b(?:of|for|from|with)\s+\w+|^\w+ as an?\b", parts[0]
        ):
            continue
        complements = _complement_members(parts)
        if complements:
            parts = [part for index, part in enumerate(parts) if index not in complements]
            for part in parts:
                add(part, 1)
            continue
        qualifiers = ("also ", "but ", "especially ", "from ", "longer ", "shorter ",
                      "similar ", "that ", "usually ", "used ", "when ", "which ", "with ")
        if any(part.lower().startswith(qualifiers) for part in parts[1:]):
            add(parts[0], 3)
            continue
        # A continuation after a preposition is not a new synonym. The one
        # exception is a leading one- or two-word "X of" ("taste of, flavor"):
        # it names X with its complement left open, so X is a weaker gloss.
        if any(re.search(r"\b(?:of|a|an|the|to|for|with|in|on|at)\s*$", part, re.I) for part in parts[:-1]):
            head = re.fullmatch(r"(?i)(\w+(?: \w+)?) of", parts[0])
            if head and len(parts) == 2 and len(re.findall(r"\w+", clause)) <= 5 and not any(
                re.search(r"\b(?:of|a|an|the|to|for|with|in|on|at)\s*$", part, re.I) for part in parts[1:-1]
            ):
                add(head.group(1), 2)
                add(parts[1], 1)
            continue
        for part in parts:
            # "slice, cut (in slices), (R)": a bare parenthesis is a source or
            # region marker, not a gloss.
            if not re.fullmatch(r"\([^)]*\)\.?", part):
                add(part, 1)
    return tuple(dict.fromkeys(segments))
