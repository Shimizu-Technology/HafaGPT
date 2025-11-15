"""add soft delete to conversations

Revision ID: d3b964d04649
Revises: e2b21e0f0450
Create Date: 2025-11-15 14:44:02.855495

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3b964d04649'
down_revision: Union[str, Sequence[str], None] = 'e2b21e0f0450'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add deleted_at column for soft delete
    op.add_column('conversations', sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True))
    
    # Create index for faster queries of non-deleted conversations
    op.create_index('idx_conversations_deleted_at', 'conversations', ['deleted_at'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove index first
    op.drop_index('idx_conversations_deleted_at', table_name='conversations')
    
    # Remove deleted_at column
    op.drop_column('conversations', 'deleted_at')
