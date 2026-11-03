#!/usr/bin/env python3
"""Build offline JSON snapshots from pinned, untrusted downloads; never ingest.

Run with python -I. No archive members are extracted or executed. Source strings
are copied verbatim except for the line delimiter in Moses plain-text packages.
See documentation/phase4-data/OPEN_SENTENCES.md for download URLs and licenses.
"""

import argparse
from datetime import date
import gzip
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile
from typing import Any

RAW_MANIFEST = Path(__file__).resolve().parents[1] / "data/open_sentences/raw_artifacts_v1.json"


OPUS = (
    ('translatewiki', 'v2026-07-01', 'opus_translatewiki_ch_en', 'CC-BY-3.0',
     'https://creativecommons.org/licenses/by/3.0/', 'unknown', 700),
)
TRANSLATEWIKI_PROVENANCE = {
    'ch-en.xml.gz': 'https://object.pouta.csc.fi/OPUS-translatewiki/v2026-07-01/xml/ch-en.xml.gz',
    'ch.zip': 'https://object.pouta.csc.fi/OPUS-translatewiki/v2026-07-01/raw/ch.zip',
    'en.zip': 'https://object.pouta.csc.fi/OPUS-translatewiki/v2026-07-01/raw/en.zip',
}



def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_snapshot(output_dir: Path, source_id: str, version: str, artifact: dict[str, Any], pairs: list[dict[str, Any]], notices: list[str]) -> None:
    payload = {
        'schema_version': 1, 'snapshot_version': 'v1', 'source_id': source_id,
        'source_version': version, 'artifact': artifact, 'pair_count': len(pairs),
        'policy': 'Offline unreviewed source text only; no database, RAG ingestion, or teaching approval.',
        'notices': notices,
    }
    # One pair per line keeps large historical artifacts inspectable in diffs.
    prefix = json.dumps(payload, ensure_ascii=False, indent=2)[:-2]
    body = ',\n'.join('    ' + json.dumps(pair, ensure_ascii=False) for pair in pairs)
    (output_dir / f'{source_id}.json').write_text(prefix + ',\n  "pairs": [\n' + body + '\n  ]\n}\n', encoding='utf-8')


def build_tatoeba(raw_dir: Path, output_dir: Path, retrieved_at: str) -> int:
    paths = [raw_dir / 'tatoeba-api.json', *sorted(raw_dir.glob('tatoeba-api-[0-9]*.json'))]
    pages = [json.loads(path.read_text(encoding='utf-8')) for path in paths]
    if pages[-1]['paging'].get('has_next'):
        raise ValueError('Tatoeba export is incomplete: pagination has a next page')
    pairs, seen, sentence_ids = [], set(), set()
    for page in pages:
        for sentence in page['data']:
            sentence_ids.add(sentence['id'])
            if sentence['lang'] != 'cha' or sentence['license'] != 'CC BY 2.0 FR':
                raise ValueError('Unexpected Tatoeba language/license')
            for translation in sentence['translations']:
                if translation['lang'] != 'eng' or translation['license'] != 'CC BY 2.0 FR' or not translation['is_direct']:
                    raise ValueError('Unexpected Tatoeba translation language/license/link')
                key = (sentence['id'], translation['id'])
                if key in seen:
                    raise ValueError('Duplicate Tatoeba direct link')
                seen.add(key)
                urls = [f'https://tatoeba.org/en/sentences/show/{item["id"]}' for item in (sentence, translation)]
                owners = [item.get('owner') or 'unowned; see sentence history' for item in (sentence, translation)]
                pairs.append({
                    'pair_id': f'tatoeba:{key[0]}:{key[1]}', 'source_id': 'tatoeba_chamorro',
                    'source': urls[0], 'license': 'CC-BY-2.0-FR',
                    'license_url': 'https://creativecommons.org/licenses/by/2.0/fr/',
                    'attribution': f'Tatoeba contributors; Chamorro owner: {owners[0]}; English owner: {owners[1]}. See source pages and revision histories.',
                    'attribution_urls': urls, 'sentence_id_kind': 'tatoeba_sentence',
                    'sentence_ids': {'chamorro': [str(key[0])], 'english': [str(key[1])]},
                    'retrieved_at': retrieved_at, 'orthography': 'unknown',
                    'review_status': 'unreviewed', 'teaching_eligible': False,
                    'chamorro': sentence['text'], 'english': translation['text'],
                })
    if len(sentence_ids) != pages[0]['paging']['total']:
        raise ValueError('Tatoeba sentence count differs from API total')
    write_snapshot(output_dir, 'tatoeba_chamorro', retrieved_at,
                   {'urls': ['https://api.tatoeba.org/unstable/sentences?lang=cha&sort=created&limit=100&trans%3Alang=eng&trans%3Ais_direct=yes'],
                    'pages': [{'file': path.name, 'sha256': sha256(path)} for path in paths],
                    'sentence_count': len(sentence_ids)}, pairs,
                   ['https://tatoeba.org/en/downloads', 'https://tatoeba.org/en/terms_of_use',
                    'Sentence owners are included when supplied by the API; unowned sentences retain their source/history links. No text was translated or corrected.'])
    return len(pairs)


def parse_source_xml(value: bytes) -> ET.Element:
    if b'<!ENTITY' in value or len(value) > 16_000_000:
        raise ValueError('Unsafe or oversized source XML')
    return ET.fromstring(value)


def translatewiki_provenance(raw_dir: Path, ch_lines: list[str], en_lines: list[str]) -> list[dict[str, Any]]:
    """Verify every Moses row against XML text before attaching source IDs.

    The package preserves project documents and sentence IDs, but no original
    translatewiki message keys or contributor identities. Do not invent them.
    """
    root = parse_source_xml(gzip.decompress((raw_dir / 'ch-en.xml.gz').read_bytes()))
    records = []
    with zipfile.ZipFile(raw_dir / 'ch.zip') as ch_archive, zipfile.ZipFile(raw_dir / 'en.zip') as en_archive:
        for group in root.findall('linkGrp'):
            documents = dict(zip(('chamorro', 'english'), (group.attrib['fromDoc'], group.attrib['toDoc']), strict=True))
            text_maps = []
            for language, archive in zip(('chamorro', 'english'), (ch_archive, en_archive), strict=True):
                member = 'translatewiki/raw/' + documents[language].removesuffix('.gz')
                if archive.getinfo(member).file_size > 16_000_000:
                    raise ValueError('Unexpected oversized provenance member')
                text = parse_source_xml(archive.read(member))
                text_maps.append({sentence.attrib['id']: ''.join(sentence.itertext()) for sentence in text.iter('s')})
            for link in group.findall('link'):
                targets = [value.split() for value in link.attrib['xtargets'].split(';')]
                if len(targets) != 2 or not all(targets):
                    raise ValueError('Unexpected translatewiki alignment IDs')
                row = len(records)
                texts = tuple(' '.join(mapping[value] for value in ids) for mapping, ids in zip(text_maps, targets, strict=True))
                if row >= len(ch_lines) or texts != (ch_lines[row], en_lines[row]):
                    raise ValueError('Translatewiki provenance text differs from Moses row')
                records.append({
                    'source_documents': documents,
                    'source_sentence_ids': dict(zip(('chamorro', 'english'), targets, strict=True)),
                    'alignment_id': link.attrib['id'],
                    'message_key': None,
                    'message_key_status': 'not_provided_in_opus_package',
                    'upstream_dump_url': 'https://translatewiki.net/static/translation-dump',
                })
    if len(records) != len(ch_lines):
        raise ValueError('Translatewiki provenance count differs from Moses rows')
    return records


def build_opus(raw_dir: Path, output_dir: Path, retrieved_at: str) -> dict[str, int]:
    counts = {}
    for corpus, version, source_id, license_id, license_url, orthography, expected_count in OPUS:
        path = raw_dir / f'{corpus}.zip'
        with zipfile.ZipFile(path) as archive:
            if any(item.file_size > 16_000_000 for item in archive.infolist()):
                raise ValueError('Unexpected oversized archive member')
            ch_name, en_name = f'{corpus}.ch-en.ch', f'{corpus}.ch-en.en'
            ch_lines = archive.read(ch_name).decode('utf-8').splitlines()
            en_lines = archive.read(en_name).decode('utf-8').splitlines()
            readme = archive.read('README').decode('utf-8')
            license_text = archive.read('LICENSE').decode('utf-8')
            if license_url not in readme and not (license_id == 'CC0-1.0' and 'License: CC0 1.0' in readme):
                raise ValueError('Packaged license notice differs from the approved subset')
            # Preserve packaged notices alongside the redistributed subset.
            notice_dir = output_dir / 'licenses'
            notice_dir.mkdir(exist_ok=True)
            (notice_dir / f'{source_id}.README.txt').write_text(readme, encoding='utf-8')
            (notice_dir / f'{source_id}.LICENSE.txt').write_text(license_text, encoding='utf-8')
            provenance = translatewiki_provenance(raw_dir, ch_lines, en_lines)
            if len(ch_lines) != expected_count or len(en_lines) != expected_count:
                raise ValueError(f'Unexpected {corpus} alignment count')
            source_url = f'https://opus.nlpl.eu/legacy/{corpus}-{version}.php'
            pairs = []
            for row, (chamorro, english) in enumerate(zip(ch_lines, en_lines, strict=True), 1):
                ids = {'chamorro': [f'{ch_name}:{row}'], 'english': [f'{en_name}:{row}']}
                pair = {
                    'pair_id': f'{source_id}:{version}:{row}', 'source_id': source_id,
                    'source': source_url, 'license': license_id, 'license_url': license_url,
                    'attribution': f'{corpus} contributors and OPUS; J. Tiedemann (2012), Parallel Data, Tools and Interfaces in OPUS. See packaged notices.',
                    'sentence_id_kind': 'archive_line',
                    'sentence_ids': ids, 'alignment_row': row, 'retrieved_at': retrieved_at,
                    'orthography': orthography, 'review_status': 'unreviewed',
                    'teaching_eligible': False, 'chamorro': chamorro, 'english': english,
                }
                pair['provenance'] = provenance[row - 1]
                pairs.append(pair)
        write_snapshot(output_dir, source_id, version,
                       {'url': f'https://object.pouta.csc.fi/OPUS-{corpus}/{version}/moses/ch-en.txt.zip',
                        'sha256': sha256(path), 'files': [ch_name, en_name],
                        'provenance_artifacts': [{'file': name, 'url': url, 'sha256': sha256(raw_dir / name)}
                                                 for name, url in TRANSLATEWIKI_PROVENANCE.items()]}, pairs,
                       [f'licenses/{source_id}.README.txt', f'licenses/{source_id}.LICENSE.txt',
                        'Text copied without translation or spelling changes. Archive-line IDs identify exact lines in the pinned archive, not original contributor sentence IDs.'])
        counts[source_id] = len(pairs)
    return counts


def verify_raw_inputs(raw_dir: Path, retrieved_at: str, manifest_path: Path = RAW_MANIFEST) -> None:
    """Reject changed bytes before creating any output for the frozen v1 capture."""
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest['snapshot_version'] != 'v1' or retrieved_at != manifest['retrieved_at']:
        raise ValueError('This builder only reproduces the pinned v1 capture; record a new version for a refresh')
    expected = manifest['files']
    actual_names = {path.name for path in raw_dir.glob('tatoeba-api*.json')} | {f'{corpus}.zip' for corpus, *_rest in OPUS}
    if OPUS:
        actual_names |= set(TRANSLATEWIKI_PROVENANCE)
    if actual_names != set(expected):
        raise ValueError('Raw input files differ from the pinned v1 manifest')
    for name, digest in expected.items():
        if sha256(raw_dir / name) != digest:
            raise ValueError(f'Raw input SHA-256 mismatch: {name}')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--raw-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--retrieved-at', required=True, type=date.fromisoformat)
    args = parser.parse_args()
    if args.output_dir.exists() and (not args.output_dir.is_dir() or any(args.output_dir.iterdir())):
        parser.error('--output-dir must be empty or absent')
    retrieved_at = args.retrieved_at.isoformat()
    verify_raw_inputs(args.raw_dir, retrieved_at)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    counts = {'tatoeba_chamorro': build_tatoeba(args.raw_dir, args.output_dir, retrieved_at)}
    counts.update(build_opus(args.raw_dir, args.output_dir, retrieved_at))
    print(json.dumps(counts, indent=2))


if __name__ == '__main__':
    main()
