"""Opt-in real PostgreSQL transaction tests in a disposable local schema."""
import importlib.util
import os
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlsplit
from uuid import uuid4, UUID
from concurrent.futures import ThreadPoolExecutor

import psycopg
from psycopg import sql
import pytest
from api import audio_review as review


@pytest.fixture
def store(monkeypatch):
    url = os.getenv('AUDIO_REVIEW_TEST_DATABASE_URL')
    if not url:
        pytest.skip('Set AUDIO_REVIEW_TEST_DATABASE_URL for disposable local PostgreSQL integration')
    assert urlsplit(url).hostname in {'localhost', '127.0.0.1'}, 'Integration tests require a local database'
    schema = 'audio_test_' + uuid4().hex
    def connect():
        conn = psycopg.connect(url)
        conn.execute(sql.SQL('SET search_path TO {}').format(sql.Identifier(schema)))
        return conn
    with psycopg.connect(url) as conn:
        conn.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
    migration_path = Path(__file__).parents[1] / 'alembic/versions/r2s3t4u5v6w7_add_audio_review_candidates.py'
    spec = importlib.util.spec_from_file_location('audio_migration', migration_path)
    migration = importlib.util.module_from_spec(spec); spec.loader.exec_module(migration)
    with connect() as conn:
        monkeypatch.setattr(migration, 'op', SimpleNamespace(execute=lambda statement: conn.execute(statement)))
        migration.upgrade()
    monkeypatch.setattr(review, 'get_db_connection', connect)
    yield review.AudioReviewStore()
    with psycopg.connect(url) as conn:
        conn.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))


def save(store, word='Håfa'):
    return store.save(word, b'ID3' + b'fixture' * 100,
        {'provider':'elevenlabs','model':'eleven_v4','voice_id':'fixture','input_mode':'original','input_text':word,'settings':{}},
        store.item(word), 'qa-fixture-admin')


def approve(store, candidate):
    return store.review(candidate['word'], UUID(candidate['id']), review.ReviewRequest(
        status='approved',reviewer_name='QA fixture, not a language endorsement',dialect='QA fixture',native_review_confirmed=True,
    ), 'qa-fixture-admin')


def test_pending_bytes_are_private_and_review_constraints_are_real(store):
    candidate = save(store)
    assert 'audio_bytes' not in candidate
    assert store.preview('Håfa', UUID(candidate['id'])).startswith(b'ID3')
    with pytest.raises(KeyError): store.preview('Håfa Adai!', UUID(candidate['id']))
    with pytest.raises(review.ReviewConflict): store.publish('Håfa', UUID(candidate['id']), 'qa-fixture-admin')
    assert store.manifest()['words']['Håfa'].get('candidate_id') is None
    with review.get_db_connection() as conn:
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute("UPDATE audio_candidates SET status='approved' WHERE id=%s", (candidate['id'],))


def test_publication_retry_and_concurrent_words_keep_all_committed_pointers(store, monkeypatch):
    writes=[]
    monkeypatch.setattr(review.boto3,'client',lambda *args,**kwargs:SimpleNamespace(put_object=lambda **kwargs:writes.append(kwargs)))
    a=save(store);b=save(store,'Håfa Adai!');approve(store,a);approve(store,b)
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda c:store.publish(c['word'],UUID(c['id']),'qa-fixture-admin'),[a,b]))
    manifest=store.manifest()
    assert manifest['words']['Håfa']['candidate_id']==a['id']
    assert manifest['words']['Håfa Adai!']['candidate_id']==b['id']
    public=json_manifest(writes)
    assert public['words']['Håfa']['candidate_id']==a['id']
    assert public['words']['Håfa Adai!']['candidate_id']==b['id']
    store.publish(a['word'],UUID(a['id']),'qa-fixture-admin')
    assert 'qa-fixture-admin' not in str(store.manifest()['words']['Håfa'])


def json_manifest(writes):
    import json
    return json.loads([row['Body'] for row in writes if row['Key']=='audio/manifest.json'][-1])


def test_ambiguous_manifest_export_keeps_committed_pointer_and_retryable_outbox(store, monkeypatch):
    writes=[]
    def ambiguous(**kwargs):
        writes.append(kwargs)
        if kwargs['Key']=='audio/manifest.json': raise TimeoutError('simulated timeout after upload')
    monkeypatch.setattr(review.boto3,'client',lambda *args,**kwargs:SimpleNamespace(put_object=ambiguous))
    candidate=save(store);approve(store,candidate)
    result=store.publish(candidate['word'],UUID(candidate['id']),'qa-fixture-admin')
    assert result['manifest_synced'] is False
    assert store.sync_status()['pending'] is True
    assert store.manifest()['words']['Håfa']['candidate_id']==candidate['id']
    assert json_manifest(writes)['words']['Håfa']['candidate_id']==candidate['id']
    monkeypatch.setattr(review.boto3,'client',lambda *args,**kwargs:SimpleNamespace(put_object=lambda **kwargs:writes.append(kwargs)))
    assert store.sync_manifest()['manifest_synced'] is True
    assert store.sync_status()['pending'] is False


def test_failed_publication_commit_never_exports_uncommitted_manifest(store, monkeypatch):
    writes=[]
    monkeypatch.setattr(review.boto3,'client',lambda *args,**kwargs:SimpleNamespace(put_object=lambda **kwargs:writes.append(kwargs)))
    candidate=save(store);approve(store,candidate)
    original_connect=review.get_db_connection
    count=0
    class FailedCommit:
        def __init__(self, connection): self.connection=connection
        def __enter__(self): return self.connection
        def __exit__(self,*args):
            self.connection.rollback(); self.connection.close()
            raise RuntimeError('simulated commit failure')
    def connect():
        nonlocal count
        count+=1
        connection=original_connect()
        return FailedCommit(connection) if count==2 else connection
    monkeypatch.setattr(review,'get_db_connection',connect)
    with pytest.raises(RuntimeError): store.publish(candidate['word'],UUID(candidate['id']),'qa-fixture-admin')
    assert all(write['Key']!='audio/manifest.json' for write in writes)
    assert store.manifest()['words']['Håfa'].get('candidate_id') is None
