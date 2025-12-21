"""Add spaced_repetition table for SM-2 algorithm tracking

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2025-12-21 13:00:00.000000

This table tracks individual flashcard progress for the SM-2 spaced repetition algorithm.
Uses string-based card_id to support both curated learning path cards and future custom cards.

SM-2 Algorithm fields:
- easiness_factor: How easy the card is for the user (1.3 to 2.5+, starts at 2.5)
- interval: Days until next review (starts at 1)
- repetition: Number of successful repetitions (resets on "hard")
- next_review: Timestamp for when card should be reviewed next
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'i3j4k5l6m7n8'
down_revision: Union[str, None] = 'h2i3j4k5l6m7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'spaced_repetition',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        # card_id format: "{deck_id}:{card_index}" e.g., "greetings:3" or "colors:5"
        sa.Column('card_id', sa.String(), nullable=False),
        sa.Column('deck_id', sa.String(), nullable=False),  # "greetings", "numbers", etc.
        
        # SM-2 algorithm fields
        sa.Column('easiness_factor', sa.Float(), nullable=False, server_default='2.5'),
        sa.Column('interval', sa.Integer(), nullable=False, server_default='1'),  # days
        sa.Column('repetition', sa.Integer(), nullable=False, server_default='0'),
        
        # Review tracking
        sa.Column('last_review', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_review', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_reviews', sa.Integer(), nullable=False, server_default='0'),
        
        # Stats
        sa.Column('correct_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('incorrect_count', sa.Integer(), nullable=False, server_default='0'),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    # Unique constraint: one record per user per card
    op.create_unique_constraint('uq_spaced_repetition_user_card', 'spaced_repetition', ['user_id', 'card_id'])
    # Index for quick lookups by user
    op.create_index('ix_spaced_repetition_user_id', 'spaced_repetition', ['user_id'])
    # Index for finding due cards
    op.create_index('ix_spaced_repetition_next_review', 'spaced_repetition', ['user_id', 'next_review'])
    # Index by deck for filtering
    op.create_index('ix_spaced_repetition_deck_id', 'spaced_repetition', ['user_id', 'deck_id'])


def downgrade() -> None:
    op.drop_index('ix_spaced_repetition_deck_id', table_name='spaced_repetition')
    op.drop_index('ix_spaced_repetition_next_review', table_name='spaced_repetition')
    op.drop_index('ix_spaced_repetition_user_id', table_name='spaced_repetition')
    op.drop_constraint('uq_spaced_repetition_user_card', 'spaced_repetition', type_='unique')
    op.drop_table('spaced_repetition')

