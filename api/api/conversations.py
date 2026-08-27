"""
Conversation management endpoints

Simple CRUD operations for conversations.
"""

import uuid
from contextlib import closing
from datetime import datetime
from typing import Optional
import logging

from .database_connections import get_db_connection, get_db_connection_with_retry
from .models import (
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    MessagesResponse,
    MessageResponse,
    SourceInfo
)
from .source_citations import format_source_citations
from .upload_storage import delete_private_upload_references, resolve_private_upload_reference

logger = logging.getLogger(__name__)


def conversation_belongs_to_user(
    conversation_id: str,
    user_id: str,
    include_deleted: bool = False,
) -> bool:
    """
    Check whether a conversation belongs to the given user.

    Args:
        conversation_id: Conversation ID to check
        user_id: Owning user ID
        include_deleted: When True, allow soft-deleted conversations to match
    """
    try:
        with closing(get_db_connection_with_retry()) as conn:
            with closing(conn.cursor()) as cursor:
                query = """
                    SELECT 1
                    FROM conversations
                    WHERE id = %s
                      AND user_id = %s
                """
                if not include_deleted:
                    query += "\n                      AND deleted_at IS NULL"
                query += "\n                    LIMIT 1"

                cursor.execute(query, (conversation_id, user_id))
                return cursor.fetchone() is not None
    except Exception as e:
        logger.error(f"Failed to verify conversation ownership: {e}")
        raise


def create_conversation(
    user_id: str,
    title: str = "New Chat",
    learning_topic_id: Optional[str] = None,
) -> ConversationResponse:
    """
    Create a new conversation.
    
    Args:
        user_id: User ID (required - authentication enforced)
        title: Conversation title
        learning_topic_id: Optional stable learning topic that started the chat
        
    Returns:
        ConversationResponse with new conversation details
    """
    conversation_id = str(uuid.uuid4())
    logger.info(f"🆕 Creating conversation: id={conversation_id}, user_id={user_id}, title={title}")
    
    try:
        with closing(get_db_connection_with_retry()) as conn:
            with closing(conn.cursor()) as cursor:
                cursor.execute("""
                    INSERT INTO conversations (
                        id, user_id, title, learning_topic_id, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, NOW(), NOW())
                    RETURNING id, user_id, title, created_at, updated_at, learning_topic_id
                """, (conversation_id, user_id, title, learning_topic_id))
                row = cursor.fetchone()
                conn.commit()
        
        result = ConversationResponse(
            id=row[0],
            user_id=row[1],
            title=row[2],
            created_at=row[3],
            updated_at=row[4],
            message_count=0,
            learning_topic_id=row[5],
        )
        logger.info(f"✅ Created conversation: {result.id} for user: {result.user_id}")
        return result
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise


def get_conversations(
    user_id: str,
    limit: int = 50,
    learning_topic_id: Optional[str] = None,
) -> ConversationListResponse:
    """
    Get list of conversations for a user.
    
    Args:
        user_id: User ID to filter by (required - authentication enforced)
        limit: Max number of conversations to return
        learning_topic_id: Optional stable topic filter
        
    Returns:
        ConversationListResponse with list of conversations
    """
    try:
        logger.info(
            "Fetching conversations: topic_filter=%s limit=%s",
            learning_topic_id is not None,
            limit,
        )
        with closing(get_db_connection_with_retry()) as conn:
            with closing(conn.cursor()) as cursor:
                # Get conversations (excluding soft-deleted) without a costly COUNT.
                query = """
                    SELECT
                        c.id,
                        c.user_id,
                        c.title,
                        c.created_at,
                        c.updated_at,
                        c.learning_topic_id
                    FROM conversations c
                    WHERE c.deleted_at IS NULL
                      AND c.user_id = %s
                """
                params: list[object] = [user_id]
                if learning_topic_id is not None:
                    query += "\n                      AND c.learning_topic_id = %s"
                    params.append(learning_topic_id)
                query += """
                    ORDER BY c.updated_at DESC
                    LIMIT %s
                """
                params.append(limit)

                cursor.execute(query, tuple(params))
                rows = cursor.fetchall()
                logger.info(f"📊 Query returned {len(rows)} rows")
        
        conversations = [
            ConversationResponse(
                id=row[0],
                user_id=row[1],
                title=row[2],
                created_at=row[3],
                updated_at=row[4],
                message_count=0,  # Default to 0 - not counting for performance
                learning_topic_id=row[5],
            )
            for row in rows
        ]
        
        logger.info(f"✅ Returning {len(conversations)} conversations")
        return ConversationListResponse(conversations=conversations)
    except Exception as e:
        logger.error(f"Failed to get conversations: {e}")
        raise


def get_conversation(conversation_id: str, user_id: str) -> Optional[ConversationResponse]:
    """Return one non-deleted conversation when it belongs to the user."""
    try:
        with closing(get_db_connection_with_retry()) as conn:
            with closing(conn.cursor()) as cursor:
                cursor.execute(
                    """
                    SELECT id, user_id, title, created_at, updated_at, learning_topic_id
                    FROM conversations
                    WHERE id = %s
                      AND user_id = %s
                      AND deleted_at IS NULL
                    LIMIT 1
                    """,
                    (conversation_id, user_id),
                )
                row = cursor.fetchone()
        if row is None:
            return None
        return ConversationResponse(
            id=row[0],
            user_id=row[1],
            title=row[2],
            created_at=row[3],
            updated_at=row[4],
            message_count=0,
            learning_topic_id=row[5],
        )
    except Exception as e:
        logger.error(f"Failed to get conversation: {e}")
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
        conn = get_db_connection_with_retry()
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
                        url=resolve_private_upload_reference(f.get('url', '')) or '',
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
                continue

            # User message
            if row[2] is not None or row[8] is not None or file_urls:
                # User message
                messages.append(MessageResponse(
                    id=row[0],
                    role="user",
                    content=row[2],
                    timestamp=row[4],
                    sources=[],
                    used_rag=False,
                    used_web_search=False,
                    image_url=resolve_private_upload_reference(row[8]),
                    file_urls=file_urls,  # New: all file URLs
                    response_time=None  # User messages don't have response time
                ))
            
            # Assistant message
            if row[3] and row[3].strip():
                sources = []
                if row[5]:  # sources_used (JSONB)
                    sources = [
                        SourceInfo(**source)
                        for source in format_source_citations(row[5])
                    ]
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
    Permanently delete an owned conversation, its messages, and private uploads.
    
    Args:
        conversation_id: Conversation ID to delete
        user_id: Optional user ID to verify ownership
        
    Returns:
        True if deleted, False if not found
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection_with_retry()
        cursor = conn.cursor()
        
        ownership_clause = "user_id = %s" if user_id else "user_id IS NULL"
        ownership_params = (conversation_id, user_id) if user_id else (conversation_id,)
        cursor.execute(
            f"SELECT id FROM conversations WHERE id = %s AND {ownership_clause} AND deleted_at IS NULL",
            ownership_params,
        )
        if cursor.fetchone() is None:
            return False

        cursor.execute(
            "SELECT image_url, file_urls FROM conversation_logs WHERE conversation_id = %s",
            (conversation_id,),
        )
        upload_references: list[str] = []
        for image_url, file_urls in cursor.fetchall():
            if image_url:
                upload_references.append(image_url)
            for file_info in file_urls or []:
                if isinstance(file_info, dict) and file_info.get("url"):
                    upload_references.append(file_info["url"])

        # Delete children explicitly so the behavior is consistent across legacy
        # schemas that predate cascade constraints.
        cursor.execute("DELETE FROM shared_conversations WHERE conversation_id = %s", (conversation_id,))
        cursor.execute("SELECT to_regclass('public.message_feedback')")
        if cursor.fetchone()[0] is not None:
            cursor.execute("DELETE FROM message_feedback WHERE conversation_id = %s", (conversation_id,))
        cursor.execute("DELETE FROM conversation_logs WHERE conversation_id = %s", (conversation_id,))
        cursor.execute("DELETE FROM conversations WHERE id = %s", (conversation_id,))

        deleted = cursor.rowcount > 0
        conn.commit()

        if deleted:
            try:
                deleted_uploads = delete_private_upload_references(upload_references)
                logger.info(
                    f"Permanently deleted conversation {conversation_id} and "
                    f"{deleted_uploads} private upload(s)"
                )
            except Exception as storage_error:
                # The personal database content is already gone. Log the storage
                # cleanup failure for operational follow-up without restoring it.
                logger.error(
                    f"Conversation {conversation_id} deleted, but private upload cleanup failed: "
                    f"{storage_error}"
                )

        return deleted
    except Exception as e:
        if conn is not None:
            conn.rollback()
        logger.error(f"Failed to delete conversation: {e}")
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


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
        conn = get_db_connection_with_retry()
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


def delete_messages_after(conversation_id: str, timestamp: int, user_id: Optional[str] = None) -> int:
    """
    Delete all messages in a conversation after a given timestamp.
    Used for Edit & Regenerate feature.
    
    Args:
        conversation_id: Conversation ID
        timestamp: Unix timestamp (milliseconds) - delete messages after this time
        user_id: Optional user ID to verify ownership
        
    Returns:
        Number of messages deleted
    """
    try:
        conn = get_db_connection_with_retry()
        cursor = conn.cursor()
        
        # Convert milliseconds to timestamp
        from datetime import datetime
        dt = datetime.fromtimestamp(timestamp / 1000.0)
        
        # Delete messages after the given timestamp
        # Include user_id check for security if provided
        if user_id:
            cursor.execute("""
                DELETE FROM conversation_logs
                WHERE conversation_id = %s 
                AND user_id = %s
                AND timestamp > %s
            """, (conversation_id, user_id, dt))
        else:
            cursor.execute("""
                DELETE FROM conversation_logs
                WHERE conversation_id = %s 
                AND timestamp > %s
            """, (conversation_id, dt))
        
        deleted_count = cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"🗑️ Deleted {deleted_count} messages after {dt} in conversation {conversation_id} (Edit & Regenerate)")
        return deleted_count
    except Exception as e:
        logger.error(f"Failed to delete messages after timestamp: {e}")
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
        with closing(get_db_connection_with_retry()) as conn:
            with closing(conn.cursor()) as cursor:
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
                    'system',
                    mode,
                    content,
                    '',
                    '[]',
                    False,
                    False,
                    0.0,
                ))
                if user_id:
                    cursor.execute(
                        """
                        UPDATE conversations
                        SET updated_at = NOW()
                        WHERE id = %s
                          AND user_id = %s
                          AND deleted_at IS NULL
                        """,
                        (conversation_id, user_id),
                    )
                conn.commit()
        
        logger.info(f"✅ Created system message in conversation {conversation_id}: {content}")
        return True
    except Exception as e:
        logger.error(f"Failed to create system message: {e}")
        raise
