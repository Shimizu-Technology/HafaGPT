"""add_site_settings_table

Revision ID: c4d5e6f7g8h9
Revises: b2c3d4e5f6g7
Create Date: 2025-12-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7g8h9'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create site_settings table for admin-configurable settings."""
    op.create_table(
        'site_settings',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('key', sa.String(100), nullable=False, unique=True),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_by', sa.String(), nullable=True),  # Clerk user_id of admin who updated
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Index for fast key lookups
    op.create_index('idx_site_settings_key', 'site_settings', ['key'], unique=True)
    
    # Insert default settings
    op.execute("""
        INSERT INTO site_settings (key, value, description) VALUES
        ('promo_enabled', 'false', 'Whether the promotional period is active'),
        ('promo_end_date', '2026-01-06', 'End date for the promotional period (YYYY-MM-DD)'),
        ('promo_title', 'Felis Påsgua! Holiday Gift: Unlimited Access!', 'Title text for the promo banner'),
        ('promo_message_signed_in', 'Enjoy unlimited learning through {end_date}! 🌺', 'Message for signed-in users'),
        ('promo_message_signed_out', 'Create a free account for unlimited access through {end_date}! 🌺', 'Message for signed-out users'),
        ('theme', 'default', 'Current site theme (default, christmas, etc.)')
    """)


def downgrade() -> None:
    """Drop site_settings table."""
    op.drop_index('idx_site_settings_key', table_name='site_settings')
    op.drop_table('site_settings')
