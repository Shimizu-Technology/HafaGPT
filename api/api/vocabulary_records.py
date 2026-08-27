"""Focused routes for stable, learner-facing vocabulary records."""

import logging
from collections.abc import Callable

from fastapi import APIRouter, HTTPException

from .dictionary_service import DictionaryService, get_dictionary_service


logger = logging.getLogger(__name__)


def create_vocabulary_records_router(
    *,
    service_factory: Callable[[], DictionaryService] = get_dictionary_service,
) -> APIRouter:
    """Create exact dictionary-record routes with an injectable data service."""

    router = APIRouter(prefix="/api/vocabulary", tags=["Vocabulary"])

    @router.get("/words/{word_id}")
    async def get_vocabulary_word_by_id(word_id: str):
        """Get one exact dictionary record by its stable, versioned identity."""

        try:
            result = service_factory().get_word_by_id(word_id)
            if not result:
                raise HTTPException(status_code=404, detail="Dictionary word not found")
            return result
        except HTTPException:
            raise
        except Exception as error:
            logger.error("Stable word lookup failed: %s", error)
            raise HTTPException(
                status_code=500,
                detail="Dictionary lookup failed",
            ) from None

    return router
