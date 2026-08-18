"""add_seasonal_theme_settings

Revision ID: m7n8o9p0q1r2
Revises: l6m7n8o9p0q1
Create Date: 2026-08-18

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "m7n8o9p0q1r2"
down_revision: Union[str, Sequence[str], None] = "l6m7n8o9p0q1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add explicit, safe defaults for independently bounded seasonal visuals."""
    op.execute(
        """
        INSERT INTO site_settings (key, value, description) VALUES
            ('theme_enabled', 'false', 'Whether seasonal visual effects are active'),
            ('theme_end_date', '2026-01-06', 'End date for seasonal visual effects (YYYY-MM-DD)')
        ON CONFLICT (key) DO NOTHING
        """
    )


def downgrade() -> None:
    """Keep persisted settings so rollback cannot discard administrator choices."""
    pass
