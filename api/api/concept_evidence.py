"""Focused routes for privacy-minimized, exact lesson concept evidence."""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .database_connections import get_db_connection_with_retry
from .learning_concepts import (
    LEARNING_TOPIC_CATEGORIES,
    validate_curated_concept_ids,
)


logger = logging.getLogger(__name__)

DATABASE_CONNECT_TIMEOUT_SECONDS = 5
DATABASE_STATEMENT_TIMEOUT_MS = 5000


class LessonExposureCreate(BaseModel):
    """Exact curated concepts viewed before a lesson advances."""

    concept_ids: list[str] = Field(min_length=1, max_length=50)

    model_config = {"extra": "forbid"}


class LessonExposureResponse(BaseModel):
    topic_id: str
    lesson_id: str
    recorded_concepts: int


def lesson_cards_id(topic_id: str) -> str:
    return f"v1:lesson:{topic_id}:flashcards"


def default_connection_factory():
    return get_db_connection_with_retry(
        connect_timeout=DATABASE_CONNECT_TIMEOUT_SECONDS,
        options=f"-c statement_timeout={DATABASE_STATEMENT_TIMEOUT_MS}",
    )


def record_lesson_exposures_sync(
    connection_factory: Callable[[], Any],
    *,
    user_id: str,
    topic_id: str,
    concept_ids: tuple[str, ...],
) -> int:
    """Upsert one row per exact concept; retries cannot duplicate evidence."""

    if not concept_ids:
        return 0
    lesson_id = lesson_cards_id(topic_id)
    connection = connection_factory()
    try:
        with connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO lesson_concept_exposures (
                        user_id, topic_id, lesson_id, concept_id,
                        last_exposed_at
                    )
                    SELECT %s, %s, %s, concept_id, now()
                    FROM unnest(%s::text[]) AS concepts(concept_id)
                    ON CONFLICT (user_id, lesson_id, concept_id)
                    DO UPDATE SET last_exposed_at = EXCLUDED.last_exposed_at
                    """,
                    (user_id, topic_id, lesson_id, list(concept_ids)),
                )
    finally:
        connection.close()
    return len(concept_ids)


def create_concept_evidence_router(
    *,
    verify_user: Callable[[str | None], Awaitable[str]],
    connection_factory: Callable[[], Any] = default_connection_factory,
) -> APIRouter:
    router = APIRouter(prefix="/api/learning", tags=["Learning Evidence"])

    @router.post(
        "/lessons/{topic_id}/exposures",
        response_model=LessonExposureResponse,
    )
    async def record_lesson_exposures(
        topic_id: str,
        request: LessonExposureCreate,
        authorization: str | None = Header(None),
    ) -> LessonExposureResponse:
        user_id = await verify_user(authorization)
        category_id = LEARNING_TOPIC_CATEGORIES.get(topic_id)
        if category_id is None:
            raise HTTPException(status_code=404, detail="Learning topic not found")

        try:
            concept_ids = validate_curated_concept_ids(
                category_id,
                request.concept_ids,
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

        try:
            recorded = await asyncio.to_thread(
                record_lesson_exposures_sync,
                connection_factory,
                user_id=user_id,
                topic_id=topic_id,
                concept_ids=concept_ids,
            )
        except Exception:
            logger.exception("Failed to record lesson concept exposure")
            raise HTTPException(
                status_code=503,
                detail="Lesson evidence is temporarily unavailable",
            ) from None

        return LessonExposureResponse(
            topic_id=topic_id,
            lesson_id=lesson_cards_id(topic_id),
            recorded_concepts=recorded,
        )

    return router
