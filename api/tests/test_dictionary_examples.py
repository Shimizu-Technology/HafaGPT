"""Real snapshot regressions: no generated or corrected language content."""

import json
from pathlib import Path

import pytest

from api.dictionary_service import DictionaryService

SNAPSHOT = json.loads((Path(__file__).resolve().parents[1] / 'dictionary_data' /
                       'revised_and_updated_chamorro_dictionary.json').read_text())


def test_leading_delimiter_does_not_shift_adios_examples():
    headword = 'adiós'
    raw = SNAPSHOT[headword]['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw, headword)
    assert pairs == [{'chamorro': raw[i].strip(), 'english': raw[i + 1].strip()}
                     for i in (1, 3, 5)]
    assert pairs[0]['english'] == 'Then goodbye until we meet again'
    assert pairs[1]['english'] == 'I waved goodbye to all who passed me on  the road'
    assert unpaired == []


def test_collapsed_brown_examples_remain_unpaired_without_guessing():
    headword = 'chinikulåti na kulót'
    raw = SNAPSHOT[headword]['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw, headword)
    assert pairs == [{'chamorro': raw[1].strip(), 'english': raw[2].strip()}]
    assert unpaired == [raw[3].strip(), raw[4].strip()]
    assert not any(pair['chamorro'].startswith('Paint') for pair in pairs)


def test_wood_and_banana_keep_only_pairs_with_headword_evidence():
    for headword in ('håyu', "aga'"):
        raw = SNAPSHOT[headword]['Other']
        pairs, unpaired = DictionaryService._parse_examples(raw, headword)
        assert pairs == [{'chamorro': raw[i].strip(), 'english': raw[i + 1].strip()}
                         for i in ((1, 3) if headword == "aga'" else (1, 3, 5))]
        assert unpaired == ([field.strip() for field in raw[5:7]] if headword == "aga'" else [])


def test_ambiguous_taxonomy_senses_and_missing_fields_are_not_repaired():
    for headword in ('chacha', "á'adda'"):
        pairs, unpaired = DictionaryService._parse_examples(SNAPSHOT[headword]['Other'], headword)
        assert pairs == []
        assert unpaired
    assert DictionaryService._parse_examples(['', 'one', '', 'two']) == ([], ['one', 'two'])
    assert DictionaryService._parse_examples([None, 'one']) == ([], [])


def test_real_dictionary_exposes_unpaired_source_text_without_language_labels():
    word = DictionaryService().get_word('chinikulåti na kulót')
    assert word['unpaired_examples'] == SNAPSHOT['chinikulåti na kulót']['Other'][3:5]


def test_real_odd_tails_keep_structurally_supported_prefixes():
    for headword, expected_count in (("luseru", 0), ("å'paka' chåda'", 0), ("achá'ungak", 2)):
        raw = SNAPSHOT[headword]['Other']
        pairs, unpaired = DictionaryService._parse_examples(raw, headword)
        assert pairs == [{'chamorro': raw[i].strip(), 'english': raw[i + 1].strip()}
                         for i in range(1, 2 * expected_count, 2)]
        assert unpaired
        assert all(value in [field.strip() for field in raw] for value in unpaired)


@pytest.mark.parametrize('headword', ['suni', 'platitus', "chungi'", "linalålu'"])
def test_real_shifted_blocks_stop_before_the_first_uncertain_pair(headword):
    raw = SNAPSHOT[headword]['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw, headword)
    assert pairs == []
    # Preserve source text, without labeling its language or repairing it.
    expected = raw[1:raw.index('Syn:  binibu')] if headword == "linalålu'" else raw[1:]
    assert unpaired == [field.strip() for field in expected if field.strip()]


@pytest.mark.parametrize('headword', ['suni', 'platitus', "chungi'"])
def test_taxonomy_guard_normalizes_case_and_whitespace_without_rewriting_source(headword):
    raw = list(SNAPSHOT[headword]['Other'])
    raw[1] = '  '.join(raw[1].swapcase().split())
    assert DictionaryService._parse_examples(raw, headword)[0] == []


def test_supported_prefix_survives_but_pairing_never_resumes_after_collapsed_field():
    prefix = SNAPSHOT['adiós']['Other'][1:3]
    tail = SNAPSHOT["linalålu'"]['Other'][1:6]
    pairs, unpaired = DictionaryService._parse_examples(['', *prefix, *tail], 'adiós')
    assert pairs == [{'chamorro': prefix[0].strip(), 'english': prefix[1].strip()}]
    assert unpaired == [field.strip() for field in tail]


@pytest.mark.parametrize('headword', [
    'sakmunetin maninin', 'roseli', 'åga', 'alaihai', "påode'du'", "fohmu' gaduduk",
])
def test_real_taxonomy_suffixes_and_abbreviations_cannot_establish_pairs(headword):
    assert DictionaryService._parse_examples(SNAPSHOT[headword]['Other'], headword)[0] == []


@pytest.mark.parametrize('headword', ["siñoritu", 'Fulånu', 'kórurut', 'kurunét', "kåtnin\r\nguaka", "épapa'"])
def test_real_missing_or_fragmented_english_never_shifts_a_later_pair(headword):
    assert DictionaryService._parse_examples(SNAPSHOT[headword]['Other'], headword)[0] == []


def test_midi_withholds_weak_overlap_prefix_and_preserves_unbalanced_tail():
    headword = 'midi'
    raw = SNAPSHOT[headword]['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw, headword)
    assert pairs == []  # First field already exceeds the English-overlap ceiling.
    assert unpaired == [field.strip() for field in raw[1:6]]


@pytest.mark.parametrize('headword', ["abubun pápagu'", 'melindris', 'priparasión', 'míhinilat'])
def test_round3_taxonomy_and_split_abbreviations_stop_the_entire_block(headword):
    raw = SNAPSHOT[headword]['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw, headword)
    assert pairs == []
    end = next((i for i, field in enumerate(raw) if field.startswith('From:')), len(raw))
    assert unpaired == [field.strip() for field in raw[1:end] if field.strip()]
    # Exercise the actual loader too: it must provide entry headword context.
    word = DictionaryService().get_word(headword)
    assert word['examples'] == []
    assert word['unpaired_examples'] == unpaired


@pytest.mark.parametrize('english', [
    'The residents are making big U', 'The residents are non-U',
    'S residents are making big houses', 'The residents make big s',
    'Many s have been given names', 'e.g the residents make houses',
    'The residents make (big houses', 'The residents will come this',
    'The residents are making houses because you',
    'is the ninth month of the year',
    "It's a cool day, because it's",
    'This coming , we will go to Guam',
    'The fish ed in the ocean',
    'Even if I have no money, as long as I pay my debts',
    'Pete is already a military',
])
def test_english_fragments_cannot_be_rescued_by_later_valid_fields(english):
    raw = SNAPSHOT['adiós']['Other']
    block = ['', raw[1], raw[2], raw[3], english, raw[5], raw[6]]
    pairs, unpaired = DictionaryService._parse_examples(block, 'adiós')
    assert pairs == [{'chamorro': raw[1].strip(), 'english': raw[2].strip()}]
    assert unpaired == [raw[3].strip(), english, raw[5].strip(), raw[6].strip()]


def test_whole_word_english_evidence_does_not_split_apostrophized_source_words():
    from api.dictionary_example_validation import example_tokens, english_share

    # The previous function-word regex matched fragments inside this field.
    source = SNAPSHOT["abubun pápagu'"]['Other'][2]
    tokens = example_tokens(source)
    assert "fa'na'an" in tokens
    assert 'an' not in tokens
    assert english_share(tokens) == 1 / 7  # Only the whole token i overlaps.


def test_a_well_formed_pair_requires_the_current_entry_headword():
    raw = SNAPSHOT['adiós']['Other']
    assert DictionaryService._parse_examples(['', *raw[1:3]], 'adiós')[0]
    assert DictionaryService._parse_examples(['', *raw[1:3]], 'håyu') == ([], [raw[1].strip(), raw[2].strip()])


def test_pairing_counts_and_review_sample_match_the_current_snapshot():
    import hashlib
    import importlib.util

    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location('pairing_audit', root / 'scripts/audit_dictionary_example_pairing.py')
    audit = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit)
    report, sample = audit.audit(SNAPSHOT)
    assert report == json.loads((root / 'documentation/phase4-data/example_pairing_counts.json').read_text())
    judgments = json.loads((root / 'documentation/phase4-data/example_pairing_sample_round3.json').read_text())
    assert judgments['size'] == 60
    # Later rounds only withhold more pairs. Every pair judged in round 3 must
    # still be shown at the same position with the same source prefix.
    for judged in judgments['sample']:
        raw = SNAPSHOT[judged['headword']]['Other']
        pairs, _ = DictionaryService._parse_examples(raw, judged['headword'])
        assert pairs[judged['pair_index']]['english'] == judged['english']
        prefix = raw[:2 * judged['pair_index'] + 3]
        assert hashlib.sha256(json.dumps(prefix, ensure_ascii=False).encode()).hexdigest() == judged['source_prefix_sha256']


@pytest.mark.parametrize('headword', [
    "båtbas ma'is", 'chátpachut', 'Damenggun Råmus', 'isåo orihinåt',
    'iskatlatina', 'masåmai', 'moderasión', 'udai',
])
def test_round4_cut_off_english_partners_are_never_shown(headword):
    """English fields ending mid-phrase ("The corn plant has", "Japan has many
    different") stop the block; an earlier complete pair may remain."""
    cut_off = {
        "båtbas ma'is": 'The corn plant has', 'chátpachut': 'The child was spanked for being',
        'Damenggun Råmus': 'The palm leaves are blessed during',
        'isåo orihinåt': 'Some people believe that all the people have',
        'iskatlatina': 'Be aware because the child has', 'masåmai': 'We say that you are most',
        'moderasión': 'It is good to have', 'udai': 'Japan has many different',
    }[headword]
    pairs, _ = DictionaryService._parse_examples(SNAPSHOT[headword]['Other'], headword)
    assert all(' '.join(pair['english'].split()) != cut_off for pair in pairs)
    if headword != 'udai':
        assert pairs == []


@pytest.mark.parametrize(('headword', 'count'), [("aga'", 2), ('rektót', 3), ('adiós', 3), ('håyu', 3)])
def test_complete_endings_like_and_more_or_many_nouns_stay_shown(headword, count):
    pairs, _ = DictionaryService._parse_examples(SNAPSHOT[headword]['Other'], headword)
    assert len(pairs) == count


@pytest.mark.parametrize('headword,cut_off', [
    ('antiguåyun', 'The house furnishings are all'),
    ('buen\r\nbinidu', 'I salute you all,'),
    ('haguhan manlåksi', "I can't sew, because there's no"),
    ('muelas', 'I have three'),
    ('pineddung somnak', 'It is not hot after'),
    ('tufungun', 'His cows are countable, because he only has eleven'),
])
def test_round5_english_partners_that_stop_short_are_never_shown(headword, cut_off):
    """A trailing comma, a bare "no", "are all", "after", or a count with its
    noun missing marks a field that was cut off."""
    pairs, _ = DictionaryService._parse_examples(SNAPSHOT[headword]['Other'], headword)
    assert all(' '.join(pair['english'].split()) != cut_off for pair in pairs)


def test_round5_complete_endings_that_look_like_cut_offs_stay_visible():
    pairs, _ = DictionaryService._parse_examples(SNAPSHOT["sunin agaga'"]['Other'], "sunin agaga'")
    assert any(pair['english'].endswith('sought after') for pair in pairs)


@pytest.mark.parametrize('headword,index,english', [
    # The headword is present as an inflected form (an infix or prefix).
    ('ñagung', 1, 'I sheltered myself from the rain yesterday'),
    ('tutugák', 0, 'The hen was clucking, because she was  about to lay eggs'),
    ('dellang', 0, 'I balanced myself across the other side  of the road'),
    # The English side ends in a noun that is not on the short noun list.
    ('liheslatura', 0, 'The  power to create laws is in the legislature'),
    ('paståhi', 0, 'The cattle are in the pasture'),
])
def test_round5_inflected_headwords_and_unlisted_nouns_are_no_longer_withheld(headword, index, english):
    pairs, _ = DictionaryService._parse_examples(SNAPSHOT[headword]['Other'], headword)
    assert pairs[index]['english'] == english


@pytest.mark.parametrize('headword', ['chámbara\'', 'kandålu', 'kångkiri\'', 'pitsona', 'sintensia', 'mådduluk dågan'])
def test_round5_a_noun_phrase_missing_its_noun_is_still_withheld(headword):
    """"a long", "a small", "a good", "a nice", "such a big" need a noun after the adjective."""
    pairs, _ = DictionaryService._parse_examples(SNAPSHOT[headword]['Other'], headword)
    assert all(pair['english'].split()[-2:] not in (['a', 'long'], ['a', 'small'], ['a', 'good'], ['a', 'nice'], ['a', 'big'], ['a', 'short'])
               for pair in pairs)
