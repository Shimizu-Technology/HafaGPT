import importlib.util
from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "p0q1r2s3t4u5_build_evidence_indexes_concurrently.py"
)


def load_migration_module():
    spec = importlib.util.spec_from_file_location("evidence_index_migration", MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_invalid_concurrent_indexes_are_dropped_before_retry():
    class ScalarRows:
        def scalars(self):
            return iter(
                (
                    "idx_quiz_answers_concept_id",
                    "idx_quiz_results_user_learning_topic_created",
                )
            )

    class Bind:
        def __init__(self):
            self.statement = None
            self.params = None

        def execute(self, statement, params):
            self.statement = str(statement)
            self.params = params
            return ScalarRows()

    class Operations:
        def __init__(self):
            self.bind = Bind()
            self.drops = []

        def get_bind(self):
            return self.bind

        def drop_index(self, name, **kwargs):
            self.drops.append((name, kwargs))

    migration = load_migration_module()
    operations = Operations()
    migration.op = operations

    migration._drop_invalid_evidence_indexes()

    assert "pg_index" in operations.bind.statement
    assert "indisvalid = false" in operations.bind.statement
    assert operations.bind.params == {
        "index_names": tuple(index[0] for index in migration.EVIDENCE_INDEXES),
    }
    assert operations.drops == [
        (
            "idx_quiz_results_user_learning_topic_created",
            {
                "table_name": "quiz_results",
                "if_exists": True,
                "postgresql_concurrently": True,
            },
        ),
        (
            "idx_quiz_answers_concept_id",
            {
                "table_name": "quiz_answers",
                "if_exists": True,
                "postgresql_concurrently": True,
            },
        ),
    ]


def test_large_table_uniqueness_is_built_concurrently_then_attached():
    migration = load_migration_module()
    specs = {index[0]: index for index in migration.EVIDENCE_INDEXES}

    assert specs["uq_quiz_results_user_client_attempt"] == (
        "uq_quiz_results_user_client_attempt",
        "quiz_results",
        ("user_id", "client_attempt_id"),
        True,
    )
    assert specs["uq_game_results_user_client_attempt"] == (
        "uq_game_results_user_client_attempt",
        "game_results",
        ("user_id", "client_attempt_id"),
        True,
    )

    source_migration = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "o9p0q1r2s3t4_add_exact_concept_evidence.py"
    ).read_text(encoding="utf-8")
    assert 'op.create_unique_constraint(\n        "uq_quiz_results_user_client_attempt"' not in source_migration
    assert 'op.create_unique_constraint(\n        "uq_game_results_user_client_attempt"' not in source_migration


def test_upgrade_builds_unique_indexes_in_autocommit_before_attachment():
    class ScalarRows:
        def scalars(self):
            return iter(())

    class Bind:
        def execute(self, _statement, _params):
            return ScalarRows()

    class AutocommitBlock:
        def __init__(self, operations):
            self.operations = operations

        def __enter__(self):
            self.operations.in_autocommit = True

        def __exit__(self, *_args):
            self.operations.in_autocommit = False

    class Operations:
        def __init__(self):
            self.bind = Bind()
            self.in_autocommit = False
            self.created = []
            self.attachments = []

        def get_bind(self):
            return self.bind

        def get_context(self):
            return self

        def autocommit_block(self):
            return AutocommitBlock(self)

        def create_index(self, name, table_name, columns, **kwargs):
            self.created.append(
                (name, table_name, tuple(columns), kwargs, self.in_autocommit)
            )

        def execute(self, statement):
            self.attachments.append(str(statement))

    migration = load_migration_module()
    operations = Operations()
    migration.op = operations

    migration.upgrade()

    unique_creates = [created for created in operations.created if created[3]["unique"]]
    assert [created[0] for created in unique_creates] == [
        "uq_quiz_results_user_client_attempt",
        "uq_game_results_user_client_attempt",
    ]
    assert all(created[3]["postgresql_concurrently"] for created in unique_creates)
    assert all(created[4] for created in unique_creates)
    assert operations.attachments == [
        'ALTER TABLE "quiz_results" ADD CONSTRAINT '
        '"uq_quiz_results_user_client_attempt" UNIQUE USING INDEX '
        '"uq_quiz_results_user_client_attempt"',
        'ALTER TABLE "game_results" ADD CONSTRAINT '
        '"uq_game_results_user_client_attempt" UNIQUE USING INDEX '
        '"uq_game_results_user_client_attempt"',
    ]


def test_downgrade_removes_constraints_before_concurrent_indexes():
    class AutocommitBlock:
        def __init__(self, operations):
            self.operations = operations

        def __enter__(self):
            self.operations.events.append(("autocommit_enter",))
            self.operations.in_autocommit = True

        def __exit__(self, *_args):
            self.operations.in_autocommit = False
            self.operations.events.append(("autocommit_exit",))

    class Operations:
        def __init__(self):
            self.events = []
            self.in_autocommit = False

        def get_context(self):
            return self

        def autocommit_block(self):
            return AutocommitBlock(self)

        def execute(self, statement):
            self.events.append(("execute", str(statement), self.in_autocommit))

        def drop_index(self, name, **kwargs):
            self.events.append(("drop_index", name, kwargs, self.in_autocommit))

    migration = load_migration_module()
    operations = Operations()
    migration.op = operations

    migration.downgrade()

    assert operations.events[:3] == [
        (
            "execute",
            "ALTER TABLE game_results DROP CONSTRAINT IF EXISTS "
            "uq_game_results_user_client_attempt",
            False,
        ),
        (
            "execute",
            "ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS "
            "uq_quiz_results_user_client_attempt",
            False,
        ),
        ("autocommit_enter",),
    ]
    drops = [event for event in operations.events if event[0] == "drop_index"]
    assert [event[1] for event in drops] == [
        index[0] for index in reversed(migration.EVIDENCE_INDEXES)
    ]
    assert all(event[2]["if_exists"] for event in drops)
    assert all(event[2]["postgresql_concurrently"] for event in drops)
    assert all(event[3] for event in drops)
    assert operations.events[-1] == ("autocommit_exit",)
