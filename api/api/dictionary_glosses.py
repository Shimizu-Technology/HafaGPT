"""Conservative gloss segmentation shared by search and direct tutor evidence."""

import re

from src.rag.text_normalization import normalize_chamorro_match_text


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
        raw = re.sub(r"(?i)^\s*(?:noun|verb|adjective|adverb|n|v|adj|adv)\.\s*", "", raw)
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
        # "joint of stalk of cane, bamboo, corn, etc" lists examples of the
        # complement; neither the examples nor "etc" are synonyms.
        if re.search(r"(?i)\betc\b", clause) or re.search(
            r"(?i)\b(?:of|for|from|with)\s+\w+", parts[0]
        ):
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
            add(part, 1)
    return tuple(dict.fromkeys(segments))
