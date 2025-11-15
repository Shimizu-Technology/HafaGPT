"""add_image_url_to_conversation_logs

Revision ID: 49d9a91f7817
Revises: d3b964d04649
Create Date: 2025-11-15 20:37:01.920650

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49d9a91f7817'
down_revision: Union[str, Sequence[str], None] = 'd3b964d04649'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add image_url column to conversation_logs table."""
    op.add_column('conversation_logs', sa.Column('image_url', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove image_url column from conversation_logs table."""
    op.drop_column('conversation_logs', 'image_url')
