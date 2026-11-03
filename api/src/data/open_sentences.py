"""Offline sentence snapshots. Importing this module never opens a database."""

from __future__ import annotations

from datetime import date
import json
import re
from pathlib import Path


SNAPSHOT_DIR = Path(__file__).resolve().parents[2] / 'data' / 'open_sentences' / 'v1'
ORTHOGRAPHIES = {'guam_2024', 'cnmi', 'historical', 'unknown'}
LICENSES = {
    'tatoeba_chamorro': 'CC-BY-2.0-FR',
    'opus_translatewiki_ch_en': 'CC-BY-3.0',
}


def validate_open_sentence_snapshot(payload: dict) -> None:
    """Fail closed on missing provenance, wrong licensing, or teaching approval."""
    if payload.get('schema_version') != 1 or payload.get('snapshot_version') != 'v1':
        raise ValueError('Unsupported open-sentence snapshot version')
    source_id = payload.get('source_id')
    if source_id not in LICENSES:
        raise ValueError('Unknown open-sentence source')
    artifact = payload.get('artifact')
    if not payload.get('source_version') or not isinstance(artifact, dict) or not payload.get('notices'):
        raise ValueError('Snapshot needs versioned artifact provenance and notices')
    if source_id == 'tatoeba_chamorro':
        pages = artifact.get('pages')
        if not isinstance(pages, list) or not pages or any(not isinstance(page, dict) for page in pages):
            raise ValueError('Snapshot requires hashed Tatoeba page artifacts')
        digests = [page.get('sha256') for page in pages]
    else:
        provenance_artifacts = artifact.get('provenance_artifacts')
        if not isinstance(provenance_artifacts, list) or {item.get('file') for item in provenance_artifacts if isinstance(item, dict)} != {'ch-en.xml.gz', 'ch.zip', 'en.zip'} or len(provenance_artifacts) != 3:
            raise ValueError('Translatewiki requires pinned XML provenance artifacts')
        digests = [artifact.get('sha256'), *(item.get('sha256') for item in provenance_artifacts)]
    if any(not isinstance(digest, str) or len(digest) != 64
           or any(char not in '0123456789abcdefABCDEF' for char in digest) for digest in digests):
        raise ValueError('Snapshot artifacts require valid SHA-256 digests')
    pairs = payload.get('pairs')
    if not isinstance(pairs, list) or payload.get('pair_count') != len(pairs) or not pairs:
        raise ValueError('Invalid snapshot pair count')
    seen = set()
    for row, pair in enumerate(pairs, 1):
        if not isinstance(pair, dict):
            raise ValueError('Sentence pair must be an object')
        for field in ('pair_id', 'source', 'license_url', 'attribution', 'chamorro', 'english'):
            if not isinstance(pair.get(field), str) or not pair[field].strip():
                raise ValueError(f'Sentence pair requires {field}')
        if pair['pair_id'] in seen:
            raise ValueError('Duplicate sentence pair ID')
        seen.add(pair['pair_id'])
        if pair.get('source_id') != source_id or pair.get('license') != LICENSES[source_id]:
            raise ValueError('Sentence pair source/license mismatch')
        if pair.get('orthography') not in ORTHOGRAPHIES:
            raise ValueError('Unsupported sentence orthography')
        if pair.get('review_status') != 'unreviewed' or pair.get('teaching_eligible') is not False:
            raise ValueError('Offline snapshots cannot grant teaching approval')
        ids = pair.get('sentence_ids')
        if not isinstance(ids, dict) or set(ids) != {'chamorro', 'english'}:
            raise ValueError('Sentence pair requires both source sentence IDs')
        for values in ids.values():
            if not isinstance(values, list) or not values or any(not isinstance(value, str) or not value.strip() for value in values):
                raise ValueError('Sentence IDs must be nonempty strings')
        if source_id == 'tatoeba_chamorro':
            if (pair.get('sentence_id_kind') != 'tatoeba_sentence'
                    or any(len(values) != 1 or not re.fullmatch(r'[1-9][0-9]*', values[0]) for values in ids.values())
                    or pair['pair_id'] != f"tatoeba:{ids['chamorro'][0]}:{ids['english'][0]}"):
                raise ValueError('Malformed Tatoeba identifier')
        else:
            if (payload['source_version'] != 'v2026-07-01'
                    or pair.get('sentence_id_kind') != 'archive_line'
                    or type(pair.get('alignment_row')) is not int or pair['alignment_row'] != row
                    or pair['pair_id'] != f"{source_id}:v2026-07-01:{row}"
                    or ids != {'chamorro': [f'translatewiki.ch-en.ch:{row}'], 'english': [f'translatewiki.ch-en.en:{row}']}):
                raise ValueError('Malformed translatewiki identifier')
            provenance = pair.get('provenance')
            if not isinstance(provenance, dict):
                raise ValueError('Translatewiki needs per-record provenance')
            documents, source_ids = provenance.get('source_documents'), provenance.get('source_sentence_ids')
            if (not isinstance(documents, dict) or set(documents) != {'chamorro', 'english'}
                    or not isinstance(source_ids, dict) or set(source_ids) != {'chamorro', 'english'}):
                raise ValueError('Malformed translatewiki provenance identifiers')
            for language, code in (('chamorro', 'ch'), ('english', 'en')):
                if (not isinstance(documents[language], str)
                        or not re.fullmatch(rf'{code}/[A-Za-z0-9_-]+/[a-z0-9_-]+\.xml\.gz', documents[language])
                        or not isinstance(source_ids[language], list) or not source_ids[language]
                        or any(not isinstance(value, str) or not re.fullmatch(r'[1-9][0-9]*(?:\.[1-9][0-9]*)?', value) for value in source_ids[language])):
                    raise ValueError('Malformed translatewiki provenance identifiers')
            if (not isinstance(provenance.get('alignment_id'), str) or not re.fullmatch(r'SL[1-9][0-9]*', provenance['alignment_id'])
                    or provenance.get('message_key') is not None
                    or provenance.get('message_key_status') != 'not_provided_in_opus_package'
                    or provenance.get('upstream_dump_url') != 'https://translatewiki.net/static/translation-dump'):
                raise ValueError('Malformed translatewiki provenance identifiers')
        if not isinstance(pair.get('retrieved_at'), str):
            raise ValueError('Sentence pair requires a retrieval date')
        try:
            date.fromisoformat(pair['retrieved_at'])
        except ValueError as error:
            raise ValueError('Invalid sentence retrieval date') from error


def load_open_sentence_pairs(*, include_historical: bool = False, snapshot_dir: Path = SNAPSHOT_DIR) -> tuple[dict, ...]:
    """Read only approved bundled sources; removed sources fail closed.

    No historical dataset is currently bundled; include_historical is retained
    for caller compatibility and cannot enable removed OPUS snapshots.
    Returned unknown-orthography text remains unreviewed offline evidence. This
    function does not promote it to teaching content or authorize ingestion.
    """
    paths = sorted(snapshot_dir.glob('*.json'))
    if not paths:
        raise ValueError('No open-sentence snapshots found')
    pairs = []
    seen_sources = set()
    for path in paths:
        payload = json.loads(path.read_text(encoding='utf-8'))
        validate_open_sentence_snapshot(payload)
        if payload['source_id'] in seen_sources:
            raise ValueError('Duplicate open-sentence source snapshot')
        seen_sources.add(payload['source_id'])
        pairs.extend(pair for pair in payload['pairs'] if include_historical or pair['orthography'] != 'historical')
    return tuple(pairs)
