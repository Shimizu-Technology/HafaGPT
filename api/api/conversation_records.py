"""Serve stable, owner-scoped conversation records through a focused router."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable, Sequence
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query

from . import conversations
from .models import ConversationListResponse, ConversationResponse

logger = logging.getLogger(__name__)

Topic = dict[str, Any]
VerifyUser = Callable[[str | None], Awaitable[str]]
LoadConversation = Callable[[str, str], ConversationResponse | None]
LoadConversations = Callable[[str, int, str | None], ConversationListResponse]


def create_conversation_records_router(
    *,
    topics: Sequence[Topic],
    verify_user: VerifyUser,
    conversation_loader: LoadConversation = conversations.get_conversation,
    conversations_loader: LoadConversations = conversations.get_conversations,
) -> APIRouter:
    """Create stable record routes with injectable auth and storage."""
    router = APIRouter(prefix="/api/conversation-records", tags=["Conversation Records"])
    topic_ids = {str(topic["id"]) for topic in topics}

    @router.get("/topics/{topic_id}", response_model=ConversationListResponse)
    async def list_topic_conversations(
        topic_id: str,
        limit: int = Query(3, ge=1, le=10),
        authorization: str | None = Header(None),
    ) -> ConversationListResponse:
        user_id = await verify_user(authorization)
        if topic_id not in topic_ids:
            raise HTTPException(status_code=404, detail="Learning topic not found")
        try:
            return await asyncio.to_thread(
                conversations_loader,
                user_id,
                limit,
                topic_id,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to list conversation records for topic %s", topic_id)
            raise HTTPException(
                status_code=503,
                detail="Conversation records are temporarily unavailable",
            ) from None

    @router.get("/{conversation_id}", response_model=ConversationResponse)
    async def get_conversation_record(
        conversation_id: str,
        authorization: str | None = Header(None),
    ) -> ConversationResponse:
        user_id = await verify_user(authorization)
        try:
            conversation = await asyncio.to_thread(
                conversation_loader,
                conversation_id,
                user_id,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to load conversation record %s", conversation_id)
            raise HTTPException(
                status_code=503,
                detail="Conversation record is temporarily unavailable",
            ) from None
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    return router
