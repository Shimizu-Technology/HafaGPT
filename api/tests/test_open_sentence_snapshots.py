import copy
import json

import pytest

from src.data.open_sentences import SNAPSHOT_DIR, load_open_sentence_pairs, validate_open_sentence_snapshot
from src.rag.source_policy import get_registered_source

EXPECTED = {
    'tatoeba_chamorro': 228, 'opus_tatoeba_ch_en': 237, 'opus_translatewiki_ch_en': 700,
    'opus_wikimedia_ch_en': 49, 'opus_bible_uedin_ch_en': 14486,
}


def test_all_versioned_snapshots_validate_without_enabling_ingestion():
    actual = {}
    for path in SNAPSHOT_DIR.glob('*.json'):
        payload = json.loads(path.read_text())
        validate_open_sentence_snapshot(payload)
        source = get_registered_source(payload['source_id'])
        assert source['license'] == payload['pairs'][0]['license']
        assert source['ingestion']['allowed'] is False
        assert source['retrieval']['allowed'] is False
        actual[payload['source_id']] = len(payload['pairs'])
    assert actual == EXPECTED


def test_default_loader_excludes_every_historical_pair_and_never_claims_review():
    modern = load_open_sentence_pairs()
    all_pairs = load_open_sentence_pairs(include_historical=True)
    assert len(modern) == 1214
    assert len(all_pairs) == 15700
    assert {pair['orthography'] for pair in modern} == {'unknown'}
    assert sum(pair['orthography'] == 'historical' for pair in all_pairs) == 14486
    assert all(pair['teaching_eligible'] is False and pair['review_status'] == 'unreviewed' for pair in all_pairs)


def first_snapshot(source_id='tatoeba_chamorro'):
    return json.loads((SNAPSHOT_DIR / f'{source_id}.json').read_text())


@pytest.mark.parametrize('field,value', [
    ('license', 'unknown'), ('source_id', 'unregistered'), ('attribution', ''),
    ('sentence_ids', {}), ('orthography', 'modern'), ('retrieved_at', 'not-a-date'),
    ('teaching_eligible', True), ('review_status', 'native_reviewed'),
])
def test_missing_or_unsafe_pair_metadata_is_rejected(field, value):
    payload = first_snapshot()
    payload['pairs'][0][field] = value
    with pytest.raises(ValueError):
        validate_open_sentence_snapshot(payload)


def test_bible_cannot_lose_its_historical_flag():
    payload = first_snapshot('opus_bible_uedin_ch_en')
    payload['pairs'][0]['orthography'] = 'unknown'
    with pytest.raises(ValueError, match='historical'):
        validate_open_sentence_snapshot(payload)


def test_source_ids_distinguish_original_ids_from_archive_row_identifiers():
    direct = first_snapshot()['pairs'][0]
    assert direct['sentence_id_kind'] == 'tatoeba_sentence'
    assert direct['sentence_ids']['chamorro'][0].isdigit()
    opus = first_snapshot('opus_tatoeba_ch_en')['pairs'][0]
    assert opus['sentence_id_kind'] == 'archive_line'
    assert opus['sentence_ids']['chamorro'] == ['Tatoeba.ch-en.ch:1']
    bible = first_snapshot('opus_bible_uedin_ch_en')['pairs'][0]
    assert bible['sentence_id_kind'] == 'opus_xml'
    assert bible['source_documents']['chamorro'] == 'ch/Chamorro-PART.xml.gz'
    assert bible['sentence_ids']['chamorro'] == ['b.PSA.1.1.1']


def test_duplicate_pair_ids_and_incomplete_snapshots_fail_closed(tmp_path):
    payload = first_snapshot()
    payload['pairs'][1] = copy.deepcopy(payload['pairs'][0])
    with pytest.raises(ValueError, match='Duplicate'):
        validate_open_sentence_snapshot(payload)
    payload = first_snapshot()
    payload['pair_count'] += 1
    with pytest.raises(ValueError, match='count'):
        validate_open_sentence_snapshot(payload)
    with pytest.raises(ValueError, match='No open-sentence'):
        load_open_sentence_pairs(snapshot_dir=tmp_path)
