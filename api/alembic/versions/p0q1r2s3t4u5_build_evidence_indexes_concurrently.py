"""build_evidence_indexes_concurrently

Revision ID: p0q1r2s3t4u5
Revises: o9p0q1r2s3t4
Create Date: 2026-08-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "p0q1r2s3t4u5"
down_revision: Union[str, Sequence[str], None] = "o9p0q1r2s3t4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVIDENCE_INDEXES = (
    ("idx_quiz_results_user_learning_topic_created", "quiz_results"),
    ("idx_quiz_answers_concept_id", "quiz_answers"),
)


def _drop_invalid_evidence_indexes() -> None:
    """Remove interrupted concurrent builds so a retry can rebuild them."""

    invalid_names = set(
        op.get_bind()
        .execute(
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
                  AND index_class.relname IN (
                    'idx_quiz_results_user_learning_topic_created',
                    'idx_quiz_answers_concept_id'
                  )
                """
            )
        )
        .scalars()
    )
    for index_name, table_name in EVIDENCE_INDEXES:
        if index_name in invalid_names:
            op.drop_index(
                index_name,
                table_name=table_name,
                if_exists=True,
                postgresql_concurrently=True,
            )


def upgrade() -> None:
    """Build indexes on existing evidence tables without blocking writes."""

    with op.get_context().autocommit_block():
        _drop_invalid_evidence_indexes()
        op.create_index(
            "idx_quiz_results_user_learning_topic_created",
            "quiz_results",
            ["user_id", "learning_topic_id", "created_at"],
            if_not_exists=True,
            postgresql_concurrently=True,
        )
        op.create_index(
            "idx_quiz_answers_concept_id",
            "quiz_answers",
            ["concept_id"],
            if_not_exists=True,
            postgresql_concurrently=True,
        )


def downgrade() -> None:
    """Drop the evidence indexes without blocking writes."""

    with op.get_context().autocommit_block():
        op.drop_index(
            "idx_quiz_answers_concept_id",
            table_name="quiz_answers",
            if_exists=True,
            postgresql_concurrently=True,
        )
        op.drop_index(
            "idx_quiz_results_user_learning_topic_created",
            table_name="quiz_results",
            if_exists=True,
            postgresql_concurrently=True,
        )
