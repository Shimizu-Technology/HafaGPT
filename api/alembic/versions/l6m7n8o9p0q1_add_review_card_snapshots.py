"""Add reconstructable card snapshots to spaced repetition.

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-08-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "l6m7n8o9p0q1"
down_revision: Union[str, Sequence[str], None] = "k5l6m7n8o9p0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Store the minimum content needed to show a due-review queue."""

    op.add_column("spaced_repetition", sa.Column("front", sa.Text(), nullable=True))
    op.add_column("spaced_repetition", sa.Column("back", sa.Text(), nullable=True))
    op.add_column("spaced_repetition", sa.Column("pronunciation", sa.Text(), nullable=True))
    op.add_column("spaced_repetition", sa.Column("example", sa.Text(), nullable=True))
    op.add_column("spaced_repetition", sa.Column("source_kind", sa.String(length=32), nullable=True))


def downgrade() -> None:
    """Remove only additive snapshots; review history remains untouched."""

    op.drop_column("spaced_repetition", "source_kind")
    op.drop_column("spaced_repetition", "example")
    op.drop_column("spaced_repetition", "pronunciation")
    op.drop_column("spaced_repetition", "back")
    op.drop_column("spaced_repetition", "front")
