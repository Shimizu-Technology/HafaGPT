"""Create the foundational conversation log table.

Revision ID: 000000000001
Revises:
Create Date: 2026-08-08

The original repository began Alembic history by altering a table that had been
created manually. Existing databases at later revisions implicitly include this
ancestor; fresh databases now have a complete migration path.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "000000000001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversation_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.TIMESTAMP(), nullable=True, server_default=sa.text("now()")),
        sa.Column("mode", sa.Text(), nullable=True),
        sa.Column("user_message", sa.Text(), nullable=True),
        sa.Column("bot_response", sa.Text(), nullable=True),
        sa.Column("sources_used", JSONB(), nullable=True),
        sa.Column("used_rag", sa.Boolean(), nullable=True),
        sa.Column("used_web_search", sa.Boolean(), nullable=True),
        sa.Column("response_time_seconds", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_session_id", "conversation_logs", ["session_id"])
    op.create_index("idx_timestamp", "conversation_logs", ["timestamp"])
    op.create_index("idx_mode", "conversation_logs", ["mode"])


def downgrade() -> None:
    op.drop_index("idx_mode", table_name="conversation_logs")
    op.drop_index("idx_timestamp", table_name="conversation_logs")
    op.drop_index("idx_session_id", table_name="conversation_logs")
    op.drop_table("conversation_logs")
