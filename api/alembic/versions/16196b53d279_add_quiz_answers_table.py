"""add_quiz_answers_table

Revision ID: 16196b53d279
Revises: 3b48b7e385d6
Create Date: 2025-11-28 23:09:20.077530

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '16196b53d279'
down_revision: Union[str, Sequence[str], None] = '3b48b7e385d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create quiz_answers table to store individual question results
    op.create_table(
        'quiz_answers',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('quiz_result_id', sa.UUID(), sa.ForeignKey('quiz_results.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', sa.String(255), nullable=False),  # e.g., "greet-1"
        sa.Column('question_text', sa.Text(), nullable=False),  # The actual question
        sa.Column('question_type', sa.String(50), nullable=False),  # multiple_choice, type_answer, fill_blank
        sa.Column('user_answer', sa.Text(), nullable=False),  # What the user answered
        sa.Column('correct_answer', sa.Text(), nullable=False),  # The correct answer
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),  # Optional explanation
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )
    
    # Create index for faster lookups
    op.create_index('idx_quiz_answers_quiz_result_id', 'quiz_answers', ['quiz_result_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_quiz_answers_quiz_result_id')
    op.drop_table('quiz_answers')
