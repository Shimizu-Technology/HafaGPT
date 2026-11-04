"""Deterministic per-word dictionary lookup that runs before vector search.

Low-resource translation improves most when each content word's dictionary
entry and the source's own example pairs are in the prompt (RESOURCE_RESEARCH
§3.2). Every translation, lookup, or composition request therefore looks up
each content word in the bundled governed dictionaries:

* Chamorro words: exact headword, accent/glottal-insensitive headword, a
  spacing-tolerant join of adjacent tokens, a narrow spelling variant, and an
  affix-stripped root that a dictionary attests.
* English words: dictionary gloss segments, with conservative inflection.

Each block is labeled by match strength. Only a gloss segment that names the
concept is "direct"; an entry that merely mentions the word inside a longer
definition is labeled as a mention, never as a translation. Nothing here
composes or rewrites Chamorro text: every form shown is a dictionary key.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field, replace

from src.rag.text_normalization import normalize_chamorro_match_text
from src.rag.translation_policy import (
    DESTINATION_PREPOSITION,
    classify_translation_request,
    extract_translation_payload,
    extract_translation_retrieval_payload,
    looks_like_chamorro,
    names_english_target,
    natural_translation_payload,
    translation_direction,
)
from src.utils.token_manager import count_tokens

from .canonical_context import (
    _bound_form_kind,
    SENSE_SCOPE_RULE,
    single_flight_cache,
    _edit_distance_at_most_one,
    _exact_dictionary_data,
    _exact_dictionary_index,
    _exact_english_gloss_index,
    _format_dictionary_definition,
    _normalize_exact_headword,
    _spelling_candidate_index,
    _spelling_candidate_key,
    spelling_coincidence_label,
)
from .chamorro_morphology import attested_root_candidates
from .dictionary_example_validation import COMMON_ENGLISH_WORDS


MAX_LEXICAL_TOKENS = 1200
MAX_LOOKUP_WORDS = 16
# Phrase spans are probed only inside the leading tokens, so a long pasted
# notice costs a fixed number of index probes. Three times the single-word
# budget leaves room for stop words and multiword terms between content words.
MAX_PHRASE_TOKENS = 3 * MAX_LOOKUP_WORDS
MAX_HEADWORDS_PER_WORD = 3
MAX_SINGLE_WORD_HEADWORDS = 5
MAX_MENTIONS_PER_WORD = 2
MAX_MENTION_DEFINITION_CHARS = 240
MAX_DEFINITION_CHARS = 320
REVISED_DICTIONARY = "Revised and updated Chamorro dictionary"

# A homograph provider maps an exact normalized headword to (meaning, metadata)
# pairs from governed entries that the bundled JSON collapsed into one key.
HomographLookup = Callable[[tuple[str, ...]], Mapping[str, Sequence[tuple[str, dict]]]]

_TOKEN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žÅåÑñ'’‑\-]+")
_IRREGULAR_ENGLISH = {
    "forgot": "forget", "forgotten": "forget", "thought": "think",
    "taught": "teach", "went": "go", "gone": "go", "said": "say",
    "children": "child", "men": "man", "women": "woman", "people": "person",
    "feet": "foot", "teeth": "tooth", "mice": "mouse", "ate": "eat",
    "eaten": "eat", "came": "come", "saw": "see", "seen": "see", "goes": "go",
}
# Request scaffolding and function words: looked up as English glosses they
# only add noise ("I want to say", "in Chamorro").
_ENGLISH_STOP_WORDS = frozenset("""
a about after again all also am an and any are as at be because been before
being but by can could did do does doing dont don't down for from had has have
having he her here hers him his how i if im i'm in into is it its it's just let
lets me my myself no nor not of off on once only or our out over please put
say she should so some something such than that the their them then there
these they this those through to too under until up very was we were what
when where which while who whom why will with would write you your yours
want wanna need like help tell ask chamorro chamoru english word words term
phrase translate translation mean means meaning okay ok oh hi hello
""".split())
_CHAMORRO_FOR_REQUEST = re.compile(rf"(?i)\b{DESTINATION_PREPOSITION}\s+chamor(?:ro|u)\b[?.!:]*")
_FOLLOW_UP_LOOKUP = re.compile(r"(?is)^\s*(?:and\s+)?(?:what|how)\s+about\s+(?P<payload>.+?)\s*[?.!]*\s*$")
_LABELED_PAYLOAD = re.compile(
    r"(?is)\b(?:(?:put|say|write)\s+(?:this|that|it)\s+in\s+chamor(?:ro|u)|"
    r"in\s+chamor(?:ro|u)|homework|worksheet|vocab(?:ulary)?|words?|list)\b"
    r"[^:\n]{0,40}:\s*(?P<payload>.+?)\s*$"
)
_COMPOSITION_REQUEST = re.compile(
    r"(?is)^\s*(?:please\s+)?(?:help\s+me|how\s+(?:do|can|would|should)\s+(?:i|we))\s+"
    r"(?P<payload>(?:say|write|tell|thank|ask|reply|answer|greet|wish)\b.+?)"
    r"\s+(?:in\s+to|into|in)\s+chamor(?:ro|u)\s*[?.!]*\s*$"
)
_QUOTED_SPAN = re.compile(r"[\"“](?P<payload>[^\"”\n]{1,80})[\"”]")
_TRAILING_CHAMORRO = re.compile(r"(?is)^\s*(?P<payload>[^?\n]{1,60}?)\s+(?:in\s+to|into|in)\s+chamor(?:ro|u)\s*[?.!]*\s*$")
_CONVERSATIONAL = re.compile(
    r"(?i)^(?:test(?:ing)?|ok(?:ay)?|k|yes|no|sure|yep|nope|yeah|nah|yup|thanks?|thank\s*you|ty|thx|"
    r"cool|nice|great|awesome|wow|lol|haha|interesting|got\s*it|i\s*see|makes\s*sense|understood|"
    r"hi|hello|hey|yo|sup|good\s*(?:morning|afternoon|evening|night))[\s?.!,]*$"
)


@dataclass(frozen=True)
class LexicalLookup:
    """Per-word evidence plus which observed words it covers."""

    context: str = ""
    sources: list[object] = field(default_factory=list)
    words: tuple[str, ...] = ()
    matched: tuple[str, ...] = ()


@dataclass(frozen=True)
class _Block:
    label: str
    display_name: str
    headword: str
    definition: object
    also: tuple[tuple[str, str], ...] = ()
    examples: tuple[tuple[str, str], ...] = ()
    citation: object | None = None


def _strip_word(token: str) -> str:
    return token.replace("’", "'").replace("‑", "-").strip("-").lstrip("'")


def warm_lexical_indexes() -> None:
    """Build the lookup indexes once, off the request path."""

    _exact_dictionary_index()
    _exact_english_gloss_index()
    _normalized_headword_index()
    _compact_headword_index()
    _spelling_candidate_index()
    _mention_index()


def lexical_lookup_request(query: str) -> tuple[str, str] | None:
    """Return (payload, direction) when a request asks for words or wording.

    Direction is ``to_chamorro``, ``to_english``, or ``either`` for a bare or
    follow-up word whose language the request does not state. The payload is
    a retrieval key only; it never replaces what the model receives.
    """

    text = (query or "").strip()
    if not text:
        return None
    intent = classify_translation_request(text)
    if intent != "none":
        payload = extract_translation_retrieval_payload(text)
        if not payload and intent == "single_word_lookup":
            payload = extract_translation_payload(text)
        direction = translation_direction(text) or "either"
        return (payload, direction) if payload else None
    payload = natural_translation_payload(text)
    if payload:
        return payload, "to_chamorro"
    composition = _COMPOSITION_REQUEST.match(text)
    if composition:
        return composition.group("payload"), "to_chamorro"
    labeled = _LABELED_PAYLOAD.search(text)
    if labeled:
        to_chamorro = re.search(r"(?i)\bchamor(?:ro|u)\b", text[:labeled.start("payload")])
        return labeled.group("payload"), "to_chamorro" if to_chamorro else "either"
    # A quoted word or phrase in a usage question is the thing to check
    # ('Is it okay to use "un rato"?').
    quoted = _QUOTED_SPAN.search(text)
    if quoted and 1 <= len(_TOKEN.findall(quoted.group("payload"))) <= 6:
        return quoted.group("payload"), "either"
    follow_up = _FOLLOW_UP_LOOKUP.match(text)
    if follow_up and len(_TOKEN.findall(follow_up.group("payload"))) <= 4:
        return follow_up.group("payload"), "either"
    trailing = _TRAILING_CHAMORRO.match(text)
    if trailing and len(_TOKEN.findall(trailing.group("payload"))) <= 6:
        return trailing.group("payload"), "to_chamorro"
    # A bare word ("brown") or a bare dictionary phrase is itself the lookup.
    # Other short messages ("good job") are conversation, not lookups.
    tokens = _TOKEN.findall(text)
    if "\n" in text or "?" in text or not tokens or len(tokens) > 3 or _CONVERSATIONAL.match(text):
        return None
    whole = " ".join(_strip_word(token) for token in tokens)
    if len(tokens) == 1 or _exact_english_gloss_index().get(
        normalize_chamorro_match_text(whole, repair_ocr_splits=False)
    ) or _exact_dictionary_index().get(_normalize_exact_headword(whole)):
        return text, "either"
    return None


# Words whose final "s" is not an inflection ("news" is not "new").
_UNINFLECTED_S = frozenset("""
news series species always perhaps lens bus gas yes its his hers ours yours theirs
this thus plus less unless chaos mathematics physics politics
""".split())


def _syllables(word: str) -> int:
    return len(re.findall(r"[aeiouy]+", word))


def _ends_cvc(word: str) -> bool:
    """Consonant-vowel-consonant ending that may double before -ed/-ing."""

    return bool(re.search(r"(?:^|[^aeiou])[aeiou][^aeiouwxy]$", word))


def _english_inflections(lemma: str) -> frozenset[str]:
    """Regular plural/third-person, past, and -ing forms of an English lemma."""

    forms = set()
    if re.search(r"[^aeiou]y$", lemma):
        forms.update((lemma[:-1] + "ies", lemma[:-1] + "ied", lemma + "ing"))
    else:
        forms.add(lemma + ("es" if re.search(r"(?:s|x|z|ch|sh)$", lemma) else "s"))
        if lemma.endswith("o"):
            forms.add(lemma + "es")
        if lemma.endswith("ie"):
            forms.update((lemma + "d", lemma[:-2] + "ying"))
        elif lemma.endswith("e"):
            forms.add(lemma + "d")
            forms.add(lemma + "ing" if lemma.endswith(("ee", "ye", "oe")) else lemma[:-1] + "ing")
        elif _ends_cvc(lemma):
            # "stop" -> "stopped"; a longer word may or may not double
            # ("admitted", "visited"), so both are accepted there.
            forms.update((lemma + lemma[-1] + "ed", lemma + lemma[-1] + "ing"))
            if _syllables(lemma) > 1:
                forms.update((lemma + "ed", lemma + "ing"))
        else:
            forms.update((lemma + "ed", lemma + "ing"))
    return frozenset(forms)


def _english_base_forms(normalized: str) -> tuple[str, ...]:
    """Lemmas that regularly inflect to ``normalized``, plus irregular ones.

    Each candidate is checked by re-inflecting it, so "rating" yields "rate"
    (not "rat", whose -ing form is "ratting") and "sites" yields "site" (not
    "sit"). Function words are never lemmas ("uses" is not "us").
    """

    if normalized in _UNINFLECTED_S:
        return ()
    candidates = [_IRREGULAR_ENGLISH[normalized]] if normalized in _IRREGULAR_ENGLISH else []
    for suffix, replacement in (("ies", "y"), ("ied", "y"), ("es", ""), ("s", ""), ("ed", ""), ("d", ""),
                                ("ying", "ie"), ("ing", ""), ("ing", "e")):
        if normalized.endswith(suffix):
            candidates.append(normalized[:-len(suffix)] + replacement)
    for suffix in ("ed", "ing"):
        stem = normalized[:-len(suffix)] if normalized.endswith(suffix) else ""
        if len(stem) >= 4 and stem[-1] == stem[-2]:
            candidates.append(stem[:-1])
    irregular = _IRREGULAR_ENGLISH.get(normalized)
    return tuple(dict.fromkeys(
        candidate for candidate in candidates
        if candidate == irregular or (
            len(candidate) >= 3 and candidate != normalized and candidate not in _ENGLISH_STOP_WORDS
            and candidate != "us" and normalized in _english_inflections(candidate)
        )
    ))


def _english_forms(word: str) -> tuple[str, ...]:
    """The word itself first, then validated base forms."""

    normalized = normalize_chamorro_match_text(word, repair_ocr_splits=False)
    if not normalized or " " in normalized:
        return ()
    return (normalized, *_english_base_forms(normalized))


def _is_proper_name(definition: object) -> bool:
    """Keep personal/place-name records from answering an ordinary word."""

    if isinstance(definition, dict):
        part_of_speech = str(definition.get("PartOfSpeech") or definition.get("wc") or "").casefold()
    else:
        part_of_speech = ""
    text = _format_dictionary_definition(definition).casefold()
    return (
        part_of_speech.startswith("name")
        or text.startswith(("nickname for ", "surname", "first name", "family name"))
    )


def _is_affix(headword: str) -> bool:
    stripped = headword.strip()
    return stripped[:1] in "-‑‐–" or stripped[-1:] in "-‑‐–"


_AFFIX_REQUEST = re.compile(r"(?i)\b(?:prefix|suffix|infix|affix|ending)(?:es|s)?\b")


@single_flight_cache
def _normalized_headword_index() -> dict[str, tuple[tuple[str, str, object], ...]]:
    index: dict[str, list[tuple[str, str, object]]] = {}
    for display_name, dictionary in _exact_dictionary_data():
        for headword, definition in dictionary.items():
            key = normalize_chamorro_match_text(headword, repair_ocr_splits=False)
            if key:
                index.setdefault(key, []).append((display_name, headword, definition))
    return {key: tuple(values) for key, values in index.items()}


@single_flight_cache
def _compact_headword_index() -> dict[str, tuple[str, ...]]:
    """Index headwords without spaces or hyphens for phone/OCR spacing."""

    index: dict[str, set[str]] = {}
    for key in _normalized_headword_index():
        compact = key.replace(" ", "")
        if len(compact) >= 4:
            index.setdefault(compact, set()).add(key)
    return {key: tuple(sorted(values)) for key, values in index.items()}


@single_flight_cache
def _mention_index() -> dict[str, tuple[tuple[int, str, str, object], ...]]:
    """English words that occur inside short definitions without being a gloss."""

    index: dict[str, list[tuple[int, str, str, object]]] = {}
    gloss_index = _exact_english_gloss_index()
    for display_name, dictionary in _exact_dictionary_data():
        for headword, definition in dictionary.items():
            text = _format_dictionary_definition(definition)
            if not text or len(text) > MAX_MENTION_DEFINITION_CHARS:
                continue
            for word in set(normalize_chamorro_match_text(text, repair_ocr_splits=False).split()):
                if len(word) < 3 or word in _ENGLISH_STOP_WORDS:
                    continue
                if any(match[2] == headword for match in gloss_index.get(word, ())):
                    continue
                index.setdefault(word, []).append((len(text), display_name, headword, definition))
    return {
        word: tuple(sorted(values, key=lambda value: (value[0], value[2]))[:12])
        for word, values in index.items()
    }


def _examples(display_name: str, headword: str, definition: object, limit: int) -> tuple[tuple[str, str], ...]:
    """Pairs the validated dictionary parser would show; never re-paired."""

    if limit <= 0 or display_name != REVISED_DICTIONARY or not isinstance(definition, dict):
        return ()
    from .dictionary_service import DictionaryService

    pairs, _unpaired = DictionaryService._parse_examples(definition.get("Other", []), headword)
    return tuple((pair["chamorro"], pair["english"]) for pair in pairs[:limit])


def _group_key(headword: str) -> str:
    return _spelling_candidate_key(_normalize_exact_headword(headword)).replace(" ", "")


def _english_label(word: str, gloss: str, rank: int, *, bound: str = "") -> str:
    if bound:
        kind = "Bound form" if bound == "bound form" else f"Bound {bound}"
        return (f'{kind} glossed "{gloss}" (it attaches to another word; '
                f'not a standalone translation of "{word}")')
    if gloss != normalize_chamorro_match_text(word, repair_ocr_splits=False):
        # "rating" looked up as "rate": the inflected word may mean something else.
        kind = "category gloss" if rank == 3 else "gloss"
        return (f'Dictionary {kind} for "{gloss}", a possible base form of "{word}" '
                f'(English inflection inferred; not a direct gloss of "{word}", and its senses may differ)')
    if rank == 1:
        return f'Direct dictionary gloss for "{word}"'
    if rank == 2:
        return f'Direct dictionary gloss for "{word}" (the source adds a qualifier)'
    return f'Category gloss containing "{word}" (a kind of {gloss}, not necessarily the general word)'


def _english_blocks(
    word: str, gloss: str, ranked: Sequence[tuple[int, str, str, object]], example_limit: int,
    *, limit: int = MAX_HEADWORDS_PER_WORD, ranks: int = 1, allow_bound: bool = False,
) -> list[_Block]:
    """Group a gloss's headwords by spelling; one block per distinct headword.

    ``ranks`` > 1 also admits the next gloss strength ("taste of" after
    "taste"), each block labeled with its own strength. Bound prefixes and
    suffixes answer only a request that asks about affixes.
    """

    eligible = [
        match for match in ranked
        if not _is_proper_name(match[3]) and (allow_bound or not _bound_form_kind(match[2], match[3]))
    ]
    if not eligible:
        return []
    admitted = sorted({match[0] for match in eligible})[:ranks]
    # A category gloss never rides along behind a direct one.
    if admitted[0] <= 2:
        admitted = [rank for rank in admitted if rank <= 2]
    groups: dict[tuple[int, str], list[tuple[int, str, str, object]]] = {}
    group_by_key: dict[str, tuple[int, str]] = {}
    for rank in admitted:
        for match in eligible:
            if match[0] != rank:
                continue
            key = _group_key(match[2])
            # Another source's spelling of a stronger match joins that block.
            group = group_by_key.setdefault(key, (rank, key))
            groups.setdefault(group, []).append(match)
    # Stronger glosses first, then headwords several sources agree on, then shorter.
    ordered = sorted(groups.items(), key=lambda item: (
        item[0][0], -len({m[1] for m in item[1]}), len(item[1][0][2]), item[1][0][2],
    ))
    blocks = []
    for (rank, _key), group in ordered[:limit]:
        _rank, display_name, headword, definition = group[0]
        also = tuple(dict.fromkeys((m[2], m[1]) for m in group[1:] if (m[2], m[1]) != (headword, display_name)))
        label = _english_label(word, gloss, rank, bound=_bound_form_kind(headword, definition))
        blocks.append(_Block(label, display_name, headword, definition, also,
                             _examples(display_name, headword, definition, example_limit)))
    return blocks


def _mention_blocks(word: str, forms: Sequence[str]) -> list[_Block]:
    index = _mention_index()
    for form in forms:
        matches = [match for match in index.get(form, ()) if not _is_proper_name(match[3])]
        if matches:
            label = (f'Definition only mentions "{word}" inside a longer description; '
                     f'this is not a dictionary gloss or translation of "{word}"')
            return [_Block(label, display_name, headword, definition)
                    for _length, display_name, headword, definition in matches[:MAX_MENTIONS_PER_WORD]]
    return []


def _spelling_coincidences(observed: str, blocks: Sequence[_Block]) -> list[_Block]:
    """Relabel Chamorro headwords that only share an English word's spelling.

    "What is mango in Chamorro?" asks for the English concept; the headword
    "mango'" (turmeric) is not evidence for it. Weaker leads are dropped.
    """

    return [
        replace(block, label=spelling_coincidence_label(observed))
        for block in blocks if block.label.startswith(("Exact", "Headword matching"))
    ]


def _chamorro_entries(key: str, *, normalized: bool) -> tuple[tuple[str, str, object], ...]:
    if normalized:
        return _normalized_headword_index().get(key, ())
    return _exact_dictionary_index().get(key, ())


def _chamorro_blocks(observed: str, example_limit: int) -> tuple[list[_Block], list[str]]:
    """Return blocks and the exact keys eligible for additional-sense lookup."""

    exact_key = _normalize_exact_headword(observed)
    entries = _chamorro_entries(exact_key, normalized=False)
    label = f'Exact dictionary headword "{observed}"'
    if not entries:
        normalized_key = normalize_chamorro_match_text(observed, repair_ocr_splits=False)
        entries = _chamorro_entries(normalized_key, normalized=True)
        label = f'Headword matching "{observed}" when accents and glottal stops are ignored'
        if not entries and normalized_key:
            compact_keys = _compact_headword_index().get(normalized_key.replace(" ", ""), ())
            entries = tuple(entry for key in compact_keys for entry in _chamorro_entries(key, normalized=True))
            label = f'Possible spacing match for "{observed}" (not an exact transcription)'
    if not entries and len(exact_key) >= 4 and " " not in exact_key:
        related = sorted(
            headword for headword in _spelling_candidate_index().get(_spelling_candidate_key(exact_key), ())
            if headword != exact_key and _edit_distance_at_most_one(exact_key, headword)
        )[:2]
        entries = tuple(entry for headword in related for entry in _exact_dictionary_index().get(headword, ()))
        label = f'Possible spelling variant of "{observed}" (recheck the supplied spelling; not a correction)'
    if not entries and " " not in exact_key:
        def attested(root: str) -> bool:
            return bool(_chamorro_entries(_normalize_exact_headword(root), normalized=False)
                        or _chamorro_entries(normalize_chamorro_match_text(root, repair_ocr_splits=False), normalized=True))

        for root, note in attested_root_candidates(observed, attested):
            entries = (_chamorro_entries(_normalize_exact_headword(root), normalized=False)
                       or _chamorro_entries(normalize_chamorro_match_text(root, repair_ocr_splits=False), normalized=True))
            label = (f'Possible root of "{observed}": {root} ({note}); this affix analysis is a '
                     "lookup aid, not a confirmed parse")
    entries = tuple(entry for entry in entries if not _is_proper_name(entry[2])) or entries
    # Affix entries ("‑un", "man-") answer an affix, not a plain word.
    if not _is_affix(observed):
        entries = tuple(entry for entry in entries if not _is_affix(entry[1]))
    blocks = [
        _Block(label, display_name, headword, definition,
               examples=_examples(display_name, headword, definition, example_limit))
        for display_name, headword, definition in entries[:MAX_HEADWORDS_PER_WORD + 1]
    ]
    sense_keys = sorted({_normalize_exact_headword(block.headword) for block in blocks}) if blocks else []
    return blocks, sense_keys


def _homograph_blocks(keys: Sequence[str], homographs: HomographLookup | None, shown: set[str]) -> list[_Block]:
    """Senses recorded by governed entries that the bundled JSON collapsed."""

    if not homographs or not keys:
        return []
    try:
        senses = homographs(tuple(keys))
    except Exception:  # The bundled entries still answer; extra senses are optional.
        return []
    blocks = []
    for key in keys:
        for meaning, metadata in senses.get(key, ()):
            normalized_meaning = normalize_chamorro_match_text(meaning, repair_ocr_splits=False)
            if not normalized_meaning or normalized_meaning in shown:
                continue
            shown.add(normalized_meaning)
            from src.rag.source_reviews import build_citation_contract

            citation = build_citation_contract(metadata) or None
            display_name = (citation or {}).get("name") or "Chamoru.info dictionary"
            blocks.append(_Block(
                f'Another recorded sense of "{key}" (separate dictionary entry)',
                display_name, key, meaning, citation=citation,
            ))
    return blocks


def _render(block: _Block, *, shown_above: bool = False) -> str:
    if shown_above:
        # The entry is already in the exact-match block; keep only what is new.
        return "\n".join([
            f"[{block.label}: {block.headword}]",
            "Entry shown above.",
            "Also recorded as: " + "; ".join(f"{headword} ({source})" for headword, source in block.also),
        ])
    definition = _format_dictionary_definition(block.definition)
    if len(definition) > MAX_DEFINITION_CHARS:
        definition = definition[:MAX_DEFINITION_CHARS].rsplit(" ", 1)[0] + " …"
    lines = [f"[{block.label}: {block.headword}]", f"Source: {block.display_name}", f"Definition: {definition}"]
    if block.also:
        lines.append("Also recorded as: " + "; ".join(f"{headword} ({source})" for headword, source in block.also))
    for chamorro, english in block.examples:
        lines.append(f"Source example: {chamorro} — {english}")
    return "\n".join(lines)


def _already_supplied(block: _Block, supplied: str) -> bool:
    definition = _format_dictionary_definition(block.definition)
    return bool(supplied) and f"Source: {block.display_name}\nDefinition: {definition}" in supplied


def _payload_tokens(payload: str) -> list[str]:
    payload = _CHAMORRO_FOR_REQUEST.sub(" ", payload)
    return [token for token in (_strip_word(raw) for raw in _TOKEN.findall(payload)) if token]


def lexical_lookup_context(
    query: str,
    *,
    already_supplied: str = "",
    homographs: HomographLookup | None = None,
    max_tokens: int = MAX_LEXICAL_TOKENS,
) -> LexicalLookup:
    """Look up each content word of a word, translation, or wording request."""

    request = lexical_lookup_request(query)
    if not request:
        return LexicalLookup()
    payload, direction = request
    tokens = _payload_tokens(payload)
    if not tokens:
        return LexicalLookup()
    english_side = direction in {"to_chamorro", "either"}
    allow_bound = bool(_AFFIX_REQUEST.search(query))
    chamorro_side = direction in {"to_english", "either"} or looks_like_chamorro(payload)
    content_words = [token for token in tokens if token.casefold() not in _ENGLISH_STOP_WORDS]
    single_word = len(content_words) <= 2
    example_limit = 2 if single_word else 1

    per_word: list[tuple[str, list[_Block]]] = []
    covered: set[int] = set()
    sense_keys: list[str] = []

    # Phrases first ("thank you", "banana tree", "si yu'os ma'åse'").
    lowered = [token.casefold() for token in tokens]
    phrase_tokens = tokens[:MAX_PHRASE_TOKENS]
    for width in range(min(4, len(phrase_tokens)), 1, -1):
        for start in range(len(phrase_tokens) - width + 1):
            span = range(start, start + width)
            if any(position in covered for position in span):
                continue
            phrase = " ".join(phrase_tokens[start:start + width])
            if all(lowered[position] in _ENGLISH_STOP_WORDS for position in span):
                continue
            blocks: list[_Block] = []
            if english_side:
                gloss = normalize_chamorro_match_text(phrase, repair_ocr_splits=False)
                ranked = _exact_english_gloss_index().get(gloss, ())
                if ranked and ranked[0][0] <= 2:
                    blocks = _english_blocks(phrase, gloss, ranked, example_limit, allow_bound=allow_bound)
            if not blocks and chamorro_side:
                blocks, keys = _chamorro_blocks(phrase, example_limit)
                if names_english_target(phrase, query, direction):
                    blocks, keys = _spelling_coincidences(phrase, blocks), []
                sense_keys.extend(keys)
            if blocks:
                per_word.append((phrase, blocks))
                covered.update(span)

    looked_up = 0
    for position, token in enumerate(tokens):
        if position in covered or looked_up >= MAX_LOOKUP_WORDS:
            continue
        lowered_token = token.casefold()
        if lowered_token in _ENGLISH_STOP_WORDS and not (chamorro_side and not english_side):
            continue
        looked_up += 1
        is_english_word = lowered_token in COMMON_ENGLISH_WORDS
        english_blocks: list[_Block] = []
        forms = _english_forms(token) if english_side else ()
        if english_side:
            gloss_index = _exact_english_gloss_index()
            form = next((form for form in forms if form in gloss_index), "")
            if form:
                english_blocks = _english_blocks(
                    token, form, gloss_index[form], example_limit,
                    limit=MAX_SINGLE_WORD_HEADWORDS if single_word else MAX_HEADWORDS_PER_WORD,
                    ranks=2 if single_word else 1, allow_bound=allow_bound,
                )
        chamorro_blocks: list[_Block] = []
        # An English-to-Chamorro request names an English word unless the
        # token is written in Chamorro orthography.
        cross_language = names_english_target(token, query, direction)
        if chamorro_side or (english_side and not is_english_word):
            chamorro_blocks, keys = _chamorro_blocks(token, example_limit)
            strong = any(block.label.startswith(("Exact", "Headword matching")) for block in chamorro_blocks)
            if cross_language:
                chamorro_blocks = [] if english_blocks else _spelling_coincidences(token, chamorro_blocks)
                keys = []
            # In an English or undirected request, a weak spelling/root lead for
            # an English word, or beside an English gloss, is noise.
            elif direction != "to_english" and not strong and (english_blocks or is_english_word or not chamorro_side):
                chamorro_blocks, keys = [], []
            sense_keys.extend(keys)
        blocks = chamorro_blocks + english_blocks
        if not english_blocks and english_side and single_word and (not blocks or cross_language):
            blocks = _mention_blocks(token, forms) + blocks
        if blocks:
            per_word.append((token, blocks))

    shown_meanings = {
        normalize_chamorro_match_text(_format_dictionary_definition(block.definition), repair_ocr_splits=False)
        for _observed, blocks in per_word for block in blocks
    }
    homograph_blocks = _homograph_blocks(list(dict.fromkeys(sense_keys)), homographs, shown_meanings)
    return _assemble(per_word, homograph_blocks, already_supplied, max_tokens,
                     words=tuple(token for token in tokens if token.casefold() not in _ENGLISH_STOP_WORDS))


def homograph_sense_context(
    terms: Sequence[str],
    *,
    already_supplied: str = "",
    homographs: HomographLookup | None = None,
    max_tokens: int = 400,
) -> LexicalLookup:
    """Only the additional recorded senses of exact headwords in ``terms``.

    Used where the exact entries are already supplied (re-checking a previous
    answer), so one listed sense is not read as the word's only use.
    """

    keys = []
    for term in terms:
        for token in [term, *_payload_tokens(term)]:
            key = _normalize_exact_headword(_strip_word(token))
            if key and _exact_dictionary_index().get(key):
                keys.append(key)
    keys = list(dict.fromkeys(keys))
    shown = {
        normalize_chamorro_match_text(_format_dictionary_definition(definition), repair_ocr_splits=False)
        for key in keys for _display_name, _headword, definition in _exact_dictionary_index().get(key, ())
    }
    blocks = _homograph_blocks(keys, homographs, shown)
    return _assemble([], blocks, already_supplied, max_tokens, words=tuple(keys))


def _assemble(
    per_word: list[tuple[str, list[_Block]]],
    homograph_blocks: list[_Block],
    already_supplied: str,
    max_tokens: int,
    *,
    words: tuple[str, ...],
) -> LexicalLookup:
    header = [
        "=== PER-WORD DICTIONARY LOOKUPS ===",
        "Each word of the request was looked up by headword or English gloss before semantic search. "
        "The bracketed label gives the match strength: only a direct gloss or an exact or "
        "accent-insensitive headword shows the word for that concept. A mention, category, "
        "base-form, bound-affix, same-spelling, spelling, spacing, or root match is a weaker "
        "lead; say so if you rely on it.",
        SENSE_SCOPE_RULE,
        "",
    ]
    footer = ["Cite these entries by the dictionary source name shown.", "=" * 60]
    budget = max_tokens - count_tokens("\n".join(header + footer))
    rendered: list[str] = []
    sources: list[object] = []
    seen_sources: set[object] = set()
    matched: list[str] = []
    # Round-robin over words so the first words cannot spend the whole budget.
    queues = [(observed, list(blocks)) for observed, blocks in per_word]
    queues.append(("", list(homograph_blocks)))
    progressed = True
    while progressed and budget > 0:
        progressed = False
        for observed, queue in queues:
            while queue:
                block = queue.pop(0)
                shown_above = _already_supplied(block, already_supplied)
                if shown_above and not block.also:
                    if observed and observed not in matched:
                        matched.append(observed)
                    continue
                text = _render(block, shown_above=shown_above)
                cost = count_tokens(text) + 1
                if cost > budget:
                    queue.clear()
                    break
                budget -= cost
                rendered.append(text)
                progressed = True
                if observed and observed not in matched:
                    matched.append(observed)
                # Every dictionary named in "Also recorded as" is cited too.
                for source in (block.citation or (block.display_name, None),
                               *((alternate, None) for _headword, alternate in block.also)):
                    key = (source.get("source_id"), source.get("url")) if isinstance(source, dict) else source
                    if key not in seen_sources:
                        seen_sources.add(key)
                        sources.append(source)
                break
    if not rendered:
        return LexicalLookup(words=words, matched=tuple(matched))
    return LexicalLookup("\n".join(header + ["\n\n".join(rendered), ""] + footer), sources, words, tuple(matched))
