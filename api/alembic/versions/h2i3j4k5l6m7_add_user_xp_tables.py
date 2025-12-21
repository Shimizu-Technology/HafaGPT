"""Add user_xp and xp_history tables for XP/leveling system

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2025-12-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h2i3j4k5l6m7'
down_revision: Union[str, None] = 'g1h2i3j4k5l6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_xp table for storing total XP and level
    op.create_table(
        'user_xp',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False, unique=True),
        sa.Column('total_xp', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('level', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_xp_user_id', 'user_xp', ['user_id'], unique=True)
    
    # Create xp_history table for tracking XP events
    op.create_table(
        'xp_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('xp_amount', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(), nullable=False),  # 'flashcard', 'quiz', 'game', 'chat', 'topic_complete', 'streak_bonus', 'daily_goal'
        sa.Column('activity_id', sa.String(), nullable=True),  # Optional reference to specific activity (topic_id, quiz_id, etc.)
        sa.Column('description', sa.String(), nullable=True),  # Human-readable description
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_xp_history_user_id', 'xp_history', ['user_id'])
    op.create_index('ix_xp_history_created_at', 'xp_history', ['created_at'])
    
    # Add daily_goal columns to user preferences (stored in user_xp for simplicity)
    # daily_goal_minutes: 5, 10, 15, 20 (0 = disabled)
    op.add_column('user_xp', sa.Column('daily_goal_minutes', sa.Integer(), nullable=False, server_default='10'))
    op.add_column('user_xp', sa.Column('today_minutes', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user_xp', sa.Column('goal_date', sa.Date(), nullable=True))  # Date of today_minutes tracking


def downgrade() -> None:
    op.drop_index('ix_xp_history_created_at', table_name='xp_history')
    op.drop_index('ix_xp_history_user_id', table_name='xp_history')
    op.drop_table('xp_history')
    op.drop_index('ix_user_xp_user_id', table_name='user_xp')
    op.drop_table('user_xp')

