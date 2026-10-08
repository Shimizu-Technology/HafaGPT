"""Add durable pronunciation candidates and publication pointers."""
from alembic import op

revision = "r2s3t4u5v6w7"
down_revision = "q1r2s3t4u5v6"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE audio_pilot_items (
            word TEXT PRIMARY KEY, english TEXT NOT NULL, created_by TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE audio_candidates (
            id UUID PRIMARY KEY, word TEXT NOT NULL,
            provider TEXT NOT NULL, model TEXT NOT NULL, voice_id TEXT,
            input_mode TEXT NOT NULL CHECK(input_mode IN ('original','ipa','respelling')),
            input_text TEXT NOT NULL, settings JSONB NOT NULL, snapshot JSONB NOT NULL,
            audio_bytes BYTEA NOT NULL CHECK(octet_length(audio_bytes) BETWEEN 1 AND 5242880),
            sha256 TEXT NOT NULL, created_by TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
            reviewer_name TEXT, reviewed_by TEXT, reviewed_at TIMESTAMPTZ,
            dialect TEXT, notes TEXT NOT NULL DEFAULT '', consent_reference TEXT,
            publication_error TEXT,
            native_review_confirmed BOOLEAN NOT NULL DEFAULT false,
            pronunciation_score INTEGER CHECK(pronunciation_score BETWEEN 1 AND 5),
            naturalness_score INTEGER CHECK(naturalness_score BETWEEN 1 AND 5),
            UNIQUE(id,word),
            CHECK(status <> 'approved' OR (native_review_confirmed AND reviewer_name IS NOT NULL AND reviewed_by IS NOT NULL AND dialect IS NOT NULL AND length(trim(reviewer_name)) > 0 AND length(trim(reviewed_by)) > 0 AND reviewed_at IS NOT NULL AND length(trim(dialect)) > 0)),
            CHECK(status <> 'approved' OR provider <> 'human_recording' OR (consent_reference IS NOT NULL AND length(trim(consent_reference)) > 0))
        );
        CREATE INDEX idx_audio_candidates_word_created ON audio_candidates(word,created_at DESC);
        CREATE TABLE audio_publications (
            word TEXT PRIMARY KEY, candidate_id UUID NOT NULL,
            published_by TEXT NOT NULL, published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            FOREIGN KEY(candidate_id,word) REFERENCES audio_candidates(id,word)
        )
    """)


def downgrade():
    op.drop_table("audio_publications")
    op.drop_table("audio_candidates")
    op.drop_table("audio_pilot_items")
