from types import SimpleNamespace

from scripts import audit_rag_sources
from scripts.audit_rag_sources import classify_source_counts, run_audit


def test_source_audit_counts_blocked_and_unregistered_chunks() -> None:
    audit = classify_source_counts(
        [
            ("https://www.guampedia.com/example", "guampedia", 55),
            ("/documents/Revised-Chamorro-Dictionary.pdf", None, 174),
            ("https://example.com/unregistered", "website", 3),
        ]
    )

    assert audit["by_source_id"]["guampedia"] == 55
    assert audit["by_source_id"]["local_revised_dictionary_snapshot"] == 174
    assert audit["blocked_chunks"] == 58
    assert audit["unregistered_chunks"] == 3


class _FakeCursor:
    def __init__(self) -> None:
        self.executions: list[tuple[str, tuple]] = []
        self.description = None
        self._result: list[tuple] = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def execute(self, query: str, params: tuple) -> None:
        self.executions.append((query, params))
        if "SELECT uuid FROM langchain_pg_collection" in query:
            self._result = [("collection-uuid",)]
        elif "COUNT(DISTINCT document)" in query:
            names = [
                "total_rows",
                "unique_documents",
                "redundant_exact_rows",
                "missing_source",
                "missing_source_type",
                "missing_title",
                "missing_author",
                "missing_date",
                "missing_license",
                "missing_retrieved_at",
            ]
            self.description = [SimpleNamespace(name=name) for name in names]
            self._result = [(3, 2, 1, 0, 0, 0, 0, 0, 0, 0)]
        elif "cmetadata->>'source'" in query:
            self._result = [("https://www.guampedia.com/example", "guampedia", 3)]
        else:
            self._result = [(2, "abc123", 80)]

    def fetchone(self):
        return self._result[0] if self._result else None

    def fetchall(self):
        return self._result


class _FakeConnection:
    def __init__(self, cursor: _FakeCursor) -> None:
        self._cursor = cursor

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def cursor(self):
        return self._cursor


def test_run_audit_scopes_every_embedding_query_to_named_collection(monkeypatch) -> None:
    cursor = _FakeCursor()
    monkeypatch.setattr(
        audit_rag_sources.psycopg,
        "connect",
        lambda _database_url: _FakeConnection(cursor),
    )

    audit = run_audit("postgresql://unused", "collection-v2")

    assert audit["collection"] == {"name": "collection-v2", "id": "collection-uuid"}
    assert audit["largest_exact_duplicate_groups"] == [
        {
            "copies": 2,
            "document_fingerprint": "abc123",
            "document_characters": 80,
        }
    ]
    assert cursor.executions[0][1] == ("collection-v2",)
    for query, params in cursor.executions[1:]:
        assert "collection_id = %s" in query
        assert params == ("collection-uuid",)
