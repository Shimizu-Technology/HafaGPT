import copy
import json
from pathlib import Path

import pytest

from src.data.open_sentences import SNAPSHOT_DIR, load_open_sentence_pairs, validate_open_sentence_snapshot
from src.rag.source_policy import get_registered_source

EXPECTED = {
    'tatoeba_chamorro': 228, 'opus_translatewiki_ch_en': 700,
}


def test_all_versioned_snapshots_validate_without_enabling_ingestion() -> None:
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


def test_default_loader_excludes_every_historical_pair_and_never_claims_review() -> None:
    modern = load_open_sentence_pairs()
    all_pairs = load_open_sentence_pairs(include_historical=True)
    assert len(modern) == 928
    assert len(all_pairs) == 928
    assert {pair['orthography'] for pair in modern} == {'unknown'}
    assert not any(pair['orthography'] == 'historical' for pair in all_pairs)
    assert all(pair['teaching_eligible'] is False and pair['review_status'] == 'unreviewed' for pair in all_pairs)


def first_snapshot(source_id: str = 'tatoeba_chamorro') -> dict:
    return json.loads((SNAPSHOT_DIR / f'{source_id}.json').read_text())


@pytest.mark.parametrize('field,value', [
    ('license', 'unknown'), ('source_id', 'unregistered'), ('attribution', ''),
    ('sentence_ids', {}), ('orthography', 'modern'), ('retrieved_at', 'not-a-date'),
    ('teaching_eligible', True), ('review_status', 'native_reviewed'),
])
def test_missing_or_unsafe_pair_metadata_is_rejected(field: str, value: object) -> None:
    payload = first_snapshot()
    payload['pairs'][0][field] = value
    with pytest.raises(ValueError):
        validate_open_sentence_snapshot(payload)


@pytest.mark.parametrize('source_id', ['opus_tatoeba_ch_en', 'opus_wikimedia_ch_en', 'opus_bible_uedin_ch_en'])
def test_removed_sources_are_not_bundled_or_loadable(source_id: str, tmp_path: Path) -> None:
    from src.rag.source_reviews import source_reviews_by_id
    from src.rag.permission_records import permission_records_by_source
    assert not (SNAPSHOT_DIR / f'{source_id}.json').exists()
    assert not list((SNAPSHOT_DIR / 'licenses').glob(f'{source_id}.*'))
    for record in (get_registered_source(source_id), source_reviews_by_id()[source_id], permission_records_by_source()[source_id]):
        assert record['bundling_status'] == 'not_bundled'
        assert record['bundling_reason']
    payload = first_snapshot()
    payload['source_id'] = source_id
    (tmp_path / 'removed.json').write_text(json.dumps(payload))
    with pytest.raises(ValueError, match='Unknown open-sentence source'):
        load_open_sentence_pairs(snapshot_dir=tmp_path, include_historical=True)


def test_source_ids_and_translatewiki_provenance_remain_traceable() -> None:
    direct = first_snapshot()['pairs'][0]
    assert direct['sentence_id_kind'] == 'tatoeba_sentence'
    assert direct['sentence_ids']['chamorro'][0].isdigit()
    opus = first_snapshot('opus_translatewiki_ch_en')['pairs'][0]
    assert opus['sentence_id_kind'] == 'archive_line'
    assert opus['sentence_ids']['chamorro'] == ['translatewiki.ch-en.ch:1']
    assert opus['provenance']['source_documents']['chamorro'] == 'ch/Sw8hK0xXcz/core.xml.gz'
    assert opus['provenance']['source_sentence_ids'] == {'chamorro': ['1'], 'english': ['1']}
    assert opus['provenance']['alignment_id'] == 'SL1'
    assert opus['provenance']['message_key'] is None
    assert opus['provenance']['message_key_status'] == 'not_provided_in_opus_package'


def test_duplicate_pair_ids_and_incomplete_snapshots_fail_closed(tmp_path: Path) -> None:
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


@pytest.mark.parametrize('artifact', [
    {}, {'pages': []}, {'pages': ['not an object']}, {'pages': [{}]},
    {'pages': [{'sha256': 'not-a-digest'}]},
])
def test_tatoeba_requires_every_page_digest(artifact: object) -> None:
    payload = first_snapshot()
    payload['artifact'] = artifact
    with pytest.raises(ValueError):
        validate_open_sentence_snapshot(payload)


def test_opus_requires_archive_digest() -> None:
    payload = first_snapshot('opus_translatewiki_ch_en')
    del payload['artifact']['sha256']
    with pytest.raises(ValueError, match='SHA-256'):
        validate_open_sentence_snapshot(payload)


def test_builder_hash_preflight_rejects_tampered_raw_before_output(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    import hashlib
    from scripts import build_open_sentence_snapshots as builder
    monkeypatch.setattr(builder, 'OPUS', ())
    raw = tmp_path / 'raw'
    raw.mkdir()
    page = raw / 'tatoeba-api.json'
    page.write_bytes(b'original')
    manifest = tmp_path / 'manifest.json'
    manifest.write_text(json.dumps({'snapshot_version': 'v1', 'retrieved_at': '2026-11-03',
                                    'files': {page.name: hashlib.sha256(b'original').hexdigest()}}))
    builder.verify_raw_inputs(raw, '2026-11-03', manifest)
    page.write_bytes(b'changed')
    with pytest.raises(ValueError, match='SHA-256 mismatch'):
        builder.verify_raw_inputs(raw, '2026-11-03', manifest)
    with pytest.raises(ValueError, match='new version'):
        builder.verify_raw_inputs(raw, '2026-11-04', manifest)


def test_builder_cannot_overwrite_an_existing_snapshot(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from scripts import build_open_sentence_snapshots as builder
    output = tmp_path / 'output'
    output.mkdir()
    sentinel = output / 'existing.json'
    sentinel.write_text('preserve me')
    monkeypatch.setattr('sys.argv', ['builder', '--raw-dir', str(tmp_path / 'missing'),
                                    '--output-dir', str(output), '--retrieved-at', '2026-11-03'])
    with pytest.raises(SystemExit):
        builder.main()
    assert sentinel.read_text() == 'preserve me'
    assert list(output.iterdir()) == [sentinel]


MALFORMED_IDS = json.loads((Path(__file__).parent / 'fixtures/open_sentences/malformed_ids.json').read_text())


@pytest.mark.parametrize('fixture', MALFORMED_IDS)
def test_malformed_identifier_fixture_is_rejected(fixture: dict) -> None:
    payload = first_snapshot(fixture['source_id'])
    target = payload['pairs'][0]
    for key in fixture['path'][:-1]:
        target = target[key]
    target[fixture['path'][-1]] = fixture['value']
    with pytest.raises(ValueError, match='identifier'):
        validate_open_sentence_snapshot(payload)


def test_builder_only_produces_the_retained_opus_subset() -> None:
    from scripts import build_open_sentence_snapshots as builder
    assert [row[2] for row in builder.OPUS] == ['opus_translatewiki_ch_en']
    manifest = json.loads(builder.RAW_MANIFEST.read_text())
    assert not {'Tatoeba.zip', 'wikimedia.zip', 'bible-uedin.zip'} & set(manifest['files'])


def test_translatewiki_builder_rejects_misaligned_provenance(tmp_path: Path) -> None:
    import gzip
    import zipfile
    from xml.sax.saxutils import escape
    from scripts import build_open_sentence_snapshots as builder
    pair = first_snapshot('opus_translatewiki_ch_en')['pairs'][0]
    (tmp_path / 'ch-en.xml.gz').write_bytes(gzip.compress(b'<cesAlign><linkGrp fromDoc="ch/fixture/core.xml.gz" toDoc="en/fixture/core.xml.gz"><link xtargets="1;1" id="SL1"/></linkGrp></cesAlign>'))
    for code, field in [('ch', 'chamorro'), ('en', 'english')]:
        with zipfile.ZipFile(tmp_path / f'{code}.zip', 'w') as archive:
            archive.writestr(f'translatewiki/raw/{code}/fixture/core.xml', '<text><s id="1">' + escape(pair[field]) + '</s></text>')
    assert builder.translatewiki_provenance(tmp_path, [pair['chamorro']], [pair['english']])[0]['alignment_id'] == 'SL1'
    with pytest.raises(ValueError, match='differs from Moses row'):
        builder.translatewiki_provenance(tmp_path, [pair['chamorro']], [pair['english'] + ' mismatched'])
