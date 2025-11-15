"""add_user_id_to_conversation_logs

Revision ID: 8297443c236c
Revises: 
Create Date: 2025-11-15 12:09:50.047510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8297443c236c'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add user_id column to conversation_logs
    op.add_column('conversation_logs', sa.Column('user_id', sa.String(), nullable=True))
    
    # Create index for faster user queries
    op.create_index('idx_conversation_logs_user_id', 'conversation_logs', ['user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index first
    op.drop_index('idx_conversation_logs_user_id', table_name='conversation_logs')
    
    # Drop user_id column
    op.drop_column('conversation_logs', 'user_id')
