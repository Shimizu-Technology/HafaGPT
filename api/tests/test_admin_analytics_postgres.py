"""Opt-in real PostgreSQL test for the admin usage window, in a disposable schema."""
import os
from datetime import datetime, time, timedelta, timezone
from urllib.parse import urlsplit
from uuid import uuid4

import psycopg
import pytest
from psycopg import sql

from api.admin_analytics import fetch_usage_rows, window_start
from api.time_utils import GUAM_TIMEZONE, get_guam_date


@pytest.fixture
def cursor():
    url = os.getenv('ADMIN_ANALYTICS_TEST_DATABASE_URL')
    if not url:
        pytest.skip('Set ADMIN_ANALYTICS_TEST_DATABASE_URL for disposable local PostgreSQL integration')
    assert urlsplit(url).hostname in {'localhost', '127.0.0.1'}, 'Integration tests require a local database'
    schema = 'admin_analytics_test_' + uuid4().hex
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
        try:
            conn.execute(sql.SQL('SET search_path TO {}').format(sql.Identifier(schema)))
            # Column types follow the migrations: chat timestamps are naive UTC.
            conn.execute('CREATE TABLE conversation_logs ("timestamp" timestamp, role text, user_id text)')
            conn.execute('CREATE TABLE game_results (created_at timestamptz, user_id text)')
            conn.execute('CREATE TABLE quiz_results (created_at timestamptz, user_id text)')
            with conn.cursor() as cur:
                yield cur
        finally:
            conn.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))


def guam_noon(day):
    return datetime.combine(day, time(12), tzinfo=GUAM_TIMEZONE)


def seed(cur, day, chats, games, quizzes, user):
    moment = guam_noon(day)
    naive_utc = moment.astimezone(timezone.utc).replace(tzinfo=None)
    for _ in range(chats):
        cur.execute('INSERT INTO conversation_logs ("timestamp", role, user_id) VALUES (%s, %s, %s)', (naive_utc, 'user', user))
    for _ in range(games):
        cur.execute('INSERT INTO game_results (created_at, user_id) VALUES (%s, %s)', (moment, user))
    for _ in range(quizzes):
        cur.execute('INSERT INTO quiz_results (created_at, user_id) VALUES (%s, %s)', (moment, user))


def test_usage_rows_cover_exactly_the_window_in_guam_days(cursor):
    days = 7
    window_end = get_guam_date()
    first = window_start(window_end, days)
    seed(cursor, first - timedelta(days=1), 9, 9, 9, 'before')   # just outside the window
    seed(cursor, first, 2, 1, 0, 'a')
    seed(cursor, window_end, 3, 0, 2, 'b')
    seed(cursor, window_end + timedelta(days=1), 9, 9, 9, 'after')  # tomorrow in Guam

    rows = fetch_usage_rows(cursor, days, window_end)

    assert [(row[0], row[1], row[2], row[3], row[4]) for row in rows] == [
        (first, 2, 1, 0, 1),
        (window_end, 3, 0, 2, 1),
    ]
    assert sum(row[1] for row in rows) == 5 and sum(row[2] for row in rows) == 1 and sum(row[3] for row in rows) == 2
