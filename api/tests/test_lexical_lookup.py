"""Per-word dictionary lookup before vector search (tutor T4)."""

import re

import pytest

from api.canonical_context import SENSE_SCOPE_RULE, get_canonical_tutor_context
from api.chamorro_morphology import affix_root_candidates, attested_root_candidates, strip_prefix
from api.dictionary_glosses import definition_gloss_segments
from api.dictionary_service import DictionaryService
from api.lexical_lookup import (
    homograph_sense_context,
    lexical_lookup_context,
    lexical_lookup_request,
)
from src.rag.chamorro_rag import window_reference
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
        ("Can you summarize our chat?", (False, None)),
        ("Please review my essay", (False, None)),
    ],
)
def test_review_and_summary_words_do_not_skip_language_requests(query, expected):
    assert should_use_rag(query) == expected


def test_a_card_settles_only_the_clause_it_matched():
    query = "What is the current Guam CHamoru orthography? Also explain possession in detail."
    assert uncovered_card_clauses(query) == "explain possession in detail."
    assert uncovered_card_clauses("What is the current Guam CHamoru orthography?") == ""


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
