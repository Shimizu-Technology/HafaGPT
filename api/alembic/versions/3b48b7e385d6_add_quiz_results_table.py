"""add_quiz_results_table

Revision ID: 3b48b7e385d6
Revises: 49d9a91f7817
Create Date: 2025-11-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b48b7e385d6'
down_revision: Union[str, Sequence[str], None] = '0176a22a7e7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create quiz_results table for tracking user quiz performance."""
    op.create_table(
        'quiz_results',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('category_id', sa.String(), nullable=False),  # e.g., 'greetings', 'numbers'
        sa.Column('category_title', sa.String(), nullable=True),  # Human-readable: 'Basic Greetings'
        sa.Column('score', sa.Integer(), nullable=False),  # Number of correct answers
        sa.Column('total', sa.Integer(), nullable=False),  # Total questions
        sa.Column('percentage', sa.Float(), nullable=False),  # Pre-calculated percentage
        sa.Column('time_spent_seconds', sa.Integer(), nullable=True),  # Optional: time to complete
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Index for fast user lookups
    op.create_index('idx_quiz_results_user_id', 'quiz_results', ['user_id'])
    
    # Index for category-based queries
    op.create_index('idx_quiz_results_category', 'quiz_results', ['category_id'])
    
    # Composite index for user + category (for "best category" queries)
    op.create_index('idx_quiz_results_user_category', 'quiz_results', ['user_id', 'category_id'])
    
    # Index for recent results (sorted by date)
    op.create_index('idx_quiz_results_created_at', 'quiz_results', ['created_at'])


def downgrade() -> None:
    """Drop quiz_results table."""
    op.drop_index('idx_quiz_results_created_at', table_name='quiz_results')
    op.drop_index('idx_quiz_results_user_category', table_name='quiz_results')
    op.drop_index('idx_quiz_results_category', table_name='quiz_results')
    op.drop_index('idx_quiz_results_user_id', table_name='quiz_results')
    op.drop_table('quiz_results')
