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
    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(..., description="Message timestamp")
    sources: list[SourceInfo] = Field(default=[], description="Sources used (for assistant messages)")
    used_rag: bool = Field(default=False, description="Whether RAG was used")
    used_web_search: bool = Field(default=False, description="Whether web search was used")
    image_url: Optional[str] = Field(default=None, description="S3 URL of uploaded image (for user messages)")
    mode: Optional[str] = Field(default=None, description="Mode for system messages (english/chamorro/learn)")
    response_time: Optional[float] = Field(default=None, description="Response time in seconds (for assistant messages)")


class MessagesResponse(BaseModel):
    """Response model for conversation messages"""
    conversation_id: str = Field(..., description="Conversation ID")
    messages: list[MessageResponse] = Field(default=[], description="List of messages")


class SystemMessageCreate(BaseModel):
    """Request to create a system message (e.g., mode change)"""
    conversation_id: str = Field(..., description="Conversation ID")
    content: str = Field(..., description="System message content")
    mode: Optional[str] = Field(None, description="Mode for mode change messages")


class InitResponse(BaseModel):
    """Response model for /api/init - returns all initial data in one request"""
    conversations: list[ConversationResponse] = Field(default=[], description="List of user's conversations")
    messages: list[MessageResponse] = Field(default=[], description="Messages for active conversation")
    active_conversation_id: Optional[str] = Field(None, description="ID of the active conversation")


# --- Flashcard Models ---

class FlashcardResponse(BaseModel):
    """Response model for a single flashcard"""
    front: str = Field(..., description="Front of card (Chamorro word/phrase)")
    back: str = Field(..., description="Back of card (English translation)")
    pronunciation: Optional[str] = Field(None, description="Phonetic pronunciation guide")
    example: Optional[str] = Field(None, description="Example sentence in Chamorro")
    category: str = Field(..., description="Category/topic of the card")


class GenerateFlashcardsResponse(BaseModel):
    """Response model for flashcard generation"""
    flashcards: list[FlashcardResponse] = Field(..., description="Generated flashcards")
    topic: str = Field(..., description="Topic of the flashcards")
    count: int = Field(..., description="Number of cards generated")


# --- Flashcard Progress Models ---

class FlashcardCard(BaseModel):
    """A single flashcard for saving"""
    front: str
    back: str
    pronunciation: Optional[str] = None
    example: Optional[str] = None


class SaveDeckRequest(BaseModel):
    """Request to save a deck of flashcards"""
    user_id: str = Field(..., description="User ID from Clerk")
    topic: str = Field(..., description="Topic (e.g., 'greetings', 'family')")
    title: str = Field(..., description="Deck title (e.g., 'My Greetings Cards')")
    card_type: str = Field(default="custom", description="Type: 'default' or 'custom'")
    cards: list[FlashcardCard] = Field(..., description="List of flashcards to save")


class SaveDeckResponse(BaseModel):
    """Response after saving a deck"""
    deck_id: str = Field(..., description="UUID of the saved deck")
    message: str = Field(..., description="Success message")


class FlashcardProgressInfo(BaseModel):
    """Progress information for a single flashcard"""
    times_reviewed: int = Field(default=0, description="Number of times reviewed")
    last_reviewed: Optional[datetime] = Field(None, description="Last review timestamp")
    next_review: Optional[datetime] = Field(None, description="Next review timestamp")
    confidence: int = Field(default=1, description="Confidence level (1=hard, 2=good, 3=easy)")


class FlashcardWithProgress(BaseModel):
    """Flashcard with user progress"""
    id: str = Field(..., description="Flashcard UUID")
    front: str
    back: str
    pronunciation: Optional[str] = None
    example: Optional[str] = None
    progress: Optional[FlashcardProgressInfo] = None


class UserDeckResponse(BaseModel):
    """Response model for a user's flashcard deck"""
    id: str = Field(..., description="Deck UUID")
    topic: str
    title: str
    card_type: str
    total_cards: int = Field(..., description="Total cards in deck")
    cards_reviewed: int = Field(default=0, description="Cards reviewed at least once")
    cards_due: int = Field(default=0, description="Cards due for review today")
    created_at: datetime


class UserDecksResponse(BaseModel):
    """Response model for listing user's decks"""
    decks: list[UserDeckResponse]


class DeckCardsResponse(BaseModel):
    """Response model for getting cards in a deck"""
    deck_id: str
    topic: str
    title: str
    cards: list[FlashcardWithProgress]


class ReviewCardRequest(BaseModel):
    """Request to mark a card as reviewed"""
    user_id: str = Field(..., description="User ID from Clerk")
    flashcard_id: str = Field(..., description="Flashcard UUID")
    confidence: int = Field(..., ge=1, le=3, description="Confidence: 1=hard, 2=good, 3=easy")


class ReviewCardResponse(BaseModel):
    """Response after reviewing a card"""
    next_review: datetime = Field(..., description="When to review this card next")
    message: str = Field(..., description="Feedback message")
    days_until_next: int = Field(..., description="Days until next review")

