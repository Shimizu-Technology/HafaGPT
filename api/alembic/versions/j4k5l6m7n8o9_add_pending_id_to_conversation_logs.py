"""add_pending_id_to_conversation_logs

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-04-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j4k5l6m7n8o9'
down_revision: Union[str, None] = 'i3j4k5l6m7n8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add pending_id for safely targeting async file attachment updates."""
    op.add_column('conversation_logs', sa.Column('pending_id', sa.String(), nullable=True))
    op.create_index('idx_conversation_logs_pending_id', 'conversation_logs', ['pending_id'])


def downgrade() -> None:
    """Remove pending_id."""
    op.drop_index('idx_conversation_logs_pending_id', table_name='conversation_logs')
    op.drop_column('conversation_logs', 'pending_id')
