#!/usr/bin/env python3
"""Build offline JSON snapshots from pinned, untrusted downloads; never ingest.

Run with python -I. No archive members are extracted or executed. Source strings
are copied verbatim except for the line delimiter in Moses plain-text packages.
See documentation/phase4-data/OPEN_SENTENCES.md for download URLs and licenses.
"""

import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile


OPUS = (
    ('Tatoeba', 'v2026-07-08', 'opus_tatoeba_ch_en', 'CC-BY-2.0-FR',
     'https://creativecommons.org/licenses/by/2.0/fr/', 'unknown', 237),
    ('translatewiki', 'v2026-07-01', 'opus_translatewiki_ch_en', 'CC-BY-3.0',
     'https://creativecommons.org/licenses/by/3.0/', 'unknown', 700),
    ('wikimedia', 'v20260327', 'opus_wikimedia_ch_en', 'CC-BY-SA-4.0',
     'https://creativecommons.org/licenses/by-sa/4.0/', 'unknown', 49),
    ('bible-uedin', 'v1', 'opus_bible_uedin_ch_en', 'CC0-1.0',
     'https://creativecommons.org/publicdomain/zero/1.0/', 'historical', 14486),
)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_snapshot(output_dir, source_id, version, artifact, pairs, notices):
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


def build_tatoeba(raw_dir, output_dir, retrieved_at):
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


def build_opus(raw_dir, output_dir, retrieved_at):
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
            xml_links = None
            if corpus == 'bible-uedin':
                xml = archive.read(f'{corpus}.ch-en.xml')
                if b'<!ENTITY' in xml:
                    raise ValueError('XML entity declarations are not allowed')
                root = ET.fromstring(xml)
                groups = root.findall('linkGrp')
                xml_links = [(link.attrib['xtargets'].split(';'), group.attrib['fromDoc'], group.attrib['toDoc'])
                             for group in groups for link in group.findall('link')]
                if len(xml_links) != len(ch_lines):
                    raise ValueError('Bible alignment IDs do not match sentence rows')
            if len(ch_lines) != expected_count or len(en_lines) != expected_count:
                raise ValueError(f'Unexpected {corpus} alignment count')
            source_url = f'https://opus.nlpl.eu/legacy/{corpus}-{version}.php'
            pairs = []
            for row, (chamorro, english) in enumerate(zip(ch_lines, en_lines, strict=True), 1):
                ids = {'chamorro': [f'{ch_name}:{row}'], 'english': [f'{en_name}:{row}']}
                if xml_links:
                    ids = {'chamorro': xml_links[row - 1][0][0].split(), 'english': xml_links[row - 1][0][1].split()}
                pair = {
                    'pair_id': f'{source_id}:{version}:{row}', 'source_id': source_id,
                    'source': source_url, 'license': license_id, 'license_url': license_url,
                    'attribution': f'{corpus} contributors and OPUS; J. Tiedemann (2012), Parallel Data, Tools and Interfaces in OPUS. See packaged notices.',
                    'sentence_id_kind': 'opus_xml' if xml_links else 'archive_line',
                    'sentence_ids': ids, 'alignment_row': row, 'retrieved_at': retrieved_at,
                    'orthography': orthography, 'review_status': 'unreviewed',
                    'teaching_eligible': False, 'chamorro': chamorro, 'english': english,
                }
                if xml_links:
                    pair['source_documents'] = {'chamorro': xml_links[row - 1][1], 'english': xml_links[row - 1][2]}
                pairs.append(pair)
        write_snapshot(output_dir, source_id, version,
                       {'url': f'https://object.pouta.csc.fi/OPUS-{corpus}/{version}/moses/ch-en.txt.zip',
                        'sha256': sha256(path), 'files': [ch_name, en_name]}, pairs,
                       [f'licenses/{source_id}.README.txt', f'licenses/{source_id}.LICENSE.txt',
                        'Text copied without translation or spelling changes. Archive-line IDs identify exact lines in the pinned archive, not original contributor sentence IDs.'])
        counts[source_id] = len(pairs)
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--raw-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--retrieved-at', required=True, type=date.fromisoformat)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    retrieved_at = args.retrieved_at.isoformat()
    counts = {'tatoeba_chamorro': build_tatoeba(args.raw_dir, args.output_dir, retrieved_at)}
    counts.update(build_opus(args.raw_dir, args.output_dir, retrieved_at))
    print(json.dumps(counts, indent=2))


if __name__ == '__main__':
    main()
