"""
Conversation management endpoints

Simple CRUD operations for conversations.
"""

import uuid
import psycopg
import os
from datetime import datetime
from typing import Optional
import logging

from .models import (
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    MessagesResponse,
    MessageResponse,
    SourceInfo
)

logger = logging.getLogger(__name__)


def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL", "postgresql://localhost/chamorro_rag")
    return psycopg.connect(database_url)


def create_conversation(user_id: Optional[str] = None, title: str = "New Chat") -> ConversationResponse:
    """
    Create a new conversation.
    
    Args:
        user_id: Optional user ID (None for anonymous)
        title: Conversation title
        
    Returns:
        ConversationResponse with new conversation details
    """
    conversation_id = str(uuid.uuid4())
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO conversations (id, user_id, title, created_at, updated_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            RETURNING id, user_id, title, created_at, updated_at
        """, (conversation_id, user_id, title))
        
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        return ConversationResponse(
            id=row[0],
            user_id=row[1],
            title=row[2],
            created_at=row[3],
            updated_at=row[4],
            message_count=0
        )
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise


def get_conversations(user_id: Optional[str] = None, limit: int = 50) -> ConversationListResponse:
    """
    Get list of conversations for a user.
    
    Args:
        user_id: User ID to filter by (None for anonymous/all)
        limit: Max number of conversations to return
        
    Returns:
        ConversationListResponse with list of conversations
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get conversations with message counts (excluding soft-deleted)
        query = """
            SELECT 
                c.id,
                c.user_id,
                c.title,
                c.created_at,
                c.updated_at,
                COUNT(cl.id) as message_count
            FROM conversations c
            LEFT JOIN conversation_logs cl ON c.id = cl.conversation_id
            WHERE c.deleted_at IS NULL
        """
        
        if user_id:
            query += " AND c.user_id = %s"
            params = (user_id,)
        else:
            query += " AND c.user_id IS NULL"
            params = ()
        
        query += " GROUP BY c.id ORDER BY c.updated_at DESC LIMIT %s"
        params = params + (limit,)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        conversations = [
            ConversationResponse(
                id=row[0],
                user_id=row[1],
                title=row[2],
                created_at=row[3],
                updated_at=row[4],
                message_count=row[5]
            )
            for row in rows
        ]
        
        cursor.close()
        conn.close()
        
        return ConversationListResponse(conversations=conversations)
    except Exception as e:
        logger.error(f"Failed to get conversations: {e}")
        raise


def get_conversation_messages(conversation_id: str) -> MessagesResponse:
    """
    Get all messages for a conversation.
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        MessagesResponse with list of messages
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get messages for conversation (even if conversation is soft-deleted)
        # This allows access to historical data for analytics
        cursor.execute("""
            SELECT 
                id,
                user_message,
                bot_response,
                timestamp,
                sources_used,
                used_rag,
                used_web_search
            FROM conversation_logs
            WHERE conversation_id = %s
            ORDER BY timestamp ASC
        """, (conversation_id,))
        
        rows = cursor.fetchall()
        messages = []
        
        # Convert to message pairs (user + assistant)
        for row in rows:
            # User message
            messages.append(MessageResponse(
                id=row[0],
                role="user",
                content=row[1],
                timestamp=row[3],
                sources=[],
                used_rag=False,
                used_web_search=False
            ))
            
            # Assistant message
            sources = []
            if row[4]:  # sources_used (JSONB)
                for source in row[4]:
                    sources.append(SourceInfo(
                        name=source.get("name", ""),
                        page=source.get("page")
                    ))
            
            messages.append(MessageResponse(
                id=row[0],
                role="assistant",
                content=row[2],
                timestamp=row[3],
                sources=sources,
                used_rag=row[5],
                used_web_search=row[6]
            ))
        
        cursor.close()
        conn.close()
        
        return MessagesResponse(
            conversation_id=conversation_id,
            messages=messages
        )
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        raise


def delete_conversation(conversation_id: str, user_id: Optional[str] = None) -> bool:
    """
    Soft delete a conversation (sets deleted_at timestamp).
    
    This preserves conversation_logs for training/analytics while hiding
    the conversation from the user's list.
    
    Args:
        conversation_id: Conversation ID to delete
        user_id: Optional user ID to verify ownership
        
    Returns:
        True if deleted, False if not found
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Soft delete with optional user_id check for security
        if user_id:
            cursor.execute("""
                UPDATE conversations
                SET deleted_at = NOW()
                WHERE id = %s AND user_id = %s AND deleted_at IS NULL
            """, (conversation_id, user_id))
        else:
            cursor.execute("""
                UPDATE conversations
                SET deleted_at = NOW()
                WHERE id = %s AND user_id IS NULL AND deleted_at IS NULL
            """, (conversation_id,))
        
        deleted = cursor.rowcount > 0
        conn.commit()
        cursor.close()
        conn.close()
        
        if deleted:
            logger.info(f"Soft deleted conversation {conversation_id} (logs preserved for training)")
        
        return deleted
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")
        raise


def update_conversation_title(conversation_id: str, title: str, user_id: Optional[str] = None) -> bool:
    """
    Update conversation title.
    
    Args:
        conversation_id: Conversation ID
        title: New title
        user_id: Optional user ID to verify ownership
        
    Returns:
        True if updated, False if not found
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute("""
                UPDATE conversations
                SET title = %s, updated_at = NOW()
                WHERE id = %s AND user_id = %s AND deleted_at IS NULL
            """, (title, conversation_id, user_id))
        else:
            cursor.execute("""
                UPDATE conversations
                SET title = %s, updated_at = NOW()
                WHERE id = %s AND user_id IS NULL AND deleted_at IS NULL
            """, (title, conversation_id))
        
        updated = cursor.rowcount > 0
        conn.commit()
        cursor.close()
        conn.close()
        
        return updated
    except Exception as e:
        logger.error(f"Failed to update conversation: {e}")
        raise




