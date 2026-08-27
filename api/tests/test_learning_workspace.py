import sys
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.learning_workspace import (
    TOPIC_SCENARIO_IDS,
    TOPIC_SUGGESTED_GAME_IDS,
    TOPIC_STORY_IDS,
    DATABASE_CONNECT_TIMEOUT_SECONDS,
    DATABASE_STATEMENT_TIMEOUT_MS,
    _load_topic_progress_sync,
    build_topic_workspace,
    create_learning_workspace_router,
    empty_topic_progress,
)


TOPICS = [
    {
        "id": "greetings",
        "title": "Greetings & Basics",
        "description": "A topic",
        "icon": "wave",
        "estimated_minutes": 5,
        "flashcard_category": "greetings",
        "quiz_category": "greetings",
        "level": "beginner",
    }
]


def make_client(*, user_id: str = "user_123", fail_progress: bool = False) -> TestClient:
    async def verify_user(authorization: str | None) -> str:
        if authorization != "Bearer test-token":
            raise HTTPException(status_code=401, detail="Authentication required")
        return user_id

    async def load_progress(request_user_id: str, topic_id: str) -> dict:
        assert request_user_id == user_id
        if fail_progress:
            raise RuntimeError("database details must not leak")
        return {
            **empty_topic_progress(topic_id),
            "best_quiz_score": 80,
            "flashcards_viewed": 7,
        }

    app = FastAPI()
    app.include_router(
        create_learning_workspace_router(
            topics=TOPICS,
            verify_user=verify_user,
            progress_loader=load_progress,
        )
    )
    return TestClient(app)


def test_workspace_joins_topic_progress_and_explicit_relationships():
    response = make_client().get(
        "/api/learning/workspaces/greetings",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "topic": TOPICS[0],
        "progress": {
            "topic_id": "greetings",
            "started_at": None,
            "completed_at": None,
            "best_quiz_score": 80,
            "flashcards_viewed": 7,
            "last_activity_at": None,
        },
        "lesson_id": "greetings",
        "flashcard_category": "greetings",
        "quiz_category": "greetings",
        "suggested_game_ids": ["memory", "scramble"],
        "scenario_ids": ["meeting-someone"],
        "story_ids": ["hafa-adai-maria"],
    }


def test_workspace_authenticates_and_rejects_unknown_topics():
    client = make_client()

    assert client.get("/api/learning/workspaces/greetings").status_code == 401
    response = client.get(
        "/api/learning/workspaces/not-a-topic",
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 404


def test_workspace_hides_storage_failures():
    response = make_client(fail_progress=True).get(
        "/api/learning/workspaces/greetings",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Learning workspace is temporarily unavailable"}


def test_progress_loader_bounds_connection_wait_and_propagates_timeout(monkeypatch):
    def connect(_db_url: str, **kwargs):
        assert kwargs == {
            "connect_timeout": DATABASE_CONNECT_TIMEOUT_SECONDS,
            "options": f"-c statement_timeout={DATABASE_STATEMENT_TIMEOUT_MS}",
        }
        raise TimeoutError("connection timed out")

    monkeypatch.setenv("DATABASE_URL", "postgresql://example.invalid/hafagpt")
    monkeypatch.setitem(sys.modules, "psycopg2", SimpleNamespace(connect=connect))

    with pytest.raises(TimeoutError, match="connection timed out"):
        _load_topic_progress_sync("user_123", "greetings")


def test_progress_loader_bounds_query_wait_and_propagates_timeout(monkeypatch):
    class TimeoutCursor:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, _query: str, _params: tuple[str, str]):
            raise TimeoutError("statement timed out")

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def cursor(self):
            return TimeoutCursor()

    def connect(_db_url: str, **kwargs):
        assert kwargs["connect_timeout"] == DATABASE_CONNECT_TIMEOUT_SECONDS
        assert kwargs["options"] == f"-c statement_timeout={DATABASE_STATEMENT_TIMEOUT_MS}"
        return Connection()

    monkeypatch.setenv("DATABASE_URL", "postgresql://example.invalid/hafagpt")
    monkeypatch.setitem(sys.modules, "psycopg2", SimpleNamespace(connect=connect))

    with pytest.raises(TimeoutError, match="statement timed out"):
        _load_topic_progress_sync("user_123", "greetings")


def test_alignment_catalog_contains_only_explicit_first_party_ids():
    workspace = build_topic_workspace(TOPICS[0], empty_topic_progress("greetings"))

    assert workspace["scenario_ids"] == ["meeting-someone"]
    assert workspace["story_ids"] == ["hafa-adai-maria"]
    assert set(TOPIC_SCENARIO_IDS) == {
        "greetings", "food", "family", "directions", "shopping", "daily-life", "culture"
    }
    assert set(TOPIC_STORY_IDS) == {"greetings", "family", "household", "culture"}
    assert {scenario_id for ids in TOPIC_SCENARIO_IDS.values() for scenario_id in ids} == {
        "meeting-someone",
        "ordering-food",
        "market-shopping",
        "visiting-family",
        "asking-directions",
        "fiesta-conversation",
        "phone-call",
    }
    assert {story_id for ids in TOPIC_STORY_IDS.values() for story_id in ids} == {
        "hafa-adai-maria",
        "i-familia-hu",
        "i-gima-hu",
        "i-taotaomona",
        "i-fiesta",
        "i-latte-stones",
    }
    assert set(TOPIC_SUGGESTED_GAME_IDS) == {
        "greetings", "numbers", "colors", "family", "food", "animals", "phrases",
        "questions", "body-parts", "days", "months", "verbs", "adjectives", "sentences",
        "places", "weather", "household", "directions", "shopping", "daily-life", "culture",
    }
    assert all("lengguahita" not in story_id for ids in TOPIC_STORY_IDS.values() for story_id in ids)
