"""
Pydantic models for Chamorro Chatbot API

Request and response models for the FastAPI endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description="The user's message", min_length=1)
    mode: str = Field(
        default="english",
        description="Chat mode: 'english', 'chamorro', or 'learn'"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Optional session ID for conversation continuity"
    )
    user_id: Optional[str] = Field(
        default=None,
        description="Optional user ID from Clerk authentication"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "message": "How do I say good morning?",
                    "mode": "english",
                    "user_id": "user_2abc123def"
                },
                {
                    "message": "Håfa adai?",
                    "mode": "chamorro"
                }
            ]
        }
    }


class SourceInfo(BaseModel):
    """Information about a source used in the response"""
    name: str = Field(..., description="Name of the source")
    page: Optional[int] = Field(None, description="Page number if applicable")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str = Field(..., description="The chatbot's response")
    mode: str = Field(..., description="Current chat mode")
    sources: list[SourceInfo] = Field(
        default=[],
        description="Sources used to generate the response"
    )
    used_rag: bool = Field(
        default=False,
        description="Whether RAG context was used"
    )
    used_web_search: bool = Field(
        default=False,
        description="Whether web search was used"
    )
    response_time: Optional[float] = Field(
        None,
        description="Response time in seconds"
    )


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    database: str = Field(..., description="Database status")
    chunks: Optional[int] = Field(None, description="Total chunks in database")


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")

