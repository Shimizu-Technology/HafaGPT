"""Compose stable topic workspaces without extending the API monolith."""

from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import Awaitable, Callable, Mapping, Sequence
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

Topic = Mapping[str, Any]
Progress = dict[str, Any]
VerifyUser = Callable[[str | None], Awaitable[str]]
LoadProgress = Callable[[str, str], Awaitable[Progress]]


class TopicRecord(BaseModel):
    """Stable public metadata for one learning-path topic."""

    id: str
    title: str
    description: str
    icon: str
    estimated_minutes: int
    flashcard_category: str
    quiz_category: str
    level: str


class TopicProgressRecord(BaseModel):
    """Persisted learner evidence summarized at the topic level."""

    topic_id: str
    started_at: str | None
    completed_at: str | None
    best_quiz_score: int | None
    flashcards_viewed: int
    last_activity_at: str | None


class TopicWorkspaceResponse(BaseModel):
    """Joined topic workspace returned to the learner application."""

    topic: TopicRecord
    progress: TopicProgressRecord
    lesson_id: str
    flashcard_category: str
    quiz_category: str
    suggested_game_ids: list[str]
    scenario_ids: list[str]
    story_ids: list[str]


TOPIC_SCENARIO_IDS: dict[str, tuple[str, ...]] = {
    "greetings": ("meeting-someone",),
    "food": ("ordering-food",),
    "family": ("visiting-family",),
    "directions": ("asking-directions",),
    "shopping": ("market-shopping",),
    "daily-life": ("phone-call",),
    "culture": ("fiesta-conversation",),
}

TOPIC_STORY_IDS: dict[str, tuple[str, ...]] = {
    "greetings": ("hafa-adai-maria",),
    "family": ("i-familia-hu",),
    "household": ("i-gima-hu",),
    "culture": ("i-taotaomona", "i-fiesta", "i-latte-stones"),
}

TOPIC_SUGGESTED_GAME_IDS: dict[str, tuple[str, ...]] = {
    "greetings": ("memory", "scramble"),
    "numbers": ("memory", "falling"),
    "colors": ("memory", "sound-match"),
    "family": ("memory", "scramble"),
    "food": ("memory", "sound-match"),
    "animals": ("memory", "sound-match"),
    "phrases": ("scramble", "hangman"),
    "questions": ("scramble", "hangman"),
    "body-parts": ("memory", "sound-match"),
    "days": ("memory", "falling"),
    "months": ("memory", "scramble"),
    "verbs": ("scramble", "falling"),
    "adjectives": ("memory", "hangman"),
    "sentences": ("scramble", "hangman"),
    "places": ("memory", "scramble"),
    "weather": ("memory", "falling"),
    "household": ("memory", "scramble"),
    "directions": ("scramble", "falling"),
    "shopping": ("scramble", "wordle"),
    "daily-life": ("scramble", "memory"),
    "culture": ("memory", "wordle"),
}


def empty_topic_progress(topic_id: str) -> Progress:
    """Return the stable progress shape for a topic with no learner activity."""
    return {
        "topic_id": topic_id,
        "started_at": None,
        "completed_at": None,
        "best_quiz_score": None,
        "flashcards_viewed": 0,
        "last_activity_at": None,
    }


def _load_topic_progress_sync(user_id: str, topic_id: str) -> Progress:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL is not configured")

    import psycopg2

    with psycopg2.connect(db_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT topic_id, started_at, completed_at, best_quiz_score,
                       flashcards_viewed, last_activity_at
                FROM user_topic_progress
                WHERE user_id = %s AND topic_id = %s
                """,
                (user_id, topic_id),
            )
            row = cursor.fetchone()

    if not row:
        return empty_topic_progress(topic_id)

    return {
        "topic_id": row[0],
        "started_at": row[1].isoformat() if row[1] else None,
        "completed_at": row[2].isoformat() if row[2] else None,
        "best_quiz_score": row[3],
        "flashcards_viewed": row[4] or 0,
        "last_activity_at": row[5].isoformat() if row[5] else None,
    }


async def load_topic_progress(user_id: str, topic_id: str) -> Progress:
    """Load one learner's topic progress without blocking the event loop."""
    return await asyncio.to_thread(_load_topic_progress_sync, user_id, topic_id)


def build_topic_workspace(topic: Topic, progress: Progress) -> dict[str, Any]:
    """Join a topic with its explicit learning relationships and progress."""
    topic_id = str(topic["id"])
    return {
        "topic": dict(topic),
        "progress": progress,
        "lesson_id": topic_id,
        "flashcard_category": topic["flashcard_category"],
        "quiz_category": topic["quiz_category"],
        "suggested_game_ids": list(TOPIC_SUGGESTED_GAME_IDS.get(topic_id, ())),
        "scenario_ids": list(TOPIC_SCENARIO_IDS.get(topic_id, ())),
        "story_ids": list(TOPIC_STORY_IDS.get(topic_id, ())),
    }


def create_learning_workspace_router(
    *,
    topics: Sequence[Topic],
    verify_user: VerifyUser,
    progress_loader: LoadProgress = load_topic_progress,
) -> APIRouter:
    """Create the learning-workspace router with injectable auth and storage."""
    router = APIRouter(prefix="/api/learning/workspaces", tags=["Learning Workspace"])
    topic_by_id = {str(topic["id"]): topic for topic in topics}

    @router.get("/{topic_id}", response_model=TopicWorkspaceResponse)
    async def get_topic_workspace(
        topic_id: str,
        authorization: str | None = Header(None),
    ) -> dict[str, Any]:
        user_id = await verify_user(authorization)
        topic = topic_by_id.get(topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found")

        try:
            progress = await progress_loader(user_id, topic_id)
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to load learning workspace for topic %s", topic_id)
            raise HTTPException(
                status_code=503,
                detail="Learning workspace is temporarily unavailable",
            ) from None

        return build_topic_workspace(topic, progress)

    return router
