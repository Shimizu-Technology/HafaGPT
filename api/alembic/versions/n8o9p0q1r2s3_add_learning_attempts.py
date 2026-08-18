"""add_learning_attempts

Revision ID: n8o9p0q1r2s3
Revises: m7n8o9p0q1r2
Create Date: 2026-08-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "n8o9p0q1r2s3"
down_revision: Union[str, Sequence[str], None] = "m7n8o9p0q1r2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create an answer-text-free first-party concept-attempt ledger."""
    op.create_table(
        "learning_attempts",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("concept_id", sa.String(255), nullable=False),
        sa.Column("activity_type", sa.String(64), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("duration_bucket", sa.String(20), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("game_result_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "duration_bucket IN ('under_2m', '2_to_5m', 'over_5m', 'unknown')",
            name="ck_learning_attempts_duration_bucket",
        ),
        sa.CheckConstraint(
            "source IN ('lesson', 'today')",
            name="ck_learning_attempts_source",
        ),
        sa.ForeignKeyConstraint(
            ["game_result_id"],
            ["game_results.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("game_result_id", name="uq_learning_attempts_game_result"),
    )
    op.create_index(
        "idx_learning_attempts_user_concept_created",
        "learning_attempts",
        ["user_id", "concept_id", "created_at"],
    )


def downgrade() -> None:
    """Remove only the additive attempt ledger on an explicit downgrade."""
    op.drop_index("idx_learning_attempts_user_concept_created", table_name="learning_attempts")
    op.drop_table("learning_attempts")
