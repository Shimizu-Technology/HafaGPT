"""Shared PostgreSQL connection helpers."""

import logging
import os
import time
from typing import Any

import psycopg


logger = logging.getLogger(__name__)


def get_db_connection():
    """Open a PostgreSQL connection without retrying."""

    database_url = os.getenv("DATABASE_URL", "postgresql://localhost/chamorro_rag")
    return psycopg.connect(database_url)


def get_db_connection_with_retry(
    max_retries: int = 3,
    retry_delay: float = 0.5,
    **connect_kwargs: Any,
):
    """Open a PostgreSQL connection, retrying transient connection failures."""

    database_url = os.getenv("DATABASE_URL", "postgresql://localhost/chamorro_rag")
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            return psycopg.connect(database_url, **connect_kwargs)
        except Exception as error:
            last_error = error
            error_message = str(error).lower()
            is_connection_error = any(
                term in error_message
                for term in (
                    "ssl",
                    "connection",
                    "server closed",
                    "broken pipe",
                    "connection reset",
                    "timeout",
                    "network",
                    "eof",
                )
            )

            if is_connection_error and attempt < max_retries - 1:
                if attempt == 0:
                    logger.warning("Database connection issue; reconnecting")
                time.sleep(retry_delay * (attempt + 1))
                continue
            raise

    if last_error:
        raise last_error
    raise RuntimeError("Failed to connect to database after retries")
