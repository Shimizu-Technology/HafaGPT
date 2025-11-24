"""add_message_feedback_table

Revision ID: 0176a22a7e7e
Revises: 6245b162db07
Create Date: 2025-11-24 10:57:14.703570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0176a22a7e7e'
down_revision: Union[str, Sequence[str], None] = '6245b162db07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'message_feedback',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('message_id', sa.UUID(), nullable=True),
        sa.Column('conversation_id', sa.UUID(), nullable=True),
        sa.Column('user_id', sa.Text(), nullable=True),
        sa.Column('feedback_type', sa.String(10), nullable=False),  # 'up' or 'down'
        sa.Column('user_query', sa.Text(), nullable=True),
        sa.Column('bot_response', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indices for common queries
    op.create_index('ix_message_feedback_user_id', 'message_feedback', ['user_id'])
    op.create_index('ix_message_feedback_feedback_type', 'message_feedback', ['feedback_type'])
    op.create_index('ix_message_feedback_created_at', 'message_feedback', ['created_at'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_message_feedback_created_at', 'message_feedback')
    op.drop_index('ix_message_feedback_feedback_type', 'message_feedback')
    op.drop_index('ix_message_feedback_user_id', 'message_feedback')
    op.drop_table('message_feedback')
