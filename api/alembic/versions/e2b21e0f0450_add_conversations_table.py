"""add conversations table

Revision ID: e2b21e0f0450
Revises: 8297443c236c
Create Date: 2025-11-15 12:53:21.003419

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2b21e0f0450'
down_revision: Union[str, Sequence[str], None] = '8297443c236c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),  # NULL for anonymous users
        sa.Column('title', sa.String(), nullable=False, server_default='New Chat'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for fast queries
    op.create_index('idx_conversations_user_id', 'conversations', ['user_id'])
    op.create_index('idx_conversations_created_at', 'conversations', ['created_at'])
    
    # Add conversation_id to conversation_logs
    op.add_column('conversation_logs', sa.Column('conversation_id', sa.String(), nullable=True))
    op.create_index('idx_conversation_logs_conversation_id', 'conversation_logs', ['conversation_id'])
    
    # Create foreign key (optional, helps maintain referential integrity)
    op.create_foreign_key(
        'fk_conversation_logs_conversation_id',
        'conversation_logs', 
        'conversations',
        ['conversation_id'], 
        ['id'],
        ondelete='CASCADE'  # Delete logs when conversation is deleted
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove foreign key first
    op.drop_constraint('fk_conversation_logs_conversation_id', 'conversation_logs', type_='foreignkey')
    
    # Remove conversation_id column and index
    op.drop_index('idx_conversation_logs_conversation_id', table_name='conversation_logs')
    op.drop_column('conversation_logs', 'conversation_id')
    
    # Drop conversations table and indexes
    op.drop_index('idx_conversations_created_at', table_name='conversations')
    op.drop_index('idx_conversations_user_id', table_name='conversations')
    op.drop_table('conversations')
