#!/usr/bin/env python3
"""Safely adopt a verified legacy local schema prefix into Alembic history.

The monorepo conversion left some post-49d9a91f7817 objects in the local
database without advancing ``alembic_version``. This command is local-only,
dry-run by default, and refuses to stamp unless every duplicated table/column
needed through revision 3b48b7e385d6 is present. Normal Alembic migrations then
create all later objects; this script never stamps directly to head.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


API_ROOT = Path(__file__).resolve().parents[1]
EXPECTED_START = "49d9a91f7817"
ADOPTED_PREFIX = "3b48b7e385d6"
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}

REQUIRED_SCHEMA: dict[str, set[str]] = {
    "conversation_logs": {"role"},
    "flashcard_decks": {"id", "user_id", "topic", "title", "card_type", "created_at"},
    "flashcards": {"id", "deck_id", "front", "back", "pronunciation", "example", "created_at"},
    "user_flashcard_progress": {
        "user_id",
        "flashcard_id",
        "times_reviewed",
        "last_reviewed",
        "next_review",
        "confidence",
        "created_at",
        "updated_at",
    },
    "message_feedback": {
        "id",
        "message_id",
        "conversation_id",
        "user_id",
        "feedback_type",
        "user_query",
        "bot_response",
        "created_at",
    },
    "quiz_results": {
        "id",
        "user_id",
        "category_id",
        "category_title",
        "score",
        "total",
        "percentage",
        "time_spent_seconds",
        "created_at",
    },
}


def normalized_database_url(database_url: str) -> str:
    return database_url.replace("postgresql+psycopg://", "postgresql://").replace(
        "postgresql+psycopg2://", "postgresql://"
    )


def is_local_database_url(database_url: str) -> bool:
    return urlparse(normalized_database_url(database_url)).hostname in LOCAL_HOSTS


def schema_gaps(inspector) -> list[str]:
    gaps: list[str] = []
    for table, required_columns in REQUIRED_SCHEMA.items():
        if not inspector.has_table(table):
            gaps.append(f"missing table: {table}")
            continue
        actual_columns = {column["name"] for column in inspector.get_columns(table)}
        for column in sorted(required_columns - actual_columns):
            gaps.append(f"missing column: {table}.{column}")
    return gaps


def current_revision(engine) -> str | None:
    with engine.connect() as connection:
        return connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one_or_none()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--apply", action="store_true", help="Stamp only the verified duplicated prefix")
    args = parser.parse_args()
    if not args.database_url:
        parser.error("DATABASE_URL or --database-url is required")
    if not is_local_database_url(args.database_url):
        parser.error("refusing reconciliation: database host is not local")

    engine = create_engine(args.database_url)
    revision = current_revision(engine)
    gaps = schema_gaps(inspect(engine))
    report = {
        "database_host": urlparse(normalized_database_url(args.database_url)).hostname,
        "current_revision": revision,
        "expected_start": EXPECTED_START,
        "adopted_prefix": ADOPTED_PREFIX,
        "schema_gaps": gaps,
        "safe_to_stamp": revision == EXPECTED_START and not gaps,
        "mode": "apply" if args.apply else "dry-run",
    }
    print(json.dumps(report, indent=2))

    if revision == ADOPTED_PREFIX:
        print("Duplicated prefix is already adopted; run `alembic upgrade head`.")
        return 0
    if revision != EXPECTED_START or gaps:
        return 1
    if not args.apply:
        print("Dry run only. Re-run with --apply after reviewing the backup and report.")
        return 0

    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", args.database_url)
    command.stamp(config, ADOPTED_PREFIX)
    print(f"Stamped verified duplicated prefix at {ADOPTED_PREFIX}; now run `alembic upgrade head`.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
