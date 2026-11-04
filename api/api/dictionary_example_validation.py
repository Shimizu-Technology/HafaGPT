"""Conservative evidence checks for flattened dictionary example fields.

These checks establish display eligibility, never translation equivalence.
A rejected field ends the source block; callers must not search for a new pair.
"""

import re
import unicodedata
from pathlib import Path

from .chamorro_morphology import affix_root_candidates

ENGLISH_MIN_SHARE = 0.60
CHAMORRO_MAX_ENGLISH_SHARE = 0.25
REQUIRE_HEADWORD = True

COMMON_ENGLISH_WORDS = frozenset(
    line for line in (Path(__file__).resolve().parents[1] / 'dictionary_data' /
                      'common_english_words.txt').read_text(encoding='utf-8').splitlines()
    if line and not line.startswith('#')
)
TERMINAL_NOUNS = frozenset(
    line for line in (Path(__file__).resolve().parents[1] / 'dictionary_data' /
                      'common_english_nouns.txt').read_text(encoding='utf-8').splitlines()
    if line and not line.startswith('#')
)
# Apostrophes inside words (and final glottal stops) stay in the token. In
# particular, "na'..." must not supply the English function words "a" or "an".
WORD = re.compile(r"[^\W\d_]+(?:['’‘][^\W\d_]+)*['’‘]?", re.UNICODE)
TAXONOMY = re.compile(
    r'[a-z]{3,}(?:[-/][a-z]+)*(?: [a-z]{2,}(?:[-/][a-z]+)*\.?){0,2}'
    r'(?:\s*\([^)]*\)|[,;].*)?', re.I,
)
INCOMPLETE_ENDINGS = frozenset(
    ('a an the this these those any some many much such each every either neither my your his her our their its '
     'is are was were be been am will would shall should can could may might must '
     'to of for with from at in on into onto through and or but because if than '
     'when where why how what who which while although unless '
     'mr mrs dr non not so too very quite rather '
     # Verbs and prepositions that need a following word: "The corn plant has",
     # "blessed during", "spanked for being", "We say that you are most".
     'has have had having being during about against among around between by over under '
     'without within toward towards upon few several various both').split()
)
# A quantifier followed by an adjective that still needs its noun is a phrase cut
# short ("Japan has many different"); "many responsibilities" is complete.
QUANTIFIERS = frozenset('many few several some various'.split())
NOUN_NEEDING_ADJECTIVES = frozenset('different other similar separate such'.split())
# "because there's no", "we are all": the noun or complement is missing. These
# end a sentence only after the few words that make them a complete answer.
DEPENDENT_FINAL_WORDS = {
    'no': frozenset('say says said saying answer answered answers reply replied yes or and'.split()),
    'after': frozenset('soon shortly day days week weeks month months year years night nights time long ever '
                       'happily right just immediately later afternoon evening morning sought'.split()),
}
# A bare number after "have", "has", "with" is a count whose noun was cut off.
CUT_AFTER_NUMBER = frozenset('have has had with only about bought buy ate see saw got get need needs'.split())
NUMBER_WORDS = frozenset('three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred thousand'.split())
COMPARATIVES = frozenset(
    'faster slower greener shorter longer cleaner darker stronger weaker sweeter softer harder taller smaller '
    'bigger older younger wider richer poorer warmer deeper higher lower louder quieter nicer easier happier'.split()
)
# Word endings that mark a noun, so "the committee", "a decision", "the
# visitors" can end a sentence even when the noun is not in TERMINAL_NOUNS.
# They count only for words outside COMMON_ENGLISH_WORDS: "the other", "a
# better", and "the bigger" share the endings but need a following noun.
NOUN_SUFFIX = re.compile(
    r'(?:[a-z]{3,}(?:tion|sion|ment|ness|ity|ship|hood|ance|ence|ism|ist|ery|ure|dom|ian|eer|age|or|er|ee|ess)'
    r'|[a-z]{3,}[^sui\W]s)$'
)
AUXILIARY_CONTRACTIONS = frozenset(
    ("i'm you're he's she's it's we're they're that's there's who's what's "
     "i've you've we've they've i'll you'll he'll she'll it'll we'll they'll "
     "i'd you'd he'd she'd we'd they'd isn't aren't wasn't weren't hasn't "
     "haven't hadn't won't wouldn't can't couldn't shouldn't don't doesn't didn't").split()
)


def example_tokens(text: str) -> list[str]:
    return WORD.findall(unicodedata.normalize('NFC', text).casefold().replace('’', "'").replace('‘', "'"))


def english_share(tokens: list[str]) -> float:
    return sum(token in COMMON_ENGLISH_WORDS for token in tokens) / len(tokens) if tokens else 0.0


def _identity(token: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', token) if unicodedata.category(c) != 'Mn').replace("'", '')


def has_headword(text: str, headword: str) -> bool:
    """Exact accent/glottal-normalized token sequence, including longer words.

    A >=4-letter single headword may occur within an inflected source token.
    This is only an orthographic signal; it does not interpret morphology.
    """
    words = [_identity(token) for token in example_tokens(text)]
    target = [_identity(token) for token in example_tokens(headword)]
    if not target:
        return False
    if any(words[i:i + len(target)] == target for i in range(len(words) - len(target) + 1)):
        return True
    if len(target) == 1 and len(target[0]) >= 4 and any(target[0] in word for word in words):
        return True
    return len(target) == 1 and len(target[0]) >= 3 and _affixed_form_of(example_tokens(text), target[0])


def _affixed_form_of(tokens: list[str], root: str) -> bool:
    """A token that becomes the headword when one listed affix is removed.

    The affixes come from chamorro_morphology (infixes, prefixes, possessive
    suffixes, reduplication). This only recognizes the headword's spelling inside
    an inflected token; it never claims that the form exists.
    """
    return any(
        _identity(candidate) == root
        for token in tokens
        for candidate, _note in affix_root_candidates(token)
    )


def _complete_field(text: str, tokens: list[str], *, english: bool) -> bool:
    if not tokens or text.count('(') != text.count(')') or text.count('"') % 2:
        return False
    if any(len(token) == 1 and token not in {'a', 'i'} for token in (tokens[0], tokens[-1])):
        return False
    if re.search(r'(?:\b(?:[a-z]\.){2,}|\b(?:Mr|Mrs|Dr)\.?)\s*$', text, re.I):
        return False
    if english:
        start = text.lstrip('"\'“”‘’')
        if (not start or not start[0].isalpha()
                or tokens[-1] in INCOMPLETE_ENDINGS | AUXILIARY_CONTRACTIONS
                or re.search(r'\s+[,;:!?]', text)):
            return False
        if len(tokens) > 1 and tokens[-2] in QUANTIFIERS and tokens[-1] in NOUN_NEEDING_ADJECTIVES:
            return False
        # A field that stops at a comma, colon, or dash has more to say.
        if re.search(r'(?:[,;:(\-\u2010-\u2015\u2026]|\.\.)\s*$', text):
            return False
        if len(tokens) > 1 and tokens[-1] in DEPENDENT_FINAL_WORDS and tokens[-2] not in DEPENDENT_FINAL_WORDS[tokens[-1]]:
            return False
        if len(tokens) > 1 and tokens[-1] in NUMBER_WORDS and tokens[-2] in CUT_AFTER_NUMBER:
            return False
        if len(tokens) > 1 and tokens[-1] == 'all' and tokens[-2] in {'are', 'were'}:
            return False
        # "We say that you are most" is cut short; "the most" can end a sentence.
        if tokens[-1] == 'most' and (len(tokens) < 2 or tokens[-2] != 'the'):
            return False
        if len(tokens) > 1 and tokens[-2] in {'a', 'an', 'the'}:
            original_last = WORD.findall(text)[-1]
            # "a tourists" and "a faster" need more; "the elders" and "a joker" don't.
            singular_plural = tokens[-2] in {'a', 'an'} and tokens[-1].endswith('s') and not tokens[-1].endswith('ss')
            if (tokens[-1] not in TERMINAL_NOUNS and not original_last[0].isupper()
                    and (tokens[-1] in COMMON_ENGLISH_WORDS or tokens[-1] in COMPARATIVES or singular_plural
                         or not NOUN_SUFFIX.search(tokens[-1]))):
                return False
        # A bare auxiliary at the start needs question punctuation to establish
        # a complete clause. Missing subjects are common extraction gaps.
        if tokens[0] in {'is', 'are', 'was', 'were', 'has', 'had'} and not text.endswith('?'):
            return False
        subordinators = {'if', 'when', 'while', 'because', 'although', 'unless', 'as', 'after', 'before', 'until'}
        opening = tokens[1] if tokens[0] == 'even' and len(tokens) > 1 else tokens[0]
        if opening in subordinators:
            # A leading dependent clause needs a distinct main clause. Source
            # punctuation is the only boundary we trust; never invent one.
            _, boundary, main_clause = text.partition(',')
            main_tokens = example_tokens(main_clause)
            if not boundary or not main_tokens or main_tokens[0] in subordinators | {'and', 'or', 'but'}:
                return False
        # A subordinate clause consisting only of a subject is unfinished,
        # even though its ordinary English tokens score highly.
        for index, token in enumerate(tokens):
            if token in {'because', 'if', 'when', 'while', 'although', 'unless'}:
                tail = tokens[index + 1:]
                if not tail or (len(tail) == 1 and tail[0] in {
                    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that',
                }):
                    return False
        # A trailing U/non-U (or leading S) is a split abbreviation, even if
        # enough ordinary words elsewhere would satisfy the English ratio.
        if any(len(token) <= 2 and token not in COMMON_ENGLISH_WORDS for token in tokens):
            return False
    return True


def supported_example_pair(chamorro: str, english: str, headword: str) -> bool:
    """Require affirmative evidence on both sides of every adjacent pair."""
    ch_tokens, en_tokens = example_tokens(chamorro), example_tokens(english)
    if len(en_tokens) < 3 or english_share(en_tokens) < ENGLISH_MIN_SHARE:
        return False
    if len(ch_tokens) < 2 or english_share(ch_tokens) > CHAMORRO_MAX_ENGLISH_SHARE:
        return False
    if REQUIRE_HEADWORD and not has_headword(chamorro, headword):
        return False
    # Short ASCII-only headings cannot establish a sentence, even if a genus
    # happens to share the entry's spelling. Withhold plausible short fields.
    if any(TAXONOMY.fullmatch(' '.join(field.split())) for field in (chamorro, english)):
        return False
    return _complete_field(chamorro, ch_tokens, english=False) and _complete_field(english, en_tokens, english=True)
