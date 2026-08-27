from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.concept_evidence import (
    DATABASE_CONNECT_TIMEOUT_SECONDS,
    DATABASE_STATEMENT_TIMEOUT_MS,
    create_concept_evidence_router,
    default_connection_factory,
    record_lesson_exposures_sync,
)
from api.learning_concepts import curated_concept_id


class Cursor:
    def __init__(self):
        self.executions = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params):
        self.executions.append((query, params))


class Connection:
    def __init__(self):
        self.cursor_instance = Cursor()
        self.closed = False
        self.committed = False
        self.rolled_back = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *_args):
        if exc_type is None:
            self.committed = True
        else:
            self.rolled_back = True
        return False

    def cursor(self):
        return self.cursor_instance

    def close(self):
        self.closed = True


def make_client(connection: Connection, *, fail_auth: bool = False) -> TestClient:
    async def verify_user(authorization: str | None) -> str:
        if fail_auth or authorization != "Bearer test-token":
            raise HTTPException(status_code=401, detail="Authentication required")
        return "user_123"

    app = FastAPI()
    app.include_router(
        create_concept_evidence_router(
            verify_user=verify_user,
            connection_factory=lambda: connection,
        )
    )
    return TestClient(app)


def test_lesson_exposure_route_records_only_valid_exact_concepts():
    connection = Connection()
    concept_ids = [
        curated_concept_id("greetings", 0),
        curated_concept_id("greetings", 1),
        curated_concept_id("greetings", 0),
    ]

    response = make_client(connection).post(
        "/api/learning/lessons/greetings/exposures",
        headers={"Authorization": "Bearer test-token"},
        json={"concept_ids": concept_ids},
    )

    assert response.status_code == 200
    assert response.json() == {
        "topic_id": "greetings",
        "lesson_id": "v1:lesson:greetings:flashcards",
        "recorded_concepts": 2,
    }
    assert len(connection.cursor_instance.executions) == 1
    assert all(
        "ON CONFLICT (user_id, lesson_id, concept_id)" in query
        for query, _params in connection.cursor_instance.executions
    )
    params = connection.cursor_instance.executions[0][1]
    assert params == (
        "user_123",
        "greetings",
        "v1:lesson:greetings:flashcards",
        concept_ids[:2],
    )
    assert connection.committed is True
    assert connection.rolled_back is False
    assert connection.closed is True


def test_lesson_exposure_route_rejects_unknown_topics_and_cross_topic_concepts():
    family_concept = curated_concept_id("family", 0)
    connection = Connection()
    client = make_client(connection)

    unknown = client.post(
        "/api/learning/lessons/not-a-topic/exposures",
        headers={"Authorization": "Bearer test-token"},
        json={"concept_ids": [family_concept]},
    )
    mismatch = client.post(
        "/api/learning/lessons/greetings/exposures",
        headers={"Authorization": "Bearer test-token"},
        json={"concept_ids": [family_concept]},
    )

    assert unknown.status_code == 404
    assert mismatch.status_code == 400
    assert mismatch.json() == {
        "detail": "Concept does not belong to the curated category"
    }
    assert connection.cursor_instance.executions == []


def test_lesson_exposure_route_requires_auth_and_hides_storage_failures():
    class FailedConnection(Connection):
        def __enter__(self):
            raise TimeoutError("statement details must not leak")

    concept = curated_concept_id("greetings", 0)
    assert make_client(Connection(), fail_auth=True).post(
        "/api/learning/lessons/greetings/exposures",
        json={"concept_ids": [concept]},
    ).status_code == 401

    response = make_client(FailedConnection()).post(
        "/api/learning/lessons/greetings/exposures",
        headers={"Authorization": "Bearer test-token"},
        json={"concept_ids": [concept]},
    )
    assert response.status_code == 503
    assert response.json() == {
        "detail": "Lesson evidence is temporarily unavailable"
    }


def test_sync_writer_closes_the_connection_after_query_failure():
    class FailedCursor(Cursor):
        def execute(self, _query, _params):
            raise TimeoutError("statement timed out")

    connection = Connection()
    connection.cursor_instance = FailedCursor()

    try:
        record_lesson_exposures_sync(
            lambda: connection,
            user_id="user_123",
            topic_id="greetings",
            concept_ids=(curated_concept_id("greetings", 0),),
        )
    except TimeoutError:
        pass
    else:
        raise AssertionError("Expected the query timeout to propagate")

    assert connection.closed is True
    assert connection.committed is False
    assert connection.rolled_back is True


def test_default_connection_factory_retries_and_bounds_connection_and_query_waits(
    monkeypatch,
):
    captured = {}

    def connect_with_retry(**kwargs):
        captured.update(kwargs)
        return object()

    monkeypatch.setattr(
        "api.concept_evidence.get_db_connection_with_retry",
        connect_with_retry,
    )

    default_connection_factory()

    assert captured == {
        "connect_timeout": DATABASE_CONNECT_TIMEOUT_SECONDS,
        "options": f"-c statement_timeout={DATABASE_STATEMENT_TIMEOUT_MS}",
    }
