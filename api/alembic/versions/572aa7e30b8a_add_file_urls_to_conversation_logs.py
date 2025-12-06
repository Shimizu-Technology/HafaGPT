"""add_file_urls_to_conversation_logs

Revision ID: 572aa7e30b8a
Revises: 16196b53d279
Create Date: 2025-12-06 11:53:32.445553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '572aa7e30b8a'
down_revision: Union[str, Sequence[str], None] = '16196b53d279'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add file_urls JSONB column for storing multiple file URLs per message."""
    # Add new column for multiple file URLs (array of objects with url, filename, type)
    op.add_column(
        'conversation_logs',
        sa.Column('file_urls', JSONB, nullable=True)
    )
    
    # Migrate existing image_url data to file_urls format
    # This converts single image_url to array format: [{"url": "...", "type": "image"}]
    op.execute("""
        UPDATE conversation_logs 
        SET file_urls = jsonb_build_array(
            jsonb_build_object('url', image_url, 'type', 'image', 'filename', 'uploaded_image')
        )
        WHERE image_url IS NOT NULL AND file_urls IS NULL
    """)


def downgrade() -> None:
    """Remove file_urls column."""
    op.drop_column('conversation_logs', 'file_urls')
