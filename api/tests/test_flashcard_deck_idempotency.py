"""Endpoint contract tests without importing paid providers or connecting to a DB."""
import ast
import asyncio
import logging
from pathlib import Path
from types import SimpleNamespace
from typing import Optional
from uuid import uuid4

import psycopg
import pytest
from fastapi import HTTPException
from api.models import SaveDeckRequest, SaveDeckResponse


class Store:
    def __init__(self):
        self.decks = {}
        self.cards = {}
        self.result = None
        self.connections = 0

    def connect(self, *_args):
        self.connections += 1
        return self

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        pass

    def cursor(self):
        return self

    def execute(self, sql, args):
        if 'INSERT INTO flashcard_decks' in sql:
            deck_id, user, topic, title, kind, _date = args
            if deck_id in self.decks:
                self.result = None
            else:
                self.decks[deck_id] = (user, topic, title, kind)
                self.cards[deck_id] = []
                self.result = (deck_id,)
        elif 'INSERT INTO flashcards' in sql:
            self.cards[args[0]].append(args[1:5])
        elif 'SELECT user_id' in sql:
            self.result = self.decks.get(args[0])
        elif 'SELECT front' in sql:
            self.result = self.cards[args[0]]
        else:
            raise AssertionError(sql)

    def fetchone(self):
        return self.result

    def fetchall(self):
        return self.result

    def commit(self):
        pass

    def close(self):
        pass


@pytest.fixture
def endpoint(monkeypatch):
    store = Store()
    monkeypatch.setattr(psycopg, 'connect', store.connect)
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example.invalid/no-real-database')
    path = Path(__file__).resolve().parents[1] / 'api' / 'main.py'
    node = next(n for n in ast.parse(path.read_text()).body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'save_flashcard_deck')
    node.decorator_list = []

    async def verify_user(token):
        if token == 'expired':
            raise HTTPException(status_code=401)
        return token

    namespace = dict(SaveDeckRequest=SaveDeckRequest, SaveDeckResponse=SaveDeckResponse,
                     Optional=Optional, Header=lambda default=None: default,
                     verify_user=verify_user, HTTPException=HTTPException,
                     logger=logging.getLogger(__name__), os=SimpleNamespace(getenv=lambda _: 'unused'))
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(path), 'exec'), namespace)
    return namespace['save_flashcard_deck'], store


def payload(user='user-a', **changes):
    return SaveDeckRequest(**dict(user_id=user, topic='fixture', title='Fixture deck',
                                  cards=[dict(front='Prompt', back='Meaning')]) | changes)


def save(endpoint, request=None, key=None, user='user-a'):
    function, _store = endpoint
    kwargs = dict(request=request or payload(user), authorization=user)
    if 'idempotency_key' in function.__annotations__:
        kwargs['idempotency_key'] = key
    return asyncio.run(function(**kwargs))


def test_lost_response_retry_returns_one_deck_and_one_card(endpoint):
    key = str(uuid4())
    committed = save(endpoint, key=key)  # Client loses this response after commit.
    retried = save(endpoint, key=key)
    assert retried.deck_id == committed.deck_id
    assert len(endpoint[1].decks) == 1
    assert sum(map(len, endpoint[1].cards.values())) == 1


def test_reused_key_rejects_changed_set_instead_of_overwriting(endpoint):
    key = str(uuid4())
    saved = save(endpoint, key=key)
    changed = payload(cards=[dict(front='Changed prompt', back='Meaning')])
    with pytest.raises(HTTPException) as error:
        save(endpoint, changed, key=key)
    assert error.value.status_code == 409
    assert endpoint[1].cards[saved.deck_id] == [('Prompt', 'Meaning', None, None)]


def test_same_key_is_scoped_to_verified_account(endpoint):
    key = str(uuid4())
    a = save(endpoint, key=key)
    b = save(endpoint, key=key, user='user-b')
    assert a.deck_id != b.deck_id
    assert len(endpoint[1].decks) == 2


@pytest.mark.parametrize('user,key,status', [('user-b', str(uuid4()), 403), ('expired', str(uuid4()), 401), ('user-a', 'not-a-uuid', 422)])
def test_invalid_authorization_or_key_never_opens_database(endpoint, user, key, status):
    with pytest.raises(HTTPException) as error:
        save(endpoint, payload(), key=key, user=user)
    assert error.value.status_code == status
    assert endpoint[1].connections == 0


def test_legacy_clients_without_key_can_still_create_distinct_decks(endpoint):
    assert save(endpoint).deck_id != save(endpoint).deck_id
