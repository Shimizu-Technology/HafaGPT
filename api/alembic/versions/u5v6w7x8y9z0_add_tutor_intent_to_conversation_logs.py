"""Record the tutor task selected for each user turn.

Revision ID: u5v6w7x8y9z0
Revises: t4u5v6w7x8y9

The task picker can change mid-conversation, so translation routing needs the
task that was selected when each earlier turn was sent. NULL means no task was
recorded (no task selected, or a row written before this column existed); the
router then reads that turn by its own text only. No backfill is possible or
needed.
"""
from alembic import op
import sqlalchemy as sa

revision = 'u5v6w7x8y9z0'
down_revision = 't4u5v6w7x8y9'
branch_labels = None
depends_on = None


def upgrade():
    # Adding a nullable column needs only a brief ACCESS EXCLUSIVE lock, but it
    # must not queue behind a long transaction and block every later read.
    # Fail fast instead; the deploy can be retried.
    op.execute("SET LOCAL lock_timeout = '5s'")
    op.add_column('conversation_logs', sa.Column('tutor_intent', sa.String(length=16), nullable=True))


def downgrade():
    op.drop_column('conversation_logs', 'tutor_intent')
