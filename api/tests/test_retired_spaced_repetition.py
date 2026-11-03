"""Real route/SQL regressions with isolated, pre-retirement SRS snapshots.

Set SRS_TEST_DSN to a local database named hafagpt_srs_test. Each test owns
and drops a random schema; importing the full AI application is unnecessary.
"""

import ast
import logging
import os
from pathlib import Path
from typing import Optional
from uuid import uuid4

import psycopg2
import pytest
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.testclient import TestClient

from api.learning_concepts import RETIRED_CONCEPT_IDS, curated_concept_id
from api.models import SpacedRepetitionReviewRequest
from api.spaced_repetition import upsert_spaced_repetition_review


ACTIVE = curated_concept_id('verbs', 0)
SAVED = 'v1:saved:fixture'


@pytest.fixture
def database(monkeypatch):
    dsn = os.environ.get('SRS_TEST_DSN')
    if not dsn:
        pytest.skip('SRS_TEST_DSN not supplied for isolated local PostgreSQL test')
    connect = psycopg2.connect
    schema = 'srs_' + uuid4().hex

    def connection(*_args):
        conn = connect(dsn)
        assert conn.info.host in ('localhost', '127.0.0.1', '/tmp')
        assert conn.info.dbname == 'hafagpt_srs_test'
        with conn.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema}"')
        conn.commit()
        return conn

    with connection() as conn, conn.cursor() as cursor:
        cursor.execute(f'CREATE SCHEMA "{schema}"')
        cursor.execute('''CREATE TABLE spaced_repetition (
            user_id text, card_id text, deck_id text, easiness_factor numeric,
            interval integer, repetition integer, last_review timestamptz,
            next_review timestamptz, total_reviews integer, correct_count integer,
            incorrect_count integer, front text, back text, pronunciation text,
            example text, source_kind text, updated_at timestamptz,
            UNIQUE(user_id, card_id))''')
        # Retired snapshots sort before the active card and are also mastered.
        for card in sorted(RETIRED_CONCEPT_IDS):
            cursor.execute('''INSERT INTO spaced_repetition VALUES
                ('learner', %s, 'curated:verbs', 2.5, 45, 8, now() - interval '60 days',
                 now() - interval '15 days', 10, 8, 2, 'historical snapshot',
                 'historical meaning', NULL, NULL, 'curated', now())''', (card,))
        cursor.execute('''INSERT INTO spaced_repetition VALUES
            ('learner', %s, 'curated:verbs', 2.5, 1, 0, NULL, NULL,
             0, 0, 0, 'active snapshot', 'active meaning', NULL, NULL, 'curated', now()),
            ('learner', %s, 'saved:fixture', 2.5, 45, 8, now(), now() + interval '45 days',
             10, 8, 2, 'historical snapshot', 'historical meaning', NULL, NULL, 'saved', now()),
            ('other-learner', 'other-card', 'curated:verbs', 2.5, 1, 0, NULL, NULL,
             0, 0, 0, 'other snapshot', 'other meaning', NULL, NULL, 'curated', now())''', (ACTIVE, SAVED))
    conn.close()
    monkeypatch.setattr(psycopg2, 'connect', connection)
    try:
        yield connection
    finally:
        with connection() as conn, conn.cursor() as cursor:
            cursor.execute(f'DROP SCHEMA "{schema}" CASCADE')
        conn.close()


def route_client():
    async def verify_user(authorization):
        if authorization != 'Bearer fixture':
            raise HTTPException(status_code=401)
        return 'learner'

    app = FastAPI()
    namespace = dict(app=app, Optional=Optional, Query=Query, Header=Header,
                     HTTPException=HTTPException, os=os, logger=logging.getLogger(__name__),
                     verify_user=verify_user, RETIRED_CONCEPT_IDS=RETIRED_CONCEPT_IDS,
                     SpacedRepetitionReviewRequest=SpacedRepetitionReviewRequest,
                     upsert_spaced_repetition_review=upsert_spaced_repetition_review)
    source = Path(__file__).resolve().parents[1] / 'api' / 'main.py'
    names = {'_fetch_sr_summary', 'get_due_flashcards', 'record_flashcard_review',
             'get_spaced_repetition_summary'}
    nodes = [node for node in ast.parse(source.read_text()).body
             if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
    assert len(nodes) == len(names)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), 'exec'), namespace)
    return TestClient(app), namespace


def snapshots(connection):
    conn = connection()
    with conn, conn.cursor() as cursor:
        cursor.execute('SELECT * FROM spaced_repetition ORDER BY user_id, card_id')
        rows = cursor.fetchall()
    conn.close()
    return rows


@pytest.mark.parametrize('deck_query', ['', '&deck_id=curated:verbs'])
def test_due_cards_filter_retired_snapshots_before_limit_and_count(database, deck_query):
    client, _ = route_client()
    before = snapshots(database)
    response = client.get('/api/flashcards/due?limit=1' + deck_query,
                          headers={'Authorization': 'Bearer fixture'})
    assert response.status_code == 200
    result = response.json()
    assert [card['card_id'] for card in result['due_cards']] == [ACTIVE]
    assert result['total_due'] == 1
    assert result['has_due_cards'] is True
    assert snapshots(database) == before


def test_both_summary_paths_exclude_retired_mastery_but_keep_saved_cards(database):
    client, namespace = route_client()
    expected = dict(total_cards=2, due_today=1, mastered=1, learning=1, has_cards=True)
    response = client.get('/api/flashcards/stats/summary', headers={'Authorization': 'Bearer fixture'})
    assert response.status_code == 200
    assert response.json() == expected
    conn = database()
    with conn, conn.cursor() as cursor:
        assert namespace['_fetch_sr_summary']('learner', cursor) == expected
    conn.close()


@pytest.mark.parametrize('quality', [0, 5])
def test_retired_grade_replays_are_successful_noops_and_preserve_every_column(database, quality):
    client, _ = route_client()
    before = snapshots(database)
    for card in RETIRED_CONCEPT_IDS:
        for _ in range(2):
            response = client.post('/api/flashcards/review', headers={'Authorization': 'Bearer fixture'},
                                   json=dict(card_id=card, deck_id='curated:verbs', quality=quality))
            assert response.status_code == 200
            assert response.json() == dict(card_id=card, deck_id='curated:verbs',
                                           ignored=True, reason='retired_card')
    assert snapshots(database) == before


def test_active_grade_still_updates_schedule_and_counts(database):
    client, _ = route_client()
    response = client.post('/api/flashcards/review', headers={'Authorization': 'Bearer fixture'},
                           json=dict(card_id=ACTIVE, deck_id='curated:verbs', quality=5))
    assert response.status_code == 200
    assert response.json()['repetition'] == 1
    assert response.json()['correct_count'] == 1
    assert response.json()['total_reviews'] == 1
    assert client.get('/api/flashcards/due', headers={'Authorization': 'Bearer fixture'}).json() == {
        'due_cards': [], 'total_due': 0, 'has_due_cards': False}


def test_retired_grade_requires_auth_and_shared_writer_never_touches_a_cursor():
    client, _ = route_client()
    card = sorted(RETIRED_CONCEPT_IDS)[0]
    assert client.post('/api/flashcards/review', json=dict(
        card_id=card, deck_id='curated:verbs', quality=5)).status_code == 401
    for _ in range(2):
        assert upsert_spaced_repetition_review(None, user_id='learner', card_id=card,
            deck_id='curated:verbs', quality=5)['ignored'] is True
