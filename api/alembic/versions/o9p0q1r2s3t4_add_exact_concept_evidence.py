"""add_exact_concept_evidence

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
Create Date: 2026-08-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "o9p0q1r2s3t4"
down_revision: Union[str, Sequence[str], None] = "n8o9p0q1r2s3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add authored concept links without reclassifying historical evidence."""

    op.add_column(
        "quiz_results",
        sa.Column("client_attempt_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "quiz_results",
        sa.Column("learning_topic_id", sa.String(64), nullable=True),
    )
    op.add_column(
        "quiz_results",
        sa.Column("learning_source", sa.String(20), nullable=True),
    )
    op.add_column(
        "quiz_results",
        sa.Column("assessment_id", sa.String(128), nullable=True),
    )
    op.create_unique_constraint(
        "uq_quiz_results_user_client_attempt",
        "quiz_results",
        ["user_id", "client_attempt_id"],
    )
    op.create_index(
        "idx_quiz_results_user_learning_topic_created",
        "quiz_results",
        ["user_id", "learning_topic_id", "created_at"],
    )
    op.create_check_constraint(
        "ck_quiz_results_learning_source",
        "quiz_results",
        "learning_source IS NULL OR learning_source IN ('lesson', 'today', 'topic')",
    )
    op.create_check_constraint(
        "ck_quiz_results_assessment_context",
        "quiz_results",
        "assessment_id IS NULL OR (learning_source = 'lesson' AND learning_topic_id IS NOT NULL)",
    )

    op.add_column(
        "game_results",
        sa.Column("client_attempt_id", sa.UUID(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_game_results_user_client_attempt",
        "game_results",
        ["user_id", "client_attempt_id"],
    )

    op.add_column(
        "quiz_answers",
        sa.Column("concept_id", sa.String(255), nullable=True),
    )
    op.create_index(
        "idx_quiz_answers_concept_id",
        "quiz_answers",
        ["concept_id"],
    )

    op.drop_constraint(
        "uq_learning_attempts_game_result",
        "learning_attempts",
        type_="unique",
    )
    op.drop_constraint(
        "ck_learning_attempts_source",
        "learning_attempts",
        type_="check",
    )
    op.add_column(
        "learning_attempts",
        sa.Column(
            "evidence_scope",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'topic'"),
        ),
    )
    op.create_check_constraint(
        "ck_learning_attempts_evidence_scope",
        "learning_attempts",
        "evidence_scope IN ('topic', 'concept')",
    )
    op.create_check_constraint(
        "ck_learning_attempts_source",
        "learning_attempts",
        "source IN ('lesson', 'today', 'topic')",
    )
    op.create_unique_constraint(
        "uq_learning_attempts_game_result_concept",
        "learning_attempts",
        ["game_result_id", "concept_id"],
    )
    op.create_index(
        "uq_learning_attempts_game_result_broad",
        "learning_attempts",
        ["game_result_id"],
        unique=True,
        postgresql_where=sa.text("evidence_scope = 'topic'"),
    )

    op.create_table(
        "lesson_concept_exposures",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("topic_id", sa.String(64), nullable=False),
        sa.Column("lesson_id", sa.String(128), nullable=False),
        sa.Column("concept_id", sa.String(255), nullable=False),
        sa.Column(
            "first_exposed_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "last_exposed_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "lesson_id",
            "concept_id",
            name="uq_lesson_concept_exposure",
        ),
    )
    op.create_index(
        "idx_lesson_exposures_user_concept_last",
        "lesson_concept_exposures",
        ["user_id", "concept_id", "last_exposed_at"],
    )


def downgrade() -> None:
    """Remove the additive exact-evidence structures."""

    op.drop_index(
        "idx_lesson_exposures_user_concept_last",
        table_name="lesson_concept_exposures",
    )
    op.drop_table("lesson_concept_exposures")

    op.drop_constraint(
        "uq_game_results_user_client_attempt",
        "game_results",
        type_="unique",
    )
    op.drop_column("game_results", "client_attempt_id")

    op.drop_constraint(
        "uq_learning_attempts_game_result_concept",
        "learning_attempts",
        type_="unique",
    )
    # IF EXISTS keeps local/preview databases recoverable if this unreleased
    # migration was exercised before the partial index was added.
    op.execute("DROP INDEX IF EXISTS uq_learning_attempts_game_result_broad")
    op.drop_constraint(
        "ck_learning_attempts_source",
        "learning_attempts",
        type_="check",
    )
    op.drop_constraint(
        "ck_learning_attempts_evidence_scope",
        "learning_attempts",
        type_="check",
    )
    # The previous schema can represent only one lesson/Today topic-level row
    # per game. Remove evidence introduced by this revision before restoring
    # those older constraints instead of relabeling it as something it was not.
    op.execute(
        "DELETE FROM learning_attempts "
        "WHERE evidence_scope = 'concept' OR source = 'topic'"
    )
    op.drop_column("learning_attempts", "evidence_scope")
    op.create_check_constraint(
        "ck_learning_attempts_source",
        "learning_attempts",
        "source IN ('lesson', 'today')",
    )
    op.create_unique_constraint(
        "uq_learning_attempts_game_result",
        "learning_attempts",
        ["game_result_id"],
    )

    op.drop_index("idx_quiz_answers_concept_id", table_name="quiz_answers")
    op.drop_column("quiz_answers", "concept_id")

    op.drop_constraint(
        "ck_quiz_results_assessment_context",
        "quiz_results",
        type_="check",
    )
    op.drop_constraint(
        "ck_quiz_results_learning_source",
        "quiz_results",
        type_="check",
    )
    op.drop_index(
        "idx_quiz_results_user_learning_topic_created",
        table_name="quiz_results",
    )
    op.drop_constraint(
        "uq_quiz_results_user_client_attempt",
        "quiz_results",
        type_="unique",
    )
    op.drop_column("quiz_results", "assessment_id")
    op.drop_column("quiz_results", "learning_source")
    op.drop_column("quiz_results", "learning_topic_id")
    op.drop_column("quiz_results", "client_attempt_id")
