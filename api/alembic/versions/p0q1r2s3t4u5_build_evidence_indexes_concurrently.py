"""build_evidence_indexes_concurrently

Revision ID: p0q1r2s3t4u5
Revises: o9p0q1r2s3t4
Create Date: 2026-08-28

"""
from typing import Sequence, Union

from alembic import op


revision: str = "p0q1r2s3t4u5"
down_revision: Union[str, Sequence[str], None] = "o9p0q1r2s3t4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Build indexes on existing evidence tables without blocking writes."""

    with op.get_context().autocommit_block():
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
