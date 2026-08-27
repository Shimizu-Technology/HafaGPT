from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.conversation_records import create_conversation_records_router
from api.models import ConversationListResponse, ConversationResponse


TOPICS = [{"id": "greetings"}, {"id": "family"}]
NOW = datetime(2026, 8, 28, tzinfo=timezone.utc)


def conversation(conversation_id: str, topic_id: str = "greetings") -> ConversationResponse:
    return ConversationResponse(
        id=conversation_id,
        user_id="user-1",
        title="Practice greetings",
        created_at=NOW,
        updated_at=NOW,
        learning_topic_id=topic_id,
    )


def make_client(*, missing: bool = False, fail: bool = False):
    calls = []

    async def verify_user(authorization: str | None) -> str:
        if authorization != "Bearer test-token":
            raise HTTPException(status_code=401, detail="Authentication required")
        return "user-1"

    def load_conversation(conversation_id: str, user_id: str):
        calls.append(("exact", conversation_id, user_id))
        if fail:
            raise RuntimeError("database details must not leak")
        return None if missing else conversation(conversation_id)

    def load_conversations(user_id: str, limit: int, topic_id: str | None):
        calls.append(("topic", user_id, limit, topic_id))
        if fail:
            raise RuntimeError("database details must not leak")
        return ConversationListResponse(conversations=[conversation("conv-1")])

    app = FastAPI()
    app.include_router(
        create_conversation_records_router(
            topics=TOPICS,
            verify_user=verify_user,
            conversation_loader=load_conversation,
            conversations_loader=load_conversations,
        )
    )
    return TestClient(app), calls


def test_exact_record_requires_auth_and_uses_owner_scoped_storage():
    client, calls = make_client()

    assert client.get("/api/conversation-records/conv-1").status_code == 401
    response = client.get(
        "/api/conversation-records/conv-1",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json()["learning_topic_id"] == "greetings"
    assert calls == [("exact", "conv-1", "user-1")]


def test_exact_record_returns_generic_not_found_for_missing_or_unowned_record():
    client, _calls = make_client(missing=True)

    response = client.get(
        "/api/conversation-records/private",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Conversation not found"}


def test_topic_preview_validates_topic_and_enforces_limit():
    client, calls = make_client()

    response = client.get(
        "/api/conversation-records/topics/greetings?limit=3",
        headers={"Authorization": "Bearer test-token"},
    )
    unknown = client.get(
        "/api/conversation-records/topics/not-a-topic",
        headers={"Authorization": "Bearer test-token"},
    )
    too_large = client.get(
        "/api/conversation-records/topics/greetings?limit=11",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert calls == [("topic", "user-1", 3, "greetings")]
    assert unknown.status_code == 404
    assert too_large.status_code == 422


def test_record_router_hides_storage_failures():
    client, _calls = make_client(fail=True)

    response = client.get(
        "/api/conversation-records/conv-1",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Conversation record is temporarily unavailable"}
