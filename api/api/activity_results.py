"""Serve owner-scoped activity records and bounded topic result previews."""

from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import Awaitable, Callable, Sequence
from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

VerifyUser = Callable[[str | None], Awaitable[str]]

DATABASE_CONNECT_TIMEOUT_SECONDS = 5
DATABASE_STATEMENT_TIMEOUT_MS = 5_000
TOPIC_CONCEPT_PREFIX = "v1:topic:"


class GameResultRecord(BaseModel):
    """One saved game round plus its validated learning relationships."""

    id: str
    game_type: str
    mode: str | None
    category_id: str
    category_title: str | None
    difficulty: str | None
    score: int
    moves: int | None
    pairs: int | None
    time_seconds: int | None
    stars: int | None
    created_at: datetime
    learning_topic_id: str | None
    learning_source: str | None
    evidence_scope: Literal["legacy", "topic", "concept"]
    concept_ids: list[str]


class ActivityResultPreview(BaseModel):
    """Privacy-minimized quiz or game result metadata for a topic workspace."""

    id: str
    result_type: Literal["quiz", "game"]
    title: str
    created_at: datetime
    score: int
    total: int | None
    percentage: float | None
    stars: int | None


LoadGameResult = Callable[[str, str], GameResultRecord | None]
LoadTopicResults = Callable[[str, str, int], list[ActivityResultPreview]]


def _database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    return database_url


def _load_game_result_sync(
    user_id: str,
    result_id: str,
    *,
    topic_ids: frozenset[str],
) -> GameResultRecord | None:
    import psycopg2

    with (
        psycopg2.connect(
            _database_url(),
            connect_timeout=DATABASE_CONNECT_TIMEOUT_SECONDS,
            options=f"-c statement_timeout={DATABASE_STATEMENT_TIMEOUT_MS}",
        ) as connection,
        connection.cursor() as cursor,
    ):
        cursor.execute(
            """
            SELECT id, game_type, mode, category_id, category_title,
                   difficulty, score, moves, pairs, time_seconds, stars,
                   created_at
            FROM game_results
            WHERE id = %s AND user_id = %s
            """,
            (result_id, user_id),
        )
        result = cursor.fetchone()
        if result is None:
            return None

        cursor.execute(
            """
            SELECT concept_id, source, evidence_scope
            FROM learning_attempts
            WHERE game_result_id = %s AND user_id = %s
            ORDER BY evidence_scope ASC, concept_id ASC
            """,
            (result_id, user_id),
        )
        evidence = cursor.fetchall()

    topic_id = None
    learning_source = None
    concept_ids: list[str] = []
    for concept_id, source, evidence_scope in evidence:
        learning_source = learning_source or source
        if evidence_scope == "topic" and concept_id.startswith(TOPIC_CONCEPT_PREFIX):
            candidate = concept_id.removeprefix(TOPIC_CONCEPT_PREFIX)
            if candidate in topic_ids:
                topic_id = candidate
        elif evidence_scope == "concept":
            concept_ids.append(concept_id)

    scope: Literal["legacy", "topic", "concept"]
    if concept_ids:
        scope = "concept"
    elif topic_id:
        scope = "topic"
    else:
        scope = "legacy"

    return GameResultRecord(
        id=str(result[0]),
        game_type=result[1],
        mode=result[2],
        category_id=result[3],
        category_title=result[4],
        difficulty=result[5],
        score=result[6],
        moves=result[7],
        pairs=result[8],
        time_seconds=result[9],
        stars=result[10],
        created_at=result[11],
        learning_topic_id=topic_id,
        learning_source=learning_source,
        evidence_scope=scope,
        concept_ids=concept_ids,
    )


def _load_topic_results_sync(
    user_id: str,
    topic_id: str,
    limit: int,
) -> list[ActivityResultPreview]:
    import psycopg2

    with (
        psycopg2.connect(
            _database_url(),
            connect_timeout=DATABASE_CONNECT_TIMEOUT_SECONDS,
            options=f"-c statement_timeout={DATABASE_STATEMENT_TIMEOUT_MS}",
        ) as connection,
        connection.cursor() as cursor,
    ):
        cursor.execute(
            """
            SELECT result_id, result_type, title, created_at, score,
                   total, percentage, stars
            FROM (
                SELECT qr.id AS result_id, 'quiz' AS result_type,
                       COALESCE(qr.category_title, 'Quiz') AS title,
                       qr.created_at, qr.score, qr.total, qr.percentage,
                       NULL::integer AS stars
                FROM quiz_results AS qr
                WHERE qr.user_id = %s AND qr.learning_topic_id = %s

                UNION ALL

                SELECT gr.id AS result_id, 'game' AS result_type,
                       COALESCE(gr.category_title, 'Game') AS title,
                       gr.created_at, gr.score, NULL::integer AS total,
                       NULL::double precision AS percentage, gr.stars
                FROM game_results AS gr
                JOIN learning_attempts AS attempt
                  ON attempt.game_result_id = gr.id
                 AND attempt.user_id = gr.user_id
                 AND attempt.evidence_scope = 'topic'
                WHERE gr.user_id = %s AND attempt.concept_id = %s
            ) AS topic_results
            ORDER BY created_at DESC, result_id DESC
            LIMIT %s
            """,
            (
                user_id,
                topic_id,
                user_id,
                f"{TOPIC_CONCEPT_PREFIX}{topic_id}",
                limit,
            ),
        )
        rows = cursor.fetchall()

    return [
        ActivityResultPreview(
            id=str(row[0]),
            result_type=row[1],
            title=row[2],
            created_at=row[3],
            score=row[4],
            total=row[5],
            percentage=float(row[6]) if row[6] is not None else None,
            stars=row[7],
        )
        for row in rows
    ]


def create_activity_results_router(
    *,
    topics: Sequence[dict[str, Any]],
    verify_user: VerifyUser,
    game_result_loader: LoadGameResult | None = None,
    topic_results_loader: LoadTopicResults = _load_topic_results_sync,
) -> APIRouter:
    """Create stable result routes with injectable authentication and storage."""
    router = APIRouter(prefix="/api/activity-results", tags=["Activity Results"])
    topic_ids = frozenset(str(topic["id"]) for topic in topics)
    load_game_result = game_result_loader or (
        lambda user_id, result_id: _load_game_result_sync(
            user_id,
            result_id,
            topic_ids=topic_ids,
        )
    )

    @router.get("/games/{result_id}", response_model=GameResultRecord)
    async def get_game_result(
        result_id: str,
        authorization: str | None = Header(None),
    ) -> GameResultRecord:
        user_id = await verify_user(authorization)
        try:
            normalized_result_id = str(UUID(result_id))
        except ValueError:
            raise HTTPException(status_code=404, detail="Game result not found") from None

        try:
            result = await asyncio.to_thread(
                load_game_result,
                user_id,
                normalized_result_id,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to load game result record %s", normalized_result_id)
            raise HTTPException(
                status_code=503,
                detail="Game result is temporarily unavailable",
            ) from None
        if result is None:
            raise HTTPException(status_code=404, detail="Game result not found")
        return result

    @router.get(
        "/topics/{topic_id}",
        response_model=list[ActivityResultPreview],
    )
    async def list_topic_results(
        topic_id: str,
        limit: int = Query(3, ge=1, le=10),
        authorization: str | None = Header(None),
    ) -> list[ActivityResultPreview]:
        user_id = await verify_user(authorization)
        if topic_id not in topic_ids:
            raise HTTPException(status_code=404, detail="Learning topic not found")
        try:
            return await asyncio.to_thread(
                topic_results_loader,
                user_id,
                topic_id,
                limit,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to list activity results for topic %s", topic_id)
            raise HTTPException(
                status_code=503,
                detail="Activity results are temporarily unavailable",
            ) from None

    return router
