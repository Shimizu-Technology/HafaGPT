"""Bound interactive reference lookups without leaving background workers behind."""
from __future__ import annotations

import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar

CONNECT_TIMEOUT_SECONDS = 5
STATEMENT_TIMEOUT_MS = 5000
EMBEDDING_TIMEOUT_SECONDS = 5.0
RETRIEVAL_BUDGET_SECONDS = 15.0


class RetrievalStopped(Exception):
    """The learner stopped this lookup, or its interactive time budget expired."""


_request: ContextVar[tuple[Callable[[], bool] | None, float] | None] = ContextVar(
    "retrieval_request", default=None,
)


@contextmanager
def retrieval_scope(cancelled: Callable[[], bool] | None = None) -> Iterator[None]:
    """Keep cancellation local to this request/thread, restoring any outer scope."""
    token = _request.set((cancelled, time.monotonic() + RETRIEVAL_BUDGET_SECONDS))
    try:
        check_retrieval()
        yield
    finally:
        _request.reset(token)


def check_retrieval() -> None:
    current = _request.get()
    if current is None:
        return
    cancelled, deadline = current
    if cancelled and cancelled():
        raise RetrievalStopped("Reference lookup cancelled")
    if time.monotonic() >= deadline:
        raise RetrievalStopped("Reference lookup time budget exceeded")


def database_connect_options() -> dict:
    return {
        "connect_timeout": CONNECT_TIMEOUT_SECONDS,
        "options": f"-c statement_timeout={STATEMENT_TIMEOUT_MS} -c lock_timeout={STATEMENT_TIMEOUT_MS}",
    }
