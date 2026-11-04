"""Per-word dictionary lookup before vector search (tutor T4)."""

import re
import threading

import pytest

from api.canonical_context import SENSE_SCOPE_RULE, get_canonical_tutor_context, single_flight_cache
from api.chamorro_morphology import affix_root_candidates, attested_root_candidates, strip_prefix
from api.dictionary_glosses import definition_gloss_segments
from api.dictionary_service import DictionaryService
import api.lexical_lookup as ll
from api.canonical_context import _exact_dictionary_index, _exact_english_gloss_index
from api.lexical_lookup import (
    homograph_sense_context,
    lexical_lookup_context,
    lexical_lookup_request,
)
from src.rag.chamorro_rag import _WINDOW_STOP_WORDS, window_reference
from src.rag import knowledge_cards
from src.rag.knowledge_cards import uncovered_card_clauses
from src.rag.query_routing import should_use_rag
from src.utils.token_manager import count_tokens


def _headers(context: str) -> list[str]:
    return [line for line in context.splitlines() if line.startswith("[")]


def _direct_headwords(context: str, word: str) -> set[str]:
    prefix = f'[Direct dictionary gloss for "{word}"'
    return {line.rsplit(": ", 1)[1].rstrip("]") for line in _headers(context) if line.startswith(prefix)}


@pytest.mark.parametrize(
    ("query", "payload", "direction"),
    [
        ("I want to say bamboo", "bamboo", "to_chamorro"),
        ("What about tree", "tree", "either"),
        ("How about banana?", "banana", "either"),
        ("Can you put this in Chamorro: tree", "tree", "to_chamorro"),
        ("What is taste in Chamorro?", "taste", "to_chamorro"),
        ("brown", "brown", "either"),
        ('Is it okay to use "un rato"?', "un rato", "either"),
        ("Help me understand my child’s materials homework: canoe and bamboo.", "canoe and bamboo.", "either"),
        ("Help me thank a volunteer in Chamorro.", "thank a volunteer", "to_chamorro"),
    ],
)
def test_word_and_wording_requests_get_a_lookup_payload(query, payload, direction):
    assert lexical_lookup_request(query) == (payload, direction)


@pytest.mark.parametrize("query", ["good job", "thanks", "ok", "Can you summarize our chat?", ""])
def test_conversation_is_not_a_lookup(query):
    assert lexical_lookup_request(query) is None


def test_an_english_stop_word_is_not_looked_up_per_word_even_when_glossed():
    # The dictionary glosses many entries "like", but a function word in an
    # English request is not the concept being asked about; its neighbors are.
    assert _exact_english_gloss_index().get("like")
    only_stop_word = lexical_lookup_context("What is like in Chamorro?")
    assert only_stop_word.context == "" and only_stop_word.words == ()
    with_content = lexical_lookup_context("Help me say I like banana in Chamorro")
    assert with_content.words == ("banana",)
    assert 'for "like"' not in with_content.context
    assert _direct_headwords(with_content.context, "banana")


def test_warm_up_builds_every_index_a_lookup_can_reach(monkeypatch):
    built = []
    for name in ("_exact_dictionary_index", "_exact_english_gloss_index", "_normalized_headword_index",
                 "_compact_headword_index", "_spelling_candidate_index", "_mention_index"):
        monkeypatch.setattr(ll, name, lambda name=name: built.append(name))
    ll.warm_lexical_indexes()
    assert "_mention_index" in built and len(set(built)) == 6


def test_concurrent_first_callers_share_one_index_build():
    started, release, builds = threading.Event(), threading.Event(), []

    @single_flight_cache
    def slow_index():
        builds.append(threading.get_ident())
        started.set()
        release.wait(2)
        return {"built": len(builds)}

    results = []
    workers = [threading.Thread(target=lambda: results.append(slow_index())) for _ in range(6)]
    workers[0].start()
    assert started.wait(2)
    for worker in workers[1:]:
        worker.start()
    release.set()
    for worker in workers:
        worker.join(5)

    assert len(builds) == 1 and len(results) == 6
    assert all(result is results[0] for result in results)
    slow_index.cache_clear()
    assert slow_index() == {"built": 2}


def test_a_builder_that_fails_caches_nothing_and_builders_may_nest():
    attempts = []

    @single_flight_cache
    def inner():
        attempts.append("inner")
        if len(attempts) == 1:
            raise RuntimeError("first build fails")
        return "inner"

    @single_flight_cache
    def outer():
        return inner() + "+outer"

    with pytest.raises(RuntimeError):
        outer()
    assert outer() == "inner+outer" and outer() == "inner+outer"
    assert attempts == ["inner", "inner"]


def test_a_long_passage_probes_a_bounded_number_of_phrase_spans(monkeypatch):
    probes = []
    real = ll._chamorro_blocks

    def counting(phrase, *args, **kwargs):
        probes.append(phrase)
        return real(phrase, *args, **kwargs)

    monkeypatch.setattr(ll, "_chamorro_blocks", counting)
    headwords = [h for h in _exact_dictionary_index() if h.isalpha() and 4 <= len(h) <= 9][:600]
    prefix = "Translate this Chamorro notice into English: "
    short = lexical_lookup_context(prefix + " ".join(headwords[:ll.MAX_PHRASE_TOKENS]))
    short_probes, probes[:] = len(probes), []
    long = lexical_lookup_context(prefix + " ".join(headwords))

    # Cost no longer grows with the notice, and the leading spans (longest
    # first) are answered exactly as they are without the rest of the notice.
    assert len(probes) <= short_probes + ll.MAX_LOOKUP_WORDS
    assert long.matched == short.matched
    widths = [len(s.split()) for s in probes if len(s.split()) > 1]
    assert widths == sorted(widths, reverse=True)


def test_a_phrase_inside_the_probed_window_is_still_found_in_a_long_passage():
    filler = " ".join(["school"] * 400)
    context = lexical_lookup_context(f"Translate into Chamorro: thank you {filler}").context
    assert 'for "thank you"' in context


def test_alternate_dictionary_sources_are_cited_with_the_grouped_entry():
    lookup = lexical_lookup_context("I want to say bamboo")
    assert "Also recorded as: pi'ao (Topping, Ogo, and Dungca dictionary)" in lookup.context
    names = [source[0] if isinstance(source, tuple) else source["name"] for source in lookup.sources]
    assert "Topping, Ogo, and Dungca dictionary" in names
    assert len(names) == len(set(names))


def test_bamboo_is_found_inside_a_longer_definition_without_false_direct_matches():
    context = lexical_lookup_context("I want to say bamboo").context
    assert _direct_headwords(context, "bamboo") == {"pi'ao"}
    assert "Also recorded as: pi'ao (Topping, Ogo, and Dungca dictionary)" in context
    # "joint of stalk of cane, bamboo, corn, etc." lists examples, not glosses.
    assert "gao" not in context.split()


@pytest.mark.parametrize(
    ("query", "word", "expected", "excluded"),
    [
        ("What is chicken in Chamorro?", "chicken", "mannok", "gutos"),
        ("What is food in Chamorro?", "food", "boka", "ha'ilas"),
        ("What is tree in Chamorro?", "tree", "tronkon hayu", "bånalu"),
    ],
)
def test_direct_gloss_labels_exclude_incidental_mentions(query, word, expected, excluded):
    context = lexical_lookup_context(query).context
    direct = _direct_headwords(context, word)
    assert expected in direct
    assert excluded not in direct


def test_gloss_segments_split_senses_but_not_examples_or_species_descriptions():
    assert ("bamboo", 2) in definition_gloss_segments("Type of plant--bambusa arundinacea. Bamboo (general).")
    assert ("tree", 1) not in definition_gloss_segments("Type of plant--thespesia populnea. Tree")
    assert ("bamboo", 1) not in definition_gloss_segments(
        "Node; joint of stalk of cane, bamboo, corn, etc. Section of orange or other citrus fruit."
    )
    assert ("taste", 2) in definition_gloss_segments("taste of, flavor")
    assert ("flavor", 1) in definition_gloss_segments("taste of, flavor")
    segments = definition_gloss_segments("First (male); best; first time. Also primera (female).")
    assert not any("primera" in gloss for gloss, _rank in segments)
    # The #103 regressions stay fixed.
    assert ("chicken", 1) not in definition_gloss_segments("snap off--neck of\n chicken, root")
    assert ("food", 1) not in definition_gloss_segments("general scarcity of\n food")


def test_weaker_chamorro_matches_are_labeled_as_leads():
    root = _headers(lexical_lookup_context("What does sabot-ña mean?").context)
    assert any(line.startswith('[Possible root of "sabot-ña": sabot') and "not a confirmed parse" in line
               for line in root)
    spacing = _headers(lexical_lookup_context("What does ma a nao mean?").context)
    assert any(line.startswith('[Possible spacing match for "ma a nao"') and line.endswith("ma'å'ñao]")
               for line in spacing)
    spelling = _headers(lexical_lookup_context('What does "un ihemplo" mean?').context)
    assert any(line.startswith('[Possible spelling variant of "ihemplo"') and line.endswith("ihemplu]")
               for line in spelling)


def test_affix_entries_do_not_answer_a_plain_word():
    context = lexical_lookup_context('What does "un lugåt" mean?').context
    assert '[Exact dictionary headword "un": un]' in context
    assert "‑un]" not in context


def test_single_word_lookup_keeps_more_headwords_and_the_next_gloss_strength():
    context = lexical_lookup_context("What is taste in Chamorro?").context
    assert "sabót" in context and "sabot (Topping, Ogo, and Dungca dictionary)" in context
    first = lexical_lookup_context("What is first in Chamorro?").context
    assert "primeru" in first


def test_entries_already_supplied_keep_only_their_other_spellings():
    query = "What is taste in Chamorro?"
    canonical, _ = get_canonical_tutor_context(query)
    context = lexical_lookup_context(query, already_supplied=canonical).context
    block = context.split('[Direct dictionary gloss for "taste": sabót]', 1)[1].split("\n\n", 1)[0]
    assert "Entry shown above." in block
    assert "sabot (Topping, Ogo, and Dungca dictionary)" in block
    assert "Definition:" not in block


def test_examples_are_only_the_pairs_the_validated_parser_shows():
    context = lexical_lookup_context("brown").context
    examples = [line.removeprefix("Source example: ") for line in context.splitlines()
                if line.startswith("Source example: ")]
    assert examples
    from api.canonical_context import _exact_dictionary_data

    revised = dict(_exact_dictionary_data())["Revised and updated Chamorro dictionary"]
    shown = DictionaryService._parse_examples(revised["kulót chukulåti"]["Other"], "kulót chukulåti")[0]
    assert examples == [f"{pair['chamorro']} — {pair['english']}" for pair in shown[:2]]


def test_context_stays_inside_its_token_budget():
    query = ("Translate this to Chamorro:\n\nThe children will bring food, water, flowers, bamboo, "
             "canoes, bananas, and coconuts to the school tomorrow morning before class starts.")
    lookup = lexical_lookup_context(query, max_tokens=600)
    assert lookup.context
    assert count_tokens(lookup.context) <= 600
    # Round-robin: the budget is shared across words instead of spent on the first.
    assert len(lookup.matched) >= 3


def _homographs(keys):
    senses = {"un": (("A, an, one (indefinite article).", {
        "source_id": "chamoru_info_dictionary", "source": "http://www.chamoru.info/dictionary/display.php?action=view&id=3906",
    }),)}
    return {key: senses.get(key, ()) for key in keys}


def test_collapsed_dictionary_senses_are_surfaced_as_separate_entries():
    lookup = lexical_lookup_context('Is it okay to use "un rato"?', homographs=_homographs)
    assert '[Another recorded sense of "un" (separate dictionary entry): un]' in lookup.context
    assert "Definition: A, an, one (indefinite article)." in lookup.context
    assert SENSE_SCOPE_RULE in lookup.context
    assert any(isinstance(source, dict) and source.get("source_id") == "chamoru_info_dictionary"
               for source in lookup.sources)


def test_a_failing_sense_provider_leaves_the_bundled_entries():
    def broken(_keys):
        raise RuntimeError("database unavailable")

    lookup = lexical_lookup_context('What does "un lugåt" mean?', homographs=broken)
    assert '[Exact dictionary headword "un": un]' in lookup.context
    assert "Another recorded sense" not in lookup.context


def test_recheck_terms_gain_only_the_collapsed_senses():
    lookup = homograph_sense_context(("un", "tronkon håyu"), homographs=_homographs)
    assert _headers(lookup.context) == ['[Another recorded sense of "un" (separate dictionary entry): un]']
    assert homograph_sense_context(("un",), homographs=None).context == ""


def test_exact_match_header_states_the_sense_scope_rule():
    context, _sources = get_canonical_tutor_context('What does "un" mean?')
    assert SENSE_SCOPE_RULE in context


def test_morphology_keeps_only_an_attested_root():
    assert strip_prefix("na'tunok") == ("tunok", "causative")
    assert ("kåti", "actor focus infix -um-") in affix_root_candidates("kumåti")
    # guma'-hu could also be read as ga' + -um-; the first attested analysis wins.
    attested = {"guma'", "ga'"}
    assert attested_root_candidates("guma'-hu", attested.__contains__) == [("guma'", "possessive suffix (my)")]
    assert attested_root_candidates("lugåt‑mu", {"lugåt"}.__contains__) == [("lugåt", "possessive suffix (your)")]
    assert attested_root_candidates("sabot-ña", set().__contains__) == []


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("Review Chamorro colors", (True, "full")),
        ("Can you review the Chamorro words for numbers?", (True, "full")),
        ("Review vocabulary", (True, "full")),
        ("Review the words", (True, "full")),
        ("Please review my vocab", (True, "full")),
        ("Can you summarize our chat?", (False, None)),
        ("Summarize the words", (False, None)),
        ("Please review the words of my essay", (False, None)),
        ("Please review my essay", (False, None)),
    ],
)
def test_review_and_summary_words_do_not_skip_language_requests(query, expected):
    assert should_use_rag(query) == expected


def test_an_acronym_only_clause_still_reaches_vector_retrieval():
    assert uncovered_card_clauses("What is the current Guam CHamoru orthography? Why ABC?") == "Why ABC?"
    assert uncovered_card_clauses("What is the current Guam CHamoru orthography? OK.") == ""


@pytest.mark.parametrize("statement", ['I like the word "bread" a lot.', 'My kid said "bread" today.'])
def test_a_quoted_word_in_a_statement_is_not_a_lookup(statement):
    assert lexical_lookup_context(statement).context == ""


@pytest.mark.parametrize("query", [
    'Help me understand "bread"',
    'Help me understand "bread"?',
    'Give me an example with "bread"',
    'Please check "bread"',
    'I need to understand "bread"',
    '"bread"',
])
def test_a_quoted_word_in_a_question_or_request_is_a_lookup(query):
    assert lexical_lookup_request(query) == ("bread", "either")


def test_a_card_settles_only_the_clause_it_matched():
    query = "What is the current Guam CHamoru orthography? Also explain possession in detail."
    assert uncovered_card_clauses(query) == "explain possession in detail."
    assert uncovered_card_clauses("What is the current Guam CHamoru orthography?") == ""


def test_a_clause_matched_only_by_an_omitted_card_still_needs_retrieval(monkeypatch):
    # Four cards match the whole request but only three reach the prompt.
    cards = {name: {"id": name} for name in ("a", "b", "c", "d")}
    clause_matches = {
        "Explain orthography here.": ["a"],
        "Explain possession there.": ["d"],
    }

    def fake_matches(text, *, limit=3):
        found = ["a", "b", "c"] if text.startswith("Explain orthography here. ") else clause_matches.get(text, [])
        return [cards[name] for name in found][:limit]

    monkeypatch.setattr(knowledge_cards, "matching_production_cards", fake_matches)
    monkeypatch.setattr(knowledge_cards, "production_cards", lambda: list(cards.values()))

    assert uncovered_card_clauses("Explain orthography here. Explain possession there.") == "Explain possession there."
    # When the other clause's card is among those selected, it is settled.
    clause_matches["Explain possession there."] = ["b"]
    assert uncovered_card_clauses("Explain orthography here. Explain possession there.") == ""


def test_oversized_references_are_windowed_around_the_request():
    filler = "Chapter opening about word order and sound changes.\n" * 400
    passage = "Possession: a possessor agreement suffix marks the possessed noun.\n"
    content = filler + passage + filler
    windowed = window_reference(content, "explain possession in detail", max_chars=2000)
    assert passage.strip() in windowed
    assert windowed.startswith("[Excerpt: characters ")
    assert len(windowed) < 2100
    assert window_reference("short", "possession") == "short"
    head = window_reference(filler * 2, "unrelated", max_chars=500)
    assert head.startswith("Chapter opening") and re.search(r"\[Excerpt: first 500 of \d+ characters\]$", head)


def test_window_anchors_on_a_whole_word_before_a_longer_word_that_starts_with_it():
    filler = "Chapter opening about word order and sound changes.\n" * 100
    prefix_only = "The treeline and the trees were far off.\n"
    whole_word = "A tree is a tall plant.\n"
    content = prefix_only + filler * 6 + whole_word + filler * 6
    windowed = window_reference(content, "tree", max_chars=1000)
    assert whole_word.strip() in windowed and prefix_only.strip() not in windowed
    # With no whole-word occurrence, the prefix match remains the fallback.
    fallback = window_reference(prefix_only + filler * 12, "tree", max_chars=1000)
    assert "treeline" in fallback


def _scan_all_positions_window(content: str, query: str, max_chars: int) -> str:
    """The earlier window search: every match scans the whole remaining tail."""

    lowered = content.casefold()
    terms = {
        term for term in re.findall(r"[^\W\d_][\w'’]{3,}", query.casefold())
        if term not in _WINDOW_STOP_WORDS
    }
    positions = sorted(
        (match.start(), term) for term in terms
        for match in re.finditer(rf"(?<![^\W\d_]){re.escape(term)}", lowered)
    )
    best_start, best_score = positions[0][0], 0
    for index, (position, _term) in enumerate(positions):
        window_terms = {term for other, term in positions[index:] if other < position + max_chars * 2 // 3}
        if len(window_terms) > best_score:
            best_start, best_score = position, len(window_terms)
    return best_start


def test_bounded_window_scan_scores_exactly_like_the_full_tail_scan():
    import random

    rng = random.Random(7)
    vocabulary = ["possession", "suffix", "agreement", "noun", "plural", "verb", "stem", "the", "and", "of", "a"]
    for _ in range(40):
        words = [rng.choice(vocabulary) for _ in range(rng.randint(500, 1500))]
        content = " ".join(words)
        query = "explain possession suffix agreement noun plural"
        expected_start = _scan_all_positions_window(content, query, 600)
        windowed = window_reference(content, query, max_chars=600)
        header, _, body = windowed.partition("\n")
        start = int(re.search(r"characters (\d+)-", header).group(1)) - 1
        # Same anchor as the full scan, with the same one-third lead-in.
        assert start == max(0, expected_start - 600 // 3)
        assert body == content[start:start + 600]


def test_callback_and_homograph_signatures_are_annotated():
    import typing
    from src.rag.chamorro_rag import ChamorroRAG

    assert typing.get_type_hints(attested_root_candidates)["is_attested"] == typing.Callable[[str], bool]
    for name in ("dictionary_homograph_senses", "_homograph_index", "_load_homograph_index"):
        hints = typing.get_type_hints(getattr(ChamorroRAG, name))
        assert "return" in hints, name
    assert "headwords" in typing.get_type_hints(ChamorroRAG.dictionary_homograph_senses)


def _strong_headwords(context: str) -> set[str]:
    strong = ("[Direct dictionary gloss", "[Exact dictionary headword", "[Headword matching")
    return {line.rsplit(": ", 1)[1].rstrip("]") for line in _headers(context) if line.startswith(strong)}


@pytest.mark.parametrize(
    ("word", "expected"),
    [
        ("rating", ("rating", "rate")), ("sites", ("sites", "site")), ("posted", ("posted", "post", "poste")),
        ("stopped", ("stopped", "stopp", "stoppe", "stop")), ("trees", ("trees", "tree")),
        ("cities", ("cities", "city", "citie")), ("dying", ("dying", "die")), ("uses", ("uses", "use")),
        ("news", ("news",)), ("said", ("said", "say")),
    ],
)
def test_english_base_forms_must_reinflect_to_the_observed_word(word, expected):
    from api.lexical_lookup import _english_forms

    # "rat" inflects to "ratting" and "sit" to "sits", so neither is a base form.
    assert _english_forms(word) == expected


@pytest.mark.parametrize(
    ("query", "excluded"),
    [("What is rating in Chamorro?", "chå'ka"), ("What is sites in Chamorro?", "mata'chong")],
)
def test_inflection_guessing_never_changes_the_concept(query, excluded):
    assert excluded not in lexical_lookup_context(query).context


@pytest.mark.parametrize(
    ("query", "word", "base"),
    [("What is posted in Chamorro?", "posted", "post"), ("What is sites in Chamorro?", "sites", "site"),
     ("I want to say trees", "trees", "tree")],
)
def test_inflection_derived_matches_are_labeled_weak(query, word, base):
    context = lexical_lookup_context(query).context
    headers = _headers(context)
    assert headers and not _strong_headwords(context)
    assert all(line.startswith(f'[Dictionary gloss for "{base}", a possible base form of "{word}"')
               and "not a direct gloss" in line for line in headers)


def test_an_exact_gloss_of_the_observed_word_wins_over_a_base_form():
    context = lexical_lookup_context("What is said in Chamorro?").context
    assert not any("possible base form" in line for line in _headers(context))
    assert "atåki" not in context


@pytest.mark.parametrize(
    ("definition", "excluded"),
    [
        ("sweet fruit, such as  pineapple, watermelon, orange, guava", "orange"),
        ("sea cucumber,  long, rope-like in appearance", "long"),
        ("attack (someone); said, for instance, of an ailment", "said"),
        ("Imitate; copy mimic; follow as a pattern, model, or example.", "model"),
        ("fish, type of tuna, bonito", "bonito"),
        ("slice, cut (in slices), (R)", "r"),
    ],
)
def test_examples_descriptions_and_usage_notes_are_not_glosses(definition, excluded):
    assert excluded not in {gloss for gloss, _rank in definition_gloss_segments(definition)}


@pytest.mark.parametrize(
    ("definition", "gloss"),
    [
        ("sweet fruit, such as  pineapple, watermelon, orange, guava", "sweet fruit"),
        ("such as, for example, like", "like"),
        ("as if, like", "like"),
        ("including, even", "including"),
        ("white, light-colored skin", "white"),
    ],
)
def test_a_marker_word_glossed_by_itself_stays_a_gloss(definition, gloss):
    assert (gloss, 1) in definition_gloss_segments(definition)


@pytest.mark.parametrize(
    ("query", "word", "excluded"),
    [("What is orange in Chamorro?", "orange", "gulusina"), ("What is long in Chamorro?", "long", "talin moddung"),
     ("What is model in Chamorro?", "model", "eyak")],
)
def test_example_lists_and_descriptions_are_not_direct_evidence(query, word, excluded):
    canonical, _ = get_canonical_tutor_context(query)
    assert excluded not in _direct_headwords(lexical_lookup_context(query).context, word)
    assert excluded not in canonical


@pytest.mark.parametrize(
    ("query", "word", "expected", "excluded"),
    [("What is mango in Chamorro?", "mango", "mangga", "mango'"),
     ("What is media in Chamorro?", "media", "gasetiria", "media")],
)
def test_an_english_request_does_not_promote_a_same_spelling_chamorro_headword(query, word, expected, excluded):
    context = lexical_lookup_context(query).context
    assert expected in _direct_headwords(context, word)
    assert excluded not in _strong_headwords(context) - {expected}
    assert not any(line.startswith(("[Exact dictionary headword", "[Headword matching")) for line in _headers(context))


def test_a_same_spelling_headword_without_an_english_gloss_is_a_labeled_lead():
    headers = _headers(lexical_lookup_context("What is usa in Chamorro?").context)
    assert headers and all(line.startswith('[Chamorro headword spelled like "usa"') and "not a translation" in line
                           for line in headers)


def test_chamorro_orthography_keeps_a_headword_strong_in_an_english_request():
    assert "guma'" in _strong_headwords(lexical_lookup_context("What is guma' in Chamorro?").context)
    # An undirected bare word still checks both languages.
    assert "mango'" in _strong_headwords(lexical_lookup_context("mango").context)


@pytest.mark.parametrize(
    ("query", "excluded"),
    [("What is many in Chamorro?", {"mi-"}), ("What is more in Chamorro?", {"hat-", "lá-", "la"}),
     ("What is us in Chamorro?", {"-ta"}), ("What is think in Chamorro?", {"pini'lo-"})],
)
def test_bound_forms_do_not_answer_an_ordinary_english_word(query, excluded):
    context = lexical_lookup_context(query).context
    assert _strong_headwords(context)
    assert not excluded & {line.rsplit(": ", 1)[1].rstrip("]") for line in _headers(context)}


def test_an_affix_question_keeps_bound_forms_with_an_explicit_label():
    headers = _headers(lexical_lookup_context("What is the prefix for many in Chamorro?").context)
    assert '[Bound prefix glossed "many" (it attaches to another word; not a standalone translation of "many"): mi-]' in headers


def _combined(query: str) -> tuple[str, str]:
    canonical, _ = get_canonical_tutor_context(query)
    return canonical, lexical_lookup_context(query, already_supplied=canonical).context


@pytest.mark.parametrize(
    ("query", "expected", "excluded"),
    [
        ('What is "media" in Chamorro?', "gasetiria", "media"),
        ("What is 'media' in Chamorro?", "gasetiria", "media"),
        ('Translate "media" into Chamorro.', "gasetiria", "media"),
        ("Translate media into Chamorro.", "gasetiria", "media"),
        ('Translate "mango" into Chamorro.', "mangga", "mango'"),
        ("Translate mango in to Chamorro", "mangga", "mango'"),
    ],
)
def test_quoted_and_into_targets_never_promote_a_same_spelling_headword(query, expected, excluded):
    canonical, lexical = _combined(query)
    combined = canonical + "\n" + lexical
    assert expected in combined
    assert not any(line.startswith("[Exact dictionary headword") for line in _headers(combined))
    assert excluded not in _strong_headwords(lexical) - {expected}


def test_a_quoted_target_without_an_english_gloss_is_a_labeled_canonical_lead():
    canonical, _ = get_canonical_tutor_context('What is "usa" in Chamorro?')
    headers = _headers(canonical)
    assert headers and all(line.startswith('[Chamorro headword spelled like "usa"') for line in headers)


@pytest.mark.parametrize(
    ("query", "headword"),
    [("What is \"guma'\" in Chamorro?", "guma'"), ("What does \"media\" mean?", "media"),
     ('Candidate spelling to verify: "media"', "media")],
)
def test_chamorro_and_explicit_headword_questions_keep_exact_headwords(query, headword):
    canonical, _ = get_canonical_tutor_context(query)
    assert f"[Exact dictionary headword: {headword}]" in canonical


@pytest.mark.parametrize(
    "query", ["What is \"Si Yu'os Ma'åse'\" in Chamorro?", "How do you say \"Si Yu'os Ma'åse'\" in Chamorro?"],
)
def test_words_in_a_quoted_chamorro_phrase_stay_chamorro(query):
    canonical, lexical = _combined(query)
    assert "[Canonical greetings.thank_you]" in canonical
    assert "si" in _strong_headwords(lexical)
    assert "spelled like" not in lexical


@pytest.mark.parametrize("word", ["gosh", "golly"])
def test_synonyms_before_etc_still_reach_a_reverse_lookup(word):
    assert "kåråmba" in lexical_lookup_context(f"What is {word} in Chamorro?").context


@pytest.mark.parametrize(
    ("definition", "excluded", "kept"),
    [
        ("Difficult; hard; not easy; hard to do, make, or carry out.", {"make", "or carry out"},
         {"difficult", "hard", "hard to do"}),
        ("Sock in (as in smoking); suck--as through a straw; suck noodles, soup, or other liquid.",
         {"soup", "or other liquid"}, set()),
        ("Scene; time, place, or circumstances, in which anything occurs.", {"time", "place"}, {"scene"}),
        ("obedient, amenable, submissive to restraint, control, or command", {"control", "or command"},
         {"obedient", "amenable"}),
        ("v. Hold; seize; grasp; receive and keep in the hand.", {"v"}, {"hold", "seize", "grasp"}),
        ("Gosh, golly, etc.", {"etc"}, {"gosh", "golly"}),
        ("males, men, boys, kids, etc", {"etc"}, {"males", "men", "boys", "kids"}),
        ("pound, beat, as pounding roots, etc", {"as pounding roots", "etc"}, {"pound", "beat"}),
        ("Scab; a crust over the sore, wound, etc.", {"wound", "a crust over the sore", "etc"}, {"scab"}),
        ("Uninjured; free from defect, ailment, wound, etc.", {"ailment", "wound", "etc"}, {"uninjured"}),
        ("joint of stalk of cane, bamboo, corn, etc.", {"bamboo", "corn", "etc", "joint of stalk of cane"}, set()),
        ("native traditions, beliefs, stories, etc., preserved through generations", {"beliefs", "stories", "etc"}, set()),
    ],
)
def test_complements_and_part_of_speech_markers_are_not_glosses(definition, excluded, kept):
    glosses = {gloss for gloss, rank in definition_gloss_segments(definition) if rank == 1}
    assert not excluded & glosses
    assert kept <= glosses


@pytest.mark.parametrize(
    ("definition", "gloss"),
    [
        ("hit, strike, or beat", ("strike", 1)),
        ("where?, which? (interrogative pronoun)", ("which", 2)),
        ("that, those, which (demonstrative)", ("that", 3)),
        ("joint, where two bones are joined, chink, fissure", ("joint", 1)),
        ("cause to sag, lose firmness, resiliency, or vigor", ("lose firmness", 1)),
        ("noun. Type of fish--family sphyraenidae; Barracuda.", ("barracuda", 1)),
    ],
)
def test_plain_series_pronouns_and_head_nouns_stay_glosses(definition, gloss):
    assert gloss in definition_gloss_segments(definition)


@pytest.mark.parametrize(
    ("query", "word", "excluded"),
    [("What is make in Chamorro?", "make", "mappot"), ("What is soup in Chamorro?", "soup", "soppla"),
     ("What is time in Chamorro?", "time", "eskina"), ("What is v in Chamorro?", "v", "mantieni")],
)
def test_complement_and_marker_definitions_are_not_direct_evidence(query, word, excluded):
    canonical, lexical = _combined(query)
    assert excluded not in _direct_headwords(lexical, word)
    assert f"Chamorro headword: {excluded}" not in canonical


def test_bound_form_label_follows_what_the_source_says():
    from api.lexical_lookup import _english_label

    # "ilek-" is "Used with a possessive suffix", so it is a bound form, not a prefix.
    canonical, _ = get_canonical_tutor_context("What is said in Chamorro?")
    block = next(b for b in canonical.split("\n\n") if "Chamorro headword: ilek-" in b)
    assert "This is a bound form attached to another word, not a standalone translation." in block
    assert "prefix" not in block.replace("Definition:", "").split("\n")[-1]
    assert _english_label("say", "say", 1, bound="bound form").startswith('Bound form glossed "say"')
