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


def create_conversation(user_id: str, title: str = "New Chat") -> ConversationResponse:
    """
    Create a new conversation.
    
    Args:
        user_id: User ID (required - authentication enforced)
        title: Conversation title
        
    Returns:
        ConversationResponse with new conversation details
    """
    conversation_id = str(uuid.uuid4())
    logger.info(f"🆕 Creating conversation: id={conversation_id}, user_id={user_id}, title={title}")
    
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
        
        result = ConversationResponse(
            id=row[0],
            user_id=row[1],
            title=row[2],
            created_at=row[3],
            updated_at=row[4],
            message_count=0
        )
        logger.info(f"✅ Created conversation: {result.id} for user: {result.user_id}")
        return result
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise


def get_conversations(user_id: str, limit: int = 50) -> ConversationListResponse:
    """
    Get list of conversations for a user.
    
    Args:
        user_id: User ID to filter by (required - authentication enforced)
        limit: Max number of conversations to return
        
    Returns:
        ConversationListResponse with list of conversations
    """
    try:
        logger.info(f"🔍 get_conversations called with user_id: {user_id}")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get conversations (excluding soft-deleted) - optimized without COUNT
        query = """
            SELECT 
                c.id,
                c.user_id,
                c.title,
                c.created_at,
                c.updated_at
            FROM conversations c
            WHERE c.deleted_at IS NULL
              AND c.user_id = %s
            ORDER BY c.updated_at DESC 
            LIMIT %s
        """
        
        params = (user_id, limit)
        
        logger.info(f"📝 Executing query with params: {params}")
        cursor.execute(query, params)
        rows = cursor.fetchall()
        logger.info(f"📊 Query returned {len(rows)} rows")
        
        conversations = [
            ConversationResponse(
                id=row[0],
                user_id=row[1],
                title=row[2],
                created_at=row[3],
                updated_at=row[4],
                message_count=0  # Default to 0 - not counting for performance
            )
            for row in rows
        ]
        
        logger.info(f"✅ Returning {len(conversations)} conversations")
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
                role,
                user_message,
                bot_response,
                timestamp,
                sources_used,
                used_rag,
                used_web_search,
                image_url,
                mode,
                response_time_seconds,
                file_urls
            FROM conversation_logs
            WHERE conversation_id = %s
            ORDER BY timestamp ASC
        """, (conversation_id,))
        
        rows = cursor.fetchall()
        messages = []
        
        # Convert to messages based on role
        for row in rows:
            role = row[1]
            file_urls_data = row[11]  # file_urls JSONB column
            
            # Parse file_urls if present
            file_urls = None
            if file_urls_data:
                from .models import FileInfo
                file_urls = [
                    FileInfo(
                        url=f.get('url', ''),
                        filename=f.get('filename', 'file'),
                        type=f.get('type', 'document'),
                        content_type=f.get('content_type')
                    )
                    for f in file_urls_data
                ]
            
            if role == 'system':
                # System message (mode change, etc.)
                messages.append(MessageResponse(
                    id=row[0],
                    role="system",
                    content=row[2] or "",  # System message stored in user_message column
                    timestamp=row[4],
                    sources=[],
                    used_rag=False,
                    used_web_search=False,
                    image_url=None,
                    file_urls=None,
                    mode=row[9],  # Mode from database
                    response_time=None  # System messages don't have response time
                ))
            else:
                # User message
                messages.append(MessageResponse(
                    id=row[0],
                    role="user",
                    content=row[2],
                    timestamp=row[4],
                    sources=[],
                    used_rag=False,
                    used_web_search=False,
                    image_url=row[8],  # Legacy S3 image URL
                    file_urls=file_urls,  # New: all file URLs
                    response_time=None  # User messages don't have response time
                ))
            
            # Assistant message
            sources = []
            if row[5]:  # sources_used (JSONB)
                for source in row[5]:
                    sources.append(SourceInfo(
                        name=source.get("name", ""),
                        page=source.get("page")
                    ))
            
            messages.append(MessageResponse(
                id=row[0],
                role="assistant",
                content=row[3],
                timestamp=row[4],
                sources=sources,
                used_rag=row[6],
                used_web_search=row[7],
                image_url=None,  # Assistant messages don't have images
                file_urls=None,
                response_time=row[10]  # Response time from database
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


def create_system_message(
    conversation_id: str,
    content: str,
    mode: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> bool:
    """
    Create a system message (e.g., mode change indicator).
    
    Args:
        conversation_id: Conversation ID
        content: System message content
        mode: Mode for mode change messages
        user_id: Optional user ID
        session_id: Optional session ID
        
    Returns:
        True if created successfully
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert system message
        cursor.execute("""
            INSERT INTO conversation_logs (
                session_id, user_id, conversation_id, role, mode,
                user_message, bot_response, sources_used,
                used_rag, used_web_search, response_time_seconds
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            session_id,
            user_id,
            conversation_id,
            'system',  # role
            mode,  # mode (for mode changes)
            content,  # store in user_message column
            '',  # empty bot_response
            '[]',  # empty sources
            False,  # used_rag
            False,  # used_web_search
            0.0  # response_time
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"✅ Created system message in conversation {conversation_id}: {content}")
        return True
    except Exception as e:
        logger.error(f"Failed to create system message: {e}")
        raise




