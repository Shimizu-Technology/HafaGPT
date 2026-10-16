"""Durable, content-free status for in-flight tutor replies.

Production runs several web worker processes, so an in-memory flag only reaches
the worker that owns a stream. One small row per request lets any worker deliver
cancellation, and lets a client whose connection dropped learn whether its reply
is still being written, was saved, or was lost. Rows hold identifiers and
timestamps only, never message text.
"""
from __future__ import annotations

import logging
import re
import threading
from collections.abc import Callable
from contextlib import closing
from typing import Any

from .database_connections import get_db_connection_with_retry

logger = logging.getLogger(__name__)

HEARTBEAT_SECONDS = 2.0
# A running request whose owner stopped refreshing it (worker restart, deploy,
# crash) is reported as interrupted instead of leaving the client waiting.
STALE_AFTER_SECONDS = 30
RETENTION = "7 days"
TERMINAL_STATUSES = ("complete", "failed", "cancelled")
_PENDING_ID = re.compile(r"^[A-Za-z0-9_.:-]{8,200}$")
# Owners of streams running in this worker, so Stop can be checked locally when
# the database is unavailable.
_local_owners: dict[str, str] = {}
_local_owners_lock = threading.Lock()


def valid_pending_id(pending_id: object) -> bool:
    return isinstance(pending_id, str) and bool(_PENDING_ID.fullmatch(pending_id))


def owns_local_stream(pending_id: str, user_id: str) -> bool:
    with _local_owners_lock:
        return _local_owners.get(pending_id) == user_id


class RequestTracker:
    """Register one owned request, refresh it while it runs, and record its outcome.

    Tracking is best effort: a database outage must never block a reply, so every
    failure is logged and the stream continues with in-memory cancellation only.
    """

    def __init__(
        self, pending_id: str, user_id: str, conversation_id: str | None,
        on_cancel: Callable[[], None], connect: Callable[[], Any] = get_db_connection_with_retry,
        heartbeat_seconds: float = HEARTBEAT_SECONDS,
    ) -> None:
        self.pending_id = pending_id
        self.user_id = user_id
        self.conversation_id = conversation_id
        self._on_cancel = on_cancel
        self._connect = connect
        self._heartbeat_seconds = heartbeat_seconds
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._starter: threading.Thread | None = None
        self._tracking = False
        with _local_owners_lock:
            _local_owners[pending_id] = user_id

    def start_in_background(self) -> None:
        """Register without delaying the reply; finish() waits for registration."""
        self._starter = threading.Thread(target=self.start, name="chat-request-start", daemon=True)
        self._starter.start()

    def start(self) -> bool:
        try:
            with closing(self._connect()) as conn, closing(conn.cursor()) as cursor:
                cursor.execute(f"DELETE FROM chat_requests WHERE created_at < now() - interval '{RETENTION}'")
                # A cancel can arrive before the stream registers; keep its flag.
                cursor.execute(
                    """
                    INSERT INTO chat_requests (pending_id, user_id, conversation_id, status, registered)
                    VALUES (%s, %s, %s, 'running', true)
                    ON CONFLICT (pending_id) DO UPDATE
                        SET conversation_id = EXCLUDED.conversation_id, registered = true, updated_at = now()
                        WHERE chat_requests.user_id = EXCLUDED.user_id
                          AND chat_requests.status = 'running'
                    RETURNING cancel_requested
                    """,
                    (self.pending_id, self.user_id, self.conversation_id),
                )
                row = cursor.fetchone()
                conn.commit()
        except Exception as error:
            logger.warning("CHAT_REQUEST start_failed=%s", type(error).__name__)
            return False
        if row is None:
            # Another account owns this ID or it already finished; never touch it.
            logger.warning("CHAT_REQUEST start_rejected")
            return False
        self._tracking = True
        if row[0]:
            self._on_cancel()
        self._thread = threading.Thread(target=self._heartbeat, name="chat-request-heartbeat", daemon=True)
        self._thread.start()
        return True

    def _heartbeat(self) -> None:
        conn = None
        failures = 0
        while not self._stop.wait(self._heartbeat_seconds):
            try:
                if conn is None:
                    conn = self._connect()
                    conn.autocommit = True
                with closing(conn.cursor()) as cursor:
                    cursor.execute(
                        "UPDATE chat_requests SET updated_at = now() "
                        "WHERE pending_id = %s AND user_id = %s AND status = 'running' "
                        "RETURNING cancel_requested",
                        (self.pending_id, self.user_id),
                    )
                    row = cursor.fetchone()
                failures = 0
                if row and row[0]:
                    self._on_cancel()
            except Exception as error:
                failures += 1
                if failures == 1:
                    logger.warning("CHAT_REQUEST heartbeat_failed=%s", type(error).__name__)
                if conn is not None:
                    try:
                        conn.close()
                    except Exception:
                        pass
                conn = None
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

    def finish(self, status: str) -> None:
        if status not in TERMINAL_STATUSES:
            raise ValueError(f"Unknown terminal status: {status}")
        if self._starter is not None:
            self._starter.join(timeout=10)
        self._stop.set()
        with _local_owners_lock:
            _local_owners.pop(self.pending_id, None)
        if self._thread is not None:
            self._thread.join(timeout=self._heartbeat_seconds + 1)
        if not self._tracking:
            return
        try:
            with closing(self._connect()) as conn, closing(conn.cursor()) as cursor:
                cursor.execute(
                    "UPDATE chat_requests SET status = %s, updated_at = now() "
                    "WHERE pending_id = %s AND user_id = %s AND status = 'running'",
                    (status, self.pending_id, self.user_id),
                )
                conn.commit()
        except Exception as error:
            logger.warning("CHAT_REQUEST finish_failed=%s status=%s", type(error).__name__, status)


def terminal_status(event_types: list[str]) -> str:
    """Map the last stream event to a stored outcome; silence means failure."""
    for event_type in reversed(event_types):
        if event_type == "done":
            return "complete"
        if event_type == "cancelled":
            return "cancelled"
        if event_type == "error":
            return "failed"
    return "failed"


def request_cancel(pending_id: str, user_id: str, connect: Callable[[], Any] = get_db_connection_with_retry) -> bool:
    """Record an owner's cancel so whichever worker runs the stream can see it."""
    with closing(connect()) as conn, closing(conn.cursor()) as cursor:
        cursor.execute(
            """
            INSERT INTO chat_requests (pending_id, user_id, status, cancel_requested)
            VALUES (%s, %s, 'running', true)
            ON CONFLICT (pending_id) DO UPDATE
                SET cancel_requested = true, updated_at = now()
                WHERE chat_requests.user_id = EXCLUDED.user_id
            RETURNING pending_id
            """,
            (pending_id, user_id),
        )
        row = cursor.fetchone()
        conn.commit()
    return row is not None


def get_request_status(
    pending_id: str, user_id: str, connect: Callable[[], Any] = get_db_connection_with_retry,
) -> dict[str, Any] | None:
    """Return an owner's request outcome, reporting silent running rows as interrupted."""
    with closing(connect()) as conn, closing(conn.cursor()) as cursor:
        cursor.execute(
            """
            SELECT status, conversation_id, cancel_requested, registered,
                   updated_at < now() - make_interval(secs => %s) AS stale
            FROM chat_requests WHERE pending_id = %s AND user_id = %s
            """,
            (STALE_AFTER_SECONDS, pending_id, user_id),
        )
        row = cursor.fetchone()
    if row is None:
        return None
    status, conversation_id, cancel_requested, registered, stale = row
    if not registered:
        # Only an early Stop was recorded; no reply ever started for this ID.
        return None
    if status == "running" and stale:
        status = "cancelled" if cancel_requested else "interrupted"
    return {"status": status, "conversation_id": conversation_id}
