"""add_user_daily_usage_table

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-12-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user_daily_usage table for tracking daily feature usage."""
    op.create_table(
        'user_daily_usage',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('usage_date', sa.Date(), nullable=False),
        sa.Column('chat_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('game_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('quiz_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        # Unique constraint: one row per user per day
        sa.UniqueConstraint('user_id', 'usage_date', name='uq_user_daily_usage_user_date')
    )
    
    # Index for fast user lookups
    op.create_index('idx_user_daily_usage_user_id', 'user_daily_usage', ['user_id'])
    
    # Index for date-based queries (cleanup old records)
    op.create_index('idx_user_daily_usage_date', 'user_daily_usage', ['usage_date'])
    
    # Composite index for user + date (primary lookup pattern)
    op.create_index('idx_user_daily_usage_user_date', 'user_daily_usage', ['user_id', 'usage_date'])


def downgrade() -> None:
    """Drop user_daily_usage table."""
    op.drop_index('idx_user_daily_usage_user_date', table_name='user_daily_usage')
    op.drop_index('idx_user_daily_usage_date', table_name='user_daily_usage')
    op.drop_index('idx_user_daily_usage_user_id', table_name='user_daily_usage')
    op.drop_table('user_daily_usage')

