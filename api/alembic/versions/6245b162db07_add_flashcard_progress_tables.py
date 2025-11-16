"""add_flashcard_progress_tables

Revision ID: 6245b162db07
Revises: ba903611d8fc
Create Date: 2025-11-16 22:43:55.077367

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6245b162db07'
down_revision: Union[str, Sequence[str], None] = 'ba903611d8fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create flashcard_decks table
    op.create_table(
        'flashcard_decks',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('topic', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('card_type', sa.String(), nullable=False, server_default='custom'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_flashcard_decks_user_id', 'flashcard_decks', ['user_id'])
    
    # Create flashcards table
    op.create_table(
        'flashcards',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('deck_id', sa.UUID(), nullable=False),
        sa.Column('front', sa.Text(), nullable=False),
        sa.Column('back', sa.Text(), nullable=False),
        sa.Column('pronunciation', sa.Text(), nullable=True),
        sa.Column('example', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['deck_id'], ['flashcard_decks.id'], ondelete='CASCADE')
    )
    op.create_index('idx_flashcards_deck_id', 'flashcards', ['deck_id'])
    
    # Create user_flashcard_progress table
    op.create_table(
        'user_flashcard_progress',
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('flashcard_id', sa.UUID(), nullable=False),
        sa.Column('times_reviewed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_reviewed', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('next_review', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('confidence', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('user_id', 'flashcard_id'),
        sa.ForeignKeyConstraint(['flashcard_id'], ['flashcards.id'], ondelete='CASCADE')
    )
    op.create_index('idx_flashcard_progress_user_id', 'user_flashcard_progress', ['user_id'])
    op.create_index('idx_flashcard_progress_next_review', 'user_flashcard_progress', ['next_review'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order (due to foreign keys)
    op.drop_index('idx_flashcard_progress_next_review', table_name='user_flashcard_progress')
    op.drop_index('idx_flashcard_progress_user_id', table_name='user_flashcard_progress')
    op.drop_table('user_flashcard_progress')
    
    op.drop_index('idx_flashcards_deck_id', table_name='flashcards')
    op.drop_table('flashcards')
    
    op.drop_index('idx_flashcard_decks_user_id', table_name='flashcard_decks')
    op.drop_table('flashcard_decks')
