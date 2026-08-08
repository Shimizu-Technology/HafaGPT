"""Reconcile schema details with the active runtime contract.

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-08-08
"""

from typing import Sequence, Union

from alembic import op


revision: str = "k5l6m7n8o9p0"
down_revision: Union[str, Sequence[str], None] = "j4k5l6m7n8o9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make clean installs and legacy local databases honor the same contract."""

    # The web client uses optimistic IDs such as ``streaming_<timestamp>``.
    # Historical UUID columns therefore reject valid feedback before it can be
    # associated with a persisted message. Casting UUID installations to text
    # is lossless and is a no-op in meaning for legacy VARCHAR installations.
    op.execute(
        """
        ALTER TABLE message_feedback
            ALTER COLUMN message_id TYPE VARCHAR USING message_id::text,
            ALTER COLUMN conversation_id TYPE VARCHAR USING conversation_id::text,
            ALTER COLUMN user_id TYPE VARCHAR USING user_id::text
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('public.ix_message_feedback_user_id') IS NULL THEN
                IF to_regclass('public.idx_message_feedback_user_id') IS NOT NULL THEN
                    ALTER INDEX idx_message_feedback_user_id RENAME TO ix_message_feedback_user_id;
                ELSE
                    CREATE INDEX ix_message_feedback_user_id ON message_feedback (user_id);
                END IF;
            END IF;

            IF to_regclass('public.ix_message_feedback_feedback_type') IS NULL THEN
                IF to_regclass('public.idx_message_feedback_type') IS NOT NULL THEN
                    ALTER INDEX idx_message_feedback_type RENAME TO ix_message_feedback_feedback_type;
                ELSE
                    CREATE INDEX ix_message_feedback_feedback_type ON message_feedback (feedback_type);
                END IF;
            END IF;

            IF to_regclass('public.ix_message_feedback_created_at') IS NULL THEN
                CREATE INDEX ix_message_feedback_created_at ON message_feedback (created_at);
            END IF;

            IF to_regclass('public.idx_conversation_logs_role') IS NULL THEN
                CREATE INDEX idx_conversation_logs_role ON conversation_logs (role);
            END IF;
        END $$
        """
    )


def downgrade() -> None:
    """Keep string identifiers because legacy optimistic IDs are not UUID-safe."""

    # Reverting to UUID would be destructive once non-UUID client identifiers
    # exist. The migration deliberately leaves the runtime-safe types in place.
    pass
