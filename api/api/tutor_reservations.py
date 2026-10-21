"""Durable, content-free usage reservations and one-time Tutor dispatch fences.

The logical ID survives connection retries. The random dispatch token belongs to
one pre-generation attempt: reconciliation invalidates it before releasing a use.
An old HTTP request therefore cannot start after the client safely sends again.
No prompt, attachment, token for authentication, or reply is stored here.

Games can adopt ``reserve_usage(user_id, 'game', attempt_id, ...)``. Repeating an
ID returns its existing approval and never increments twice. Only Tutor uses the
dispatch/reconciliation functions. Always authenticate ownership at the route.
"""
from __future__ import annotations

from contextlib import closing, contextmanager
from datetime import date
import re
import secrets
from typing import Any, Callable

from .database_connections import get_db_connection_with_retry


_ID = re.compile(r"^[A-Za-z0-9_.:-]{8,200}$")
_TYPES = frozenset(('chat', 'game', 'quiz'))


def valid_logical_id(value: object) -> bool:
    return isinstance(value, str) and bool(_ID.fullmatch(value))


def _connect() -> Any:
    # Fences must fail closed; a DB outage must never permit an untracked send.
    return get_db_connection_with_retry(max_retries=2, connect_timeout=5,
        options='-c statement_timeout=5000 -c lock_timeout=5000')


@contextmanager
def _transaction(user_id: str, usage_type: str, logical_id: str, connect: Callable):
    if usage_type not in _TYPES or not valid_logical_id(logical_id):
        raise ValueError('Invalid usage type or logical send ID')
    with closing(connect()) as conn:
        try:
            with closing(conn.cursor()) as cursor:
                # Also locks an absent row, closing reserve/reconcile/claim races.
                cursor.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))',
                    (f'{user_id}:{usage_type}:{logical_id}',))
                yield cursor
            conn.commit()
        except BaseException:
            conn.rollback()
            raise


def _row(cursor, user_id, usage_type, logical_id):
    cursor.execute('''SELECT state, dispatch_token, usage_date, charged,
                            generation_started, conversation_id
                     FROM tutor_usage_reservations
                     WHERE user_id=%s AND usage_type=%s AND logical_id=%s''',
        (user_id, usage_type, logical_id))
    return cursor.fetchone()


def _counter(cursor, user_id, usage_type, today):
    # All reservation changes lock the logical ID first, then the daily row.
    cursor.execute('''INSERT INTO user_daily_usage (user_id, usage_date)
                      VALUES (%s, %s) ON CONFLICT (user_id, usage_date) DO NOTHING''',
        (user_id, today))
    cursor.execute(f'''SELECT {usage_type}_count FROM user_daily_usage
                       WHERE user_id=%s AND usage_date=%s FOR UPDATE''', (user_id, today))
    return cursor.fetchone()[0]


def reserve_usage(user_id: str, usage_type: str, logical_id: str, *, today: date,
                  limit: int, is_premium: bool, connect: Callable = _connect) -> dict:
    """Atomically reserve at most once per account/type/logical ID, including games.

    ``today`` must be Guam's date. Releases use the *original* reservation date.
    Reacquiring a retryable pre-generation send reserves against today's limit.
    """
    with _transaction(user_id, usage_type, logical_id, connect) as cursor:
        row = _row(cursor, user_id, usage_type, logical_id)
        count = _counter(cursor, user_id, usage_type, today)
        existing = row is not None and row[0] != 'retryable'
        allowed = existing and row[0] != 'abandoned'
        token = row[1] if row else None
        state = row[0] if row else 'retryable'
        if not existing and (is_premium or count < limit):
            token = secrets.token_urlsafe(24)
            if usage_type == 'chat' and row is not None:
                # An early Stop may predate registration. Its old flag belongs
                # to the fenced dispatch, never to the explicit retry.
                cursor.execute('''DELETE FROM chat_requests WHERE pending_id=%s
                    AND user_id=%s AND registered=false''', (logical_id, user_id))
            cursor.execute(f'''UPDATE user_daily_usage SET {usage_type}_count={usage_type}_count+1,
                              updated_at=now() WHERE user_id=%s AND usage_date=%s
                              RETURNING {usage_type}_count''', (user_id, today))
            count = cursor.fetchone()[0]
            cursor.execute('''INSERT INTO tutor_usage_reservations
                (user_id,usage_type,logical_id,usage_date,charged,state,dispatch_token)
                VALUES (%s,%s,%s,%s,true,'reserved',%s)
                ON CONFLICT (user_id,usage_type,logical_id) DO UPDATE SET
                    usage_date=EXCLUDED.usage_date, charged=true, state='reserved',
                    dispatch_token=EXCLUDED.dispatch_token, updated_at=now()''',
                (user_id, usage_type, logical_id, today, token))
            allowed, state = True, 'reserved'
        return dict(success=allowed, new_count=count,
            limit=-1 if is_premium else limit,
            remaining=-1 if is_premium else max(0, limit-count),
            is_premium=is_premium, dispatch_token=token if allowed else None, status=state)


def claim_send(user_id: str, logical_id: str, dispatch_token: str,
               conversation_id: str | None, *, connect: Callable = _connect) -> dict:
    """The sole permission to invoke generation. Never best effort or reusable."""
    with _transaction(user_id, 'chat', logical_id, connect) as cursor:
        row = _row(cursor, user_id, 'chat', logical_id)
        if not row or row[0] != 'reserved' or not secrets.compare_digest(row[1] or '', dispatch_token):
            return dict(claimed=False, status=row[0] if row else 'retryable',
                conversation_id=row[5] if row else None)
        cursor.execute('''UPDATE tutor_usage_reservations SET state='running',
            generation_started=true, conversation_id=%s, updated_at=now()
            WHERE user_id=%s AND usage_type='chat' AND logical_id=%s''',
            (conversation_id, user_id, logical_id))
        return dict(claimed=True, status='running', conversation_id=conversation_id)


def get_send_status(user_id: str, logical_id: str, *, connect: Callable = _connect) -> dict | None:
    with _transaction(user_id, 'chat', logical_id, connect) as cursor:
        row = _row(cursor, user_id, 'chat', logical_id)
        if not row:
            return None
        return dict(status=row[0], conversation_id=row[5], generation_started=row[4])


def reconcile_send(user_id: str, logical_id: str, *, today: date, abandon: bool = False,
                   expected_token: str | None = None,
                   connect: Callable = _connect) -> dict:
    """Fence an unstarted dispatch before refunding; uncertainty never authorizes retry.

    A missing ID gets a tombstone too. A delayed original request then cannot
    claim until an explicit new reservation issues a different dispatch token.
    Once claimed, even stale/failed generation cannot be retried under this ID.
    """
    with _transaction(user_id, 'chat', logical_id, connect) as cursor:
        row = _row(cursor, user_id, 'chat', logical_id)
        if expected_token is not None and (not row or not secrets.compare_digest(row[1] or '', expected_token)):
            # A late failing HTTP attempt must not refund/fence a newer retry.
            return dict(status=row[0] if row else 'retryable',
                conversation_id=row[5] if row else None,
                generation_started=row[4] if row else False)
        if row and row[4]:
            return dict(status=row[0], conversation_id=row[5], generation_started=True)
        state = 'abandoned' if abandon or (row and row[0] == 'abandoned') else 'retryable'
        if row and row[3]:
            _counter(cursor, user_id, 'chat', row[2])
            cursor.execute('''UPDATE user_daily_usage SET chat_count=GREATEST(0,chat_count-1),
                updated_at=now() WHERE user_id=%s AND usage_date=%s''', (user_id, row[2]))
        cursor.execute('''INSERT INTO tutor_usage_reservations
            (user_id,usage_type,logical_id,usage_date,charged,state)
            VALUES (%s,'chat',%s,%s,false,%s)
            ON CONFLICT (user_id,usage_type,logical_id) DO UPDATE SET
                charged=false, state=EXCLUDED.state, dispatch_token=NULL, updated_at=now()''',
            (user_id, logical_id, today, state))
        return dict(status=state, conversation_id=row[5] if row else None, generation_started=False)


def finish_send(user_id: str, logical_id: str, status: str, *, connect: Callable = _connect) -> None:
    if status not in ('complete', 'failed', 'cancelled'):
        raise ValueError('Invalid terminal send status')
    with _transaction(user_id, 'chat', logical_id, connect) as cursor:
        cursor.execute('''UPDATE tutor_usage_reservations SET state=%s, updated_at=now()
            WHERE user_id=%s AND usage_type='chat' AND logical_id=%s AND state='running' ''',
            (status, user_id, logical_id))
