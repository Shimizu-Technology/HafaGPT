"""
Pydantic models for Chamorro Chatbot API

Request and response models for the FastAPI endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


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
    conversation_id: Optional[str] = Field(
        default=None,
        description="Optional conversation ID to attach message to"
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


# --- Conversation Models ---

class ConversationCreate(BaseModel):
    """Request to create a new conversation"""
    title: Optional[str] = Field(default="New Chat", description="Conversation title")


class ConversationResponse(BaseModel):
    """Response model for a conversation"""
    id: str = Field(..., description="Unique conversation ID")
    user_id: Optional[str] = Field(None, description="Owner user ID")
    title: str = Field(..., description="Conversation title")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    message_count: int = Field(default=0, description="Number of messages in conversation")


class ConversationListResponse(BaseModel):
    """Response model for listing conversations"""
    conversations: list[ConversationResponse] = Field(default=[], description="List of conversations")


class MessageResponse(BaseModel):
    """Response model for a single message"""
    id: int = Field(..., description="Message ID")
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(..., description="Message timestamp")
    sources: list[SourceInfo] = Field(default=[], description="Sources used (for assistant messages)")
    used_rag: bool = Field(default=False, description="Whether RAG was used")
    used_web_search: bool = Field(default=False, description="Whether web search was used")
    image_url: Optional[str] = Field(default=None, description="S3 URL of uploaded image (for user messages)")


class MessagesResponse(BaseModel):
    """Response model for conversation messages"""
    conversation_id: str = Field(..., description="Conversation ID")
    messages: list[MessageResponse] = Field(default=[], description="List of messages")

