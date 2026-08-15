from scripts.reconcile_local_migrations import is_local_database_url, schema_gaps


class FakeInspector:
    def __init__(self, tables: dict[str, set[str]]) -> None:
        self.tables = tables

    def has_table(self, table: str) -> bool:
        return table in self.tables

    def get_columns(self, table: str) -> list[dict[str, str]]:
        return [{"name": column} for column in self.tables[table]]


def test_database_reconciliation_refuses_remote_hosts() -> None:
    assert is_local_database_url("postgresql://localhost/hafagpt")
    assert is_local_database_url("postgresql+psycopg://127.0.0.1/hafagpt")
    assert not is_local_database_url("postgresql://db.example.com/hafagpt")


def test_schema_gaps_are_explicit() -> None:
    inspector = FakeInspector({"conversation_logs": {"role"}})

    gaps = schema_gaps(inspector)

    assert "missing table: flashcard_decks" in gaps
    assert "missing table: quiz_results" in gaps
    assert "missing column: conversation_logs.role" not in gaps
