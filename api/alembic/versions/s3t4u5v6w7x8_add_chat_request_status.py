"""Track content-free tutor request status across web workers."""
from alembic import op

revision = "s3t4u5v6w7x8"
down_revision = "r2s3t4u5v6w7"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE chat_requests (
            pending_id TEXT PRIMARY KEY CHECK(length(pending_id) BETWEEN 8 AND 200),
            user_id TEXT NOT NULL,
            conversation_id TEXT,
            status TEXT NOT NULL DEFAULT 'running'
                CHECK(status IN ('running','complete','failed','cancelled')),
            cancel_requested BOOLEAN NOT NULL DEFAULT false,
            -- false while only an early cancel exists; the stream sets it on start
            registered BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX idx_chat_requests_created ON chat_requests(created_at)
    """)


def downgrade():
    op.drop_table("chat_requests")
