"""Real snapshot regressions: no generated or corrected language content."""

import json
from pathlib import Path

import pytest

from api.dictionary_service import DictionaryService

SNAPSHOT = json.loads((Path(__file__).resolve().parents[1] / 'dictionary_data' /
                       'revised_and_updated_chamorro_dictionary.json').read_text())


def test_leading_delimiter_does_not_shift_adios_examples():
    raw = SNAPSHOT['adiós']['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw)
    assert pairs == [{'chamorro': raw[i].strip(), 'english': raw[i + 1].strip()}
                     for i in (1, 3, 5)]
    assert pairs[0]['english'] == 'Then goodbye until we meet again'
    assert pairs[1]['english'] == 'I waved goodbye to all who passed me on  the road'
    assert unpaired == []


def test_collapsed_brown_examples_remain_unpaired_without_guessing():
    raw = SNAPSHOT['chinikulåti na kulót']['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw)
    assert pairs == [{'chamorro': raw[1].strip(), 'english': raw[2].strip()}]
    assert unpaired == [raw[3].strip(), raw[4].strip()]
    assert not any(pair['chamorro'].startswith('Paint') for pair in pairs)


def test_wood_and_banana_keep_the_original_three_pairs():
    for headword in ('håyu', "aga'"):
        raw = SNAPSHOT[headword]['Other']
        pairs, unpaired = DictionaryService._parse_examples(raw)
        assert pairs == [{'chamorro': raw[i].strip(), 'english': raw[i + 1].strip()}
                         for i in (1, 3, 5)]
        assert unpaired == []


def test_ambiguous_taxonomy_senses_and_missing_fields_are_not_repaired():
    for headword in ('chacha', "á'adda'"):
        pairs, unpaired = DictionaryService._parse_examples(SNAPSHOT[headword]['Other'])
        assert pairs == []
        assert unpaired
    assert DictionaryService._parse_examples(['', 'one', '', 'two']) == ([], ['one', 'two'])
    assert DictionaryService._parse_examples([None, 'one']) == ([], [])


def test_real_dictionary_exposes_unpaired_source_text_without_language_labels():
    word = DictionaryService().get_word('chinikulåti na kulót')
    assert word['unpaired_examples'] == SNAPSHOT['chinikulåti na kulót']['Other'][3:5]


def test_real_odd_tails_keep_structurally_supported_prefixes():
    for headword, expected_count in (("luseru", 3), ("å'paka' chåda'", 2), ("achá'ungak", 2)):
        raw = SNAPSHOT[headword]['Other']
        pairs, unpaired = DictionaryService._parse_examples(raw)
        assert pairs == [{'chamorro': raw[i].strip(), 'english': raw[i + 1].strip()}
                         for i in range(1, 2 * expected_count, 2)]
        assert unpaired
        assert all(value in [field.strip() for field in raw] for value in unpaired)


@pytest.mark.parametrize('headword', ['suni', 'platitus', "chungi'", "linalålu'"])
def test_real_shifted_blocks_stop_before_the_first_uncertain_pair(headword):
    raw = SNAPSHOT[headword]['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw)
    assert pairs == []
    # Preserve source text, without labeling its language or repairing it.
    expected = raw[1:raw.index('Syn:  binibu')] if headword == "linalålu'" else raw[1:]
    assert unpaired == [field.strip() for field in expected if field.strip()]


@pytest.mark.parametrize('headword', ['suni', 'platitus', "chungi'"])
def test_taxonomy_guard_normalizes_case_and_whitespace_without_rewriting_source(headword):
    raw = list(SNAPSHOT[headword]['Other'])
    raw[1] = '  '.join(raw[1].swapcase().split())
    assert DictionaryService._parse_examples(raw)[0] == []


def test_supported_prefix_survives_but_pairing_never_resumes_after_collapsed_field():
    prefix = SNAPSHOT['adiós']['Other'][1:3]
    tail = SNAPSHOT["linalålu'"]['Other'][1:6]
    pairs, unpaired = DictionaryService._parse_examples(['', *prefix, *tail])
    assert pairs == [{'chamorro': prefix[0].strip(), 'english': prefix[1].strip()}]
    assert unpaired == [field.strip() for field in tail]


@pytest.mark.parametrize('headword', [
    'sakmunetin maninin', 'roseli', 'åga', 'alaihai', "påode'du'", "fohmu' gaduduk",
])
def test_real_taxonomy_suffixes_and_abbreviations_cannot_establish_pairs(headword):
    assert DictionaryService._parse_examples(SNAPSHOT[headword]['Other'])[0] == []


@pytest.mark.parametrize('headword', ["siñoritu", 'Fulånu', 'kórurut', 'kurunét', "kåtnin\r\nguaka", "épapa'"])
def test_real_missing_or_fragmented_english_never_shifts_a_later_pair(headword):
    assert DictionaryService._parse_examples(SNAPSHOT[headword]['Other'])[0] == []


def test_unbalanced_english_parenthesis_ends_the_supported_prefix():
    raw = SNAPSHOT['midi']['Other']
    pairs, unpaired = DictionaryService._parse_examples(raw)
    assert pairs == [{'chamorro': raw[1].strip(), 'english': raw[2].strip()}]
    assert unpaired == [field.strip() for field in raw[3:6]]
