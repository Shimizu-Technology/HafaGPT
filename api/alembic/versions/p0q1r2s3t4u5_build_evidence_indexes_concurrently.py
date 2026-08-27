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
    (
        "idx_quiz_results_user_learning_topic_created",
        "quiz_results",
        ("user_id", "learning_topic_id", "created_at"),
        False,
    ),
    ("idx_quiz_answers_concept_id", "quiz_answers", ("concept_id",), False),
    (
        "uq_quiz_results_user_client_attempt",
        "quiz_results",
        ("user_id", "client_attempt_id"),
        True,
    ),
    (
        "uq_game_results_user_client_attempt",
        "game_results",
        ("user_id", "client_attempt_id"),
        True,
    ),
)


def _drop_invalid_evidence_indexes() -> None:
    """Remove interrupted concurrent builds so a retry can rebuild them."""

    index_names = tuple(index_name for index_name, *_rest in EVIDENCE_INDEXES)
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
                  AND index_class.relname IN :index_names
                """
            ).bindparams(sa.bindparam("index_names", expanding=True)),
            {"index_names": index_names},
        )
        .scalars()
    )
    for index_name, table_name, _columns, _unique in EVIDENCE_INDEXES:
        if index_name in invalid_names:
            op.drop_index(
                index_name,
                table_name=table_name,
                if_exists=True,
                postgresql_concurrently=True,
            )


def _attach_unique_constraints() -> None:
    """Attach completed unique indexes without rebuilding either large table."""

    unique_indexes = tuple(index for index in EVIDENCE_INDEXES if index[3])
    constraint_names = tuple(index_name for index_name, *_rest in unique_indexes)
    existing_names = set(
        op.get_bind()
        .execute(
            sa.text(
                """
                SELECT constraint_state.conname
                FROM pg_constraint AS constraint_state
                JOIN pg_namespace AS constraint_namespace
                  ON constraint_namespace.oid = constraint_state.connamespace
                WHERE constraint_namespace.nspname = current_schema()
                  AND constraint_state.conname IN :constraint_names
                """
            ).bindparams(sa.bindparam("constraint_names", expanding=True)),
            {"constraint_names": constraint_names},
        )
        .scalars()
    )
    for index_name, table_name, _columns, _unique in unique_indexes:
        if index_name not in existing_names:
            op.execute(
                sa.text(
                    f'ALTER TABLE "{table_name}" ADD CONSTRAINT "{index_name}" '
                    f'UNIQUE USING INDEX "{index_name}"'
                )
            )


def upgrade() -> None:
    """Build indexes on existing evidence tables without blocking writes."""

    with op.get_context().autocommit_block():
        _drop_invalid_evidence_indexes()
        for index_name, table_name, columns, unique in EVIDENCE_INDEXES:
            op.create_index(
                index_name,
                table_name,
                list(columns),
                unique=unique,
                if_not_exists=True,
                postgresql_concurrently=True,
            )
    _attach_unique_constraints()


def downgrade() -> None:
    """Drop the evidence indexes without blocking writes."""

    op.execute(
        "ALTER TABLE game_results "
        "DROP CONSTRAINT IF EXISTS uq_game_results_user_client_attempt"
    )
    op.execute(
        "ALTER TABLE quiz_results "
        "DROP CONSTRAINT IF EXISTS uq_quiz_results_user_client_attempt"
    )
    with op.get_context().autocommit_block():
        for index_name, table_name, _columns, _unique in reversed(EVIDENCE_INDEXES):
            op.drop_index(
                index_name,
                table_name=table_name,
                if_exists=True,
                postgresql_concurrently=True,
            )
