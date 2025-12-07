"""add_game_results_table

Revision ID: a1b2c3d4e5f6
Revises: 572aa7e30b8a
Create Date: 2025-12-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '572aa7e30b8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create game_results table for tracking user game performance."""
    op.create_table(
        'game_results',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('game_type', sa.String(), nullable=False),  # e.g., 'memory_match', 'word_scramble'
        sa.Column('mode', sa.String(), nullable=True),  # 'beginner' or 'challenge'
        sa.Column('category_id', sa.String(), nullable=False),  # e.g., 'greetings', 'numbers'
        sa.Column('category_title', sa.String(), nullable=True),  # Human-readable: 'Greetings'
        sa.Column('difficulty', sa.String(), nullable=True),  # 'easy', 'medium', 'hard'
        sa.Column('score', sa.Integer(), nullable=False),  # Calculated score
        sa.Column('moves', sa.Integer(), nullable=True),  # For memory match
        sa.Column('pairs', sa.Integer(), nullable=True),  # Number of pairs matched
        sa.Column('time_seconds', sa.Integer(), nullable=True),  # Time to complete
        sa.Column('stars', sa.Integer(), nullable=True),  # 1-3 star rating
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Index for fast user lookups
    op.create_index('idx_game_results_user_id', 'game_results', ['user_id'])
    
    # Index for game type queries
    op.create_index('idx_game_results_game_type', 'game_results', ['game_type'])
    
    # Index for category-based queries
    op.create_index('idx_game_results_category', 'game_results', ['category_id'])
    
    # Composite index for user + game type (for stats)
    op.create_index('idx_game_results_user_game', 'game_results', ['user_id', 'game_type'])
    
    # Index for recent results (sorted by date)
    op.create_index('idx_game_results_created_at', 'game_results', ['created_at'])


def downgrade() -> None:
    """Drop game_results table."""
    op.drop_index('idx_game_results_created_at', table_name='game_results')
    op.drop_index('idx_game_results_user_game', table_name='game_results')
    op.drop_index('idx_game_results_category', table_name='game_results')
    op.drop_index('idx_game_results_game_type', table_name='game_results')
    op.drop_index('idx_game_results_user_id', table_name='game_results')
    op.drop_table('game_results')


