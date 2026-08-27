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

        def execute(self, statement):
            self.statement = str(statement)
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
