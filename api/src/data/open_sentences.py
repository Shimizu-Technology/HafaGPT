"""Offline sentence snapshots. Importing this module never opens a database."""

from __future__ import annotations

from datetime import date
import json
from pathlib import Path


SNAPSHOT_DIR = Path(__file__).resolve().parents[2] / 'data' / 'open_sentences' / 'v1'
ORTHOGRAPHIES = {'guam_2024', 'cnmi', 'historical', 'unknown'}
LICENSES = {
    'tatoeba_chamorro': 'CC-BY-2.0-FR',
    'opus_tatoeba_ch_en': 'CC-BY-2.0-FR',
    'opus_translatewiki_ch_en': 'CC-BY-3.0',
    'opus_wikimedia_ch_en': 'CC-BY-SA-4.0',
    'opus_bible_uedin_ch_en': 'CC0-1.0',
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
        digests = [artifact.get('sha256')]
    if any(not isinstance(digest, str) or len(digest) != 64
           or any(char not in '0123456789abcdefABCDEF' for char in digest) for digest in digests):
        raise ValueError('Snapshot artifacts require valid SHA-256 digests')
    pairs = payload.get('pairs')
    if not isinstance(pairs, list) or payload.get('pair_count') != len(pairs) or not pairs:
        raise ValueError('Invalid snapshot pair count')
    seen = set()
    for pair in pairs:
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
        if source_id == 'opus_bible_uedin_ch_en' and pair['orthography'] != 'historical':
            raise ValueError('Bible-derived pairs must remain historical')
        if pair.get('review_status') != 'unreviewed' or pair.get('teaching_eligible') is not False:
            raise ValueError('Offline snapshots cannot grant teaching approval')
        if pair.get('sentence_id_kind') not in {'tatoeba_sentence', 'archive_line', 'opus_xml'}:
            raise ValueError('Sentence pair needs an explicit identifier kind')
        ids = pair.get('sentence_ids')
        if not isinstance(ids, dict) or set(ids) != {'chamorro', 'english'}:
            raise ValueError('Sentence pair requires both source sentence IDs')
        for values in ids.values():
            if not isinstance(values, list) or not values or any(not isinstance(value, str) or not value.strip() for value in values):
                raise ValueError('Sentence IDs must be nonempty strings')
        if not isinstance(pair.get('retrieved_at'), str):
            raise ValueError('Sentence pair requires a retrieval date')
        try:
            date.fromisoformat(pair['retrieved_at'])
        except ValueError as error:
            raise ValueError('Invalid sentence retrieval date') from error


def load_open_sentence_pairs(*, include_historical: bool = False, snapshot_dir: Path = SNAPSHOT_DIR) -> tuple[dict, ...]:
    """Read validated files only. Historical content requires explicit opt-in.

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
