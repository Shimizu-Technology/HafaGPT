from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.activity_results import (
    ActivityResultPreview,
    GameResultRecord,
    create_activity_results_router,
)


RESULT_ID = "018f6a6e-9c3d-7b2a-a1c4-8e9f12345678"
NOW = datetime(2026, 8, 28, tzinfo=timezone.utc)
TOPICS = [{"id": "greetings"}, {"id": "family"}]


def game_result() -> GameResultRecord:
    return GameResultRecord(
        id=RESULT_ID,
        game_type="memory_match",
        mode="beginner",
        category_id="greetings",
        category_title="Greetings & Basics",
        difficulty="easy",
        score=375,
        moves=8,
        pairs=6,
        time_seconds=42,
        stars=3,
        created_at=NOW,
        learning_topic_id="greetings",
        learning_source="topic",
        evidence_scope="concept",
        concept_ids=["v1:card:one"],
    )


def make_client(*, missing: bool = False, fail: bool = False):
    calls = []

    async def verify_user(authorization: str | None) -> str:
        if authorization != "Bearer test-token":
            raise HTTPException(status_code=401, detail="Authentication required")
        return "user-1"

    def load_game_result(user_id: str, result_id: str):
        calls.append(("game", user_id, result_id))
        if fail:
            raise RuntimeError("private database details")
        return None if missing else game_result()

    def load_topic_results(user_id: str, topic_id: str, limit: int):
        calls.append(("topic", user_id, topic_id, limit))
        if fail:
            raise RuntimeError("private database details")
        return [
            ActivityResultPreview(
                id=RESULT_ID,
                result_type="game",
                title="Greetings & Basics",
                created_at=NOW,
                score=375,
                total=None,
                percentage=None,
                stars=3,
            )
        ]

    app = FastAPI()
    app.include_router(
        create_activity_results_router(
            topics=TOPICS,
            verify_user=verify_user,
            game_result_loader=load_game_result,
            topic_results_loader=load_topic_results,
        )
    )
    return TestClient(app), calls


def test_exact_game_record_requires_auth_and_owner_scoped_lookup():
    client, calls = make_client()

    assert client.get(f"/api/activity-results/games/{RESULT_ID}").status_code == 401
    response = client.get(
        f"/api/activity-results/games/{RESULT_ID}",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json()["learning_topic_id"] == "greetings"
    assert response.json()["concept_ids"] == ["v1:card:one"]
    assert calls == [("game", "user-1", RESULT_ID)]


def test_exact_game_record_hides_invalid_missing_and_unowned_ids():
    client, calls = make_client(missing=True)

    invalid = client.get(
        "/api/activity-results/games/not-a-uuid",
        headers={"Authorization": "Bearer test-token"},
    )
    missing = client.get(
        f"/api/activity-results/games/{RESULT_ID}",
        headers={"Authorization": "Bearer test-token"},
    )

    assert invalid.status_code == 404
    assert missing.status_code == 404
    assert calls == [("game", "user-1", RESULT_ID)]


def test_topic_results_validate_topic_and_bound_metadata_preview():
    client, calls = make_client()

    response = client.get(
        "/api/activity-results/topics/greetings?limit=3",
        headers={"Authorization": "Bearer test-token"},
    )
    unknown = client.get(
        "/api/activity-results/topics/unknown",
        headers={"Authorization": "Bearer test-token"},
    )
    too_large = client.get(
        "/api/activity-results/topics/greetings?limit=11",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json()[0]["result_type"] == "game"
    assert calls == [("topic", "user-1", "greetings", 3)]
    assert unknown.status_code == 404
    assert too_large.status_code == 422


def test_result_router_hides_storage_failures():
    client, _calls = make_client(fail=True)

    response = client.get(
        f"/api/activity-results/games/{RESULT_ID}",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Game result is temporarily unavailable"}
