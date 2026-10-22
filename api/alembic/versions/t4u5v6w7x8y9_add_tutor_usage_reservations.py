"""Add content-free idempotent usage reservations and Tutor dispatch fences."""
from alembic import op

revision = 't4u5v6w7x8y9'
down_revision = 's3t4u5v6w7x8'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('''CREATE TABLE tutor_usage_reservations (
        user_id TEXT NOT NULL,
        usage_type TEXT NOT NULL CHECK(usage_type IN ('chat','game','quiz')),
        logical_id TEXT NOT NULL CHECK(length(logical_id) BETWEEN 8 AND 200),
        usage_date DATE NOT NULL,
        charged BOOLEAN NOT NULL DEFAULT false,
        state TEXT NOT NULL CHECK(state IN
            ('reserved','running','complete','failed','cancelled','retryable','abandoned')),
        dispatch_token TEXT,
        generation_started BOOLEAN NOT NULL DEFAULT false,
        conversation_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, usage_type, logical_id)
    )''')


def downgrade():
    op.drop_table('tutor_usage_reservations')
