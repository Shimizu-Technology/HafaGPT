"""link_conversations_to_learning_topics

Revision ID: q1r2s3t4u5v6
Revises: p0q1r2s3t4u5
Create Date: 2026-08-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "q1r2s3t4u5v6"
down_revision: Union[str, Sequence[str], None] = "p0q1r2s3t4u5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX_NAME = "idx_conversations_user_topic_updated"


def _drop_invalid_preview_index() -> None:
    """Make an interrupted concurrent index build safely retryable."""
    invalid_index = op.get_bind().execute(
        sa.text(
            """
            SELECT index_class.relname
            FROM pg_class AS index_class
            JOIN pg_index AS index_state
              ON index_state.indexrelid = index_class.oid
            JOIN pg_namespace AS index_namespace
              ON index_namespace.oid = index_class.relnamespace
            WHERE index_namespace.nspname = current_schema()
              AND index_state.indisvalid = false
              AND index_class.relname = :index_name
            """
        ),
        {"index_name": INDEX_NAME},
    ).scalar()
    if invalid_index:
        op.drop_index(
            INDEX_NAME,
            table_name="conversations",
            if_exists=True,
            postgresql_concurrently=True,
        )


def upgrade() -> None:
    """Add an optional topic relationship and its bounded-preview index."""
    op.execute(
        "ALTER TABLE conversations "
        "ADD COLUMN IF NOT EXISTS learning_topic_id VARCHAR(64)"
    )
    with op.get_context().autocommit_block():
        _drop_invalid_preview_index()
        op.create_index(
            INDEX_NAME,
            "conversations",
            ["user_id", "learning_topic_id", "updated_at"],
            if_not_exists=True,
            postgresql_concurrently=True,
            postgresql_where=sa.text("deleted_at IS NULL"),
        )


def downgrade() -> None:
    """Remove the topic relationship without blocking conversation writes."""
    with op.get_context().autocommit_block():
        op.drop_index(
            INDEX_NAME,
            table_name="conversations",
            if_exists=True,
            postgresql_concurrently=True,
        )
    op.drop_column("conversations", "learning_topic_id")
