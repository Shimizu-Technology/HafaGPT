"""add_role_column_to_conversation_logs

Revision ID: ba903611d8fc
Revises: 49d9a91f7817
Create Date: 2025-11-16 02:59:33.438875

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba903611d8fc'
down_revision: Union[str, Sequence[str], None] = '49d9a91f7817'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add role column to conversation_logs (user, assistant, or system)
    op.add_column(
        'conversation_logs',
        sa.Column('role', sa.String(), nullable=False, server_default='user')
    )
    
    # Update existing records based on message content
    # user_message is not null -> role='user'
    # bot_response is not null -> role='assistant'
    op.execute("""
        UPDATE conversation_logs
        SET role = CASE
            WHEN bot_response IS NOT NULL THEN 'assistant'
            ELSE 'user'
        END
    """)
    
    # Create index for faster role-based queries
    op.create_index('idx_conversation_logs_role', 'conversation_logs', ['role'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index first
    op.drop_index('idx_conversation_logs_role', table_name='conversation_logs')
    
    # Drop role column
    op.drop_column('conversation_logs', 'role')
