import importlib.util
from contextlib import contextmanager
from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "q1r2s3t4u5v6_link_conversations_to_learning_topics.py"
)


def load_migration():
    spec = importlib.util.spec_from_file_location("conversation_topic_migration", MIGRATION_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeContext:
    @contextmanager
    def autocommit_block(self):
        yield


class FakeOperations:
    def __init__(self, *, invalid_index=False):
        self.calls = []
        self.invalid_index = invalid_index

    def execute(self, statement):
        self.calls.append(("execute", statement))

    def create_index(self, name, table_name, columns, **kwargs):
        self.calls.append(("create_index", name, table_name, columns, kwargs))

    def drop_index(self, name, **kwargs):
        self.calls.append(("drop_index", name, kwargs))

    def drop_column(self, table_name, column_name):
        self.calls.append(("drop_column", table_name, column_name))

    def get_context(self):
        return FakeContext()

    def get_bind(self):
        invalid_index = self.invalid_index

        class Result:
            def scalar(self):
                return "idx_conversations_user_topic_updated" if invalid_index else None

        class Bind:
            def execute(self, _query, params):
                assert params == {"index_name": "idx_conversations_user_topic_updated"}
                return Result()

        return Bind()


def test_upgrade_adds_nullable_relationship_and_concurrent_preview_index():
    migration = load_migration()
    operations = FakeOperations()
    migration.op = operations

    migration.upgrade()

    add_call, index_call = operations.calls
    assert add_call == (
        "execute",
        "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "
        + "learning_topic_id VARCHAR(64)",
    )
    assert index_call[0:4] == (
        "create_index",
        migration.INDEX_NAME,
        "conversations",
        ["user_id", "learning_topic_id", "updated_at"],
    )
    assert index_call[4]["postgresql_concurrently"] is True
    assert index_call[4]["if_not_exists"] is True
    assert str(index_call[4]["postgresql_where"]) == "deleted_at IS NULL"


def test_upgrade_replaces_an_interrupted_invalid_index_before_retrying():
    migration = load_migration()
    operations = FakeOperations(invalid_index=True)
    migration.op = operations

    migration.upgrade()

    assert operations.calls[1] == (
        "drop_index",
        migration.INDEX_NAME,
        {
            "table_name": "conversations",
            "if_exists": True,
            "postgresql_concurrently": True,
        },
    )
    assert operations.calls[2][0] == "create_index"


def test_upgrade_retries_when_the_column_was_committed_before_revision_recording():
    migration = load_migration()
    operations = FakeOperations()
    migration.op = operations

    # PostgreSQL's IF NOT EXISTS is the recovery behavior for a prior attempt
    # that committed the column before its concurrent index build failed.
    migration.upgrade()

    assert "ADD COLUMN IF NOT EXISTS" in operations.calls[0][1]
    assert operations.calls[-1][0] == "create_index"


def test_downgrade_drops_index_before_relationship_column():
    migration = load_migration()
    operations = FakeOperations()
    migration.op = operations

    migration.downgrade()

    assert operations.calls == [
        (
            "drop_index",
            migration.INDEX_NAME,
            {
                "table_name": "conversations",
                "if_exists": True,
                "postgresql_concurrently": True,
            },
        ),
        ("drop_column", "conversations", "learning_topic_id"),
    ]
