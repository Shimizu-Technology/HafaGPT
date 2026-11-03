"""Real snapshot regressions: no generated or corrected language content."""

import json
from pathlib import Path

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
