from types import SimpleNamespace

import pytest

from scripts import audit_rag_sources
from scripts.audit_rag_sources import (
    classify_source_counts,
    operational_cutover_readiness,
    run_audit,
)
from src.rag.embedding_contract import (
    CONTRACT_METADATA_KEY,
    OPENAI_EMBEDDING_CONTRACT,
)


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


def test_operational_cutover_is_independent_from_incomplete_provenance() -> None:
    audit = {
        "collection": {
            "name": "hafagpt_governed_openai_v3",
            "embedding_dimensions": 384,
            "metadata": {
                CONTRACT_METADATA_KEY: OPENAI_EMBEDDING_CONTRACT,
                "hafagpt_collection_status": "ready",
                "document_count": 100,
            },
        },
        "summary": {
            "total_rows": 100,
            "redundant_exact_rows": 0,
            "missing_source": 0,
            "missing_license": 100,
            "missing_retrieved_at": 100,
        },
        "policy": {"blocked_chunks": 0, "unregistered_chunks": 0},
    }

    readiness = operational_cutover_readiness(audit)

    assert readiness["ready"] is True
    assert readiness["source_permission_and_provenance_complete"] is False


@pytest.mark.parametrize(("ready", "expected_status"), [(False, 1), (True, 0)])
def test_operational_cutover_cli_maps_readiness_to_exit_status(
    monkeypatch,
    ready: bool,
    expected_status: int,
) -> None:
    monkeypatch.setattr(
        audit_rag_sources,
        "run_audit",
        lambda _database_url, _collection_name: {
            "operational_cutover": {"ready": ready}
        },
    )
    monkeypatch.setattr(
        audit_rag_sources.sys,
        "argv",
        [
            "audit_rag_sources.py",
            "--database-url",
            "postgresql://unused",
            "--enforce-operational-cutover-gates",
        ],
    )

    assert audit_rag_sources.main() == expected_status


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
        if "SELECT uuid, cmetadata FROM langchain_pg_collection" in query:
            self._result = [("collection-uuid", {})]
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
        elif "AS artifact_version" in query:
            self._result = [
                (
                    "https://www.guampedia.com/example",
                    "guampedia",
                    "2026-08-01",
                    "a" * 64,
                    3,
                )
            ]
        elif "cmetadata->>'source'" in query:
            self._result = [("https://www.guampedia.com/example", "guampedia", 3)]
        elif "vector_dims(embedding)" in query:
            self._result = [(384,)]
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

    assert audit["collection"] == {
        "name": "collection-v2",
        "id": "collection-uuid",
        "metadata": {},
        "embedding_dimensions": 384,
    }
    assert audit["operational_cutover"]["ready"] is False
    assert audit["largest_exact_duplicate_groups"] == [
        {
            "copies": 2,
            "document_fingerprint": "abc123",
            "document_characters": 80,
        }
    ]
    assert audit["policy"]["artifacts"] == [
        {
            "source_id": "guampedia",
            "artifact_version": "2026-08-01",
            "artifact_sha256": "a" * 64,
            "provenance_complete": True,
            "chunks": 3,
        }
    ]
    assert cursor.executions[0][1] == ("collection-v2",)
    for query, params in cursor.executions[1:]:
        assert "collection_id = %s" in query
        assert params == ("collection-uuid",)
