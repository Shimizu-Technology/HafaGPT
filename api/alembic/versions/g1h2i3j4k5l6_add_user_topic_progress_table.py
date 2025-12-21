"""Add user_topic_progress table for learning path tracking

Revision ID: g1h2i3j4k5l6
Revises: c4d5e6f7g8h9
Create Date: 2025-12-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_topic_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('topic_id', sa.String(), nullable=False),  # 'greetings', 'numbers', etc.
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('best_quiz_score', sa.Integer(), nullable=True),  # 0-100 percentage
        sa.Column('flashcards_viewed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # Unique constraint: one progress record per user per topic
    op.create_unique_constraint('uq_user_topic_progress', 'user_topic_progress', ['user_id', 'topic_id'])
    # Index for quick lookups by user
    op.create_index('ix_user_topic_progress_user_id', 'user_topic_progress', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_topic_progress_user_id', table_name='user_topic_progress')
    op.drop_constraint('uq_user_topic_progress', 'user_topic_progress', type_='unique')
    op.drop_table('user_topic_progress')

