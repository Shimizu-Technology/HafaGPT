"""Optional read-only proof of the real PostgreSQL statement deadline/cleanup."""
import os
import time
import uuid
from contextlib import closing
from urllib.parse import urlsplit

import psycopg
import pytest

from src.rag.retrieval_runtime import database_connect_options
from api import chat_requests


@pytest.mark.integration
def test_local_statement_timeout_closes_only_its_own_connection():
    url = os.getenv('HAFAGPT_TEST_DATABASE_URL')
    if not url or urlsplit(url).hostname not in {'localhost', '127.0.0.1', '::1'}:
        pytest.skip('Set HAFAGPT_TEST_DATABASE_URL to an explicitly local PostgreSQL database')
    application_name = f'hafagpt-retrieval-timeout-{uuid.uuid4().hex[:12]}'
    connection = psycopg.connect(url, application_name=application_name, **database_connect_options())
    connection.read_only = True
    cursor = connection.cursor()
    started = time.monotonic()
    with pytest.raises(psycopg.errors.QueryCanceled):
        with closing(connection), closing(cursor):
            cursor.execute('SELECT pg_sleep(30)')
    elapsed = time.monotonic() - started
    assert 4.5 <= elapsed < 10
    assert cursor.closed and connection.closed
    # Monitor independently; never cancel/terminate any borrowed backend.
    with closing(psycopg.connect(url, **database_connect_options())) as monitor, closing(monitor.cursor()) as check:
        check.execute('SELECT count(*) FROM pg_stat_activity WHERE application_name = %s', (application_name,))
        assert check.fetchone()[0] == 0


@pytest.mark.integration
def test_request_tracking_connection_times_out_on_an_owned_advisory_lock(monkeypatch):
    url = os.getenv('HAFAGPT_TEST_DATABASE_URL')
    if not url or urlsplit(url).hostname not in {'localhost', '127.0.0.1', '::1'}:
        pytest.skip('Set HAFAGPT_TEST_DATABASE_URL to an explicitly local PostgreSQL database')
    monkeypatch.setenv('DATABASE_URL', url)
    # The random session lock owns no table rows and disappears on connection
    # close. Never inspect or release another session's lock.
    lock_id = uuid.uuid4().int % (2**63 - 1)
    with closing(psycopg.connect(url, **database_connect_options())) as owner, closing(owner.cursor()) as held:
        held.execute('SELECT pg_advisory_lock(%s)', (lock_id,))
        waiting = chat_requests._connect_quickly()
        cursor = waiting.cursor()
        started = time.monotonic()
        with pytest.raises((psycopg.errors.LockNotAvailable, psycopg.errors.QueryCanceled)):
            with closing(waiting), closing(cursor):
                cursor.execute('SELECT pg_advisory_lock(%s)', (lock_id,))
        assert 4.5 <= time.monotonic() - started < 10
        assert cursor.closed and waiting.closed
