"""add shared_conversations table

Revision ID: f1a2b3c4d5e6
Revises: c4d5e6f7g8h9
Create Date: 2025-12-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7g8h9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create shared_conversations table for public sharing feature."""
    op.create_table(
        'shared_conversations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('share_id', sa.String(), nullable=False),  # Public share identifier
        sa.Column('conversation_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),  # Who created the share
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=True),  # Optional expiration
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Unique constraint on share_id (public identifier)
    op.create_unique_constraint('uq_shared_conversations_share_id', 'shared_conversations', ['share_id'])
    
    # Index for fast lookups
    op.create_index('idx_shared_conversations_share_id', 'shared_conversations', ['share_id'])
    op.create_index('idx_shared_conversations_conversation_id', 'shared_conversations', ['conversation_id'])
    op.create_index('idx_shared_conversations_user_id', 'shared_conversations', ['user_id'])
    
    # Foreign key to conversations table
    op.create_foreign_key(
        'fk_shared_conversations_conversation_id',
        'shared_conversations',
        'conversations',
        ['conversation_id'],
        ['id'],
        ondelete='CASCADE'  # Delete shares when conversation is deleted
    )


def downgrade() -> None:
    """Drop shared_conversations table."""
    op.drop_constraint('fk_shared_conversations_conversation_id', 'shared_conversations', type_='foreignkey')
    op.drop_index('idx_shared_conversations_user_id', table_name='shared_conversations')
    op.drop_index('idx_shared_conversations_conversation_id', table_name='shared_conversations')
    op.drop_index('idx_shared_conversations_share_id', table_name='shared_conversations')
    op.drop_constraint('uq_shared_conversations_share_id', 'shared_conversations', type_='unique')
    op.drop_table('shared_conversations')
