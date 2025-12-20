"""
Sentry Configuration for HåfaGPT

Provides error tracking, performance monitoring, and alerting.

Setup:
1. Create a project at sentry.io (Python -> FastAPI)
2. Copy the DSN from project settings
3. Set SENTRY_DSN environment variable
"""

import os
import logging
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration

logger = logging.getLogger(__name__)


def init_sentry():
    """
    Initialize Sentry error tracking.
    
    Environment Variables:
        SENTRY_DSN: Your Sentry project DSN (required for Sentry to work)
        SENTRY_ENVIRONMENT: Environment name (production, staging, development)
        SENTRY_TRACES_SAMPLE_RATE: Percentage of transactions to trace (0.0 to 1.0)
    
    Returns:
        bool: True if Sentry was initialized, False otherwise
    """
    dsn = os.getenv("SENTRY_DSN")
    
    if not dsn:
        logger.info("SENTRY_DSN not set - Sentry error tracking disabled")
        return False
    
    environment = os.getenv("SENTRY_ENVIRONMENT", "production")
    traces_sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
    
    try:
        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            
            # Performance monitoring
            traces_sample_rate=traces_sample_rate,  # 10% of transactions
            
            # Profile sample rate (for performance profiling)
            # Set to 0 to disable profiling
            # profiles_sample_rate=0.1,  # Uncomment if you want profiling
            
            # Integrations
            integrations=[
                # FastAPI/Starlette integration for request tracking
                FastApiIntegration(
                    transaction_style="endpoint",  # Use endpoint names as transaction names
                ),
                StarletteIntegration(
                    transaction_style="endpoint",
                ),
                
                # Capture logs as breadcrumbs (for context on errors)
                LoggingIntegration(
                    level=logging.INFO,  # Capture INFO and above as breadcrumbs
                    event_level=logging.ERROR,  # Send ERROR and above as events
                ),
                
                # Track outgoing HTTP requests (OpenAI, OpenRouter, etc.)
                HttpxIntegration(),
            ],
            
            # Send default PII (personally identifiable information)
            # Set to False in production if you have privacy concerns
            send_default_pii=True,
            
            # Attach stack traces to log messages
            attach_stacktrace=True,
            
            # Filter out common non-issues
            before_send=filter_events,
            
            # Release version (helps track when issues were introduced)
            release=os.getenv("RENDER_GIT_COMMIT", "local"),
        )
        
        logger.info(f"✅ Sentry initialized: environment={environment}, traces={traces_sample_rate}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


def filter_events(event, hint):
    """
    Filter out events we don't want to send to Sentry.
    
    This reduces noise and saves quota.
    """
    # Get the exception info if available
    if "exc_info" in hint:
        exc_type, exc_value, tb = hint["exc_info"]
        error_message = str(exc_value).lower() if exc_value else ""
        
        # Filter out common non-issues
        ignored_patterns = [
            "connection reset by peer",  # Normal client disconnects
            "broken pipe",  # Normal client disconnects
            "client disconnected",  # SSE client disconnected
            "cancellation",  # User cancelled request
            "cancelled by user",  # User cancelled request
        ]
        
        for pattern in ignored_patterns:
            if pattern in error_message:
                return None  # Don't send this event
    
    return event


def set_user_context(user_id: str = None, email: str = None, is_premium: bool = False):
    """
    Set user context for Sentry events.
    
    This helps identify which users are affected by issues.
    
    Args:
        user_id: Clerk user ID
        email: User's email (optional)
        is_premium: Whether user is premium subscriber
    """
    if user_id:
        sentry_sdk.set_user({
            "id": user_id,
            "email": email,
            "is_premium": is_premium,
        })


def set_request_context(
    conversation_id: str = None,
    mode: str = None,
    token_count: int = None,
    model: str = None,
):
    """
    Set additional context for the current request.
    
    This helps debug issues by providing context about what was happening.
    
    Args:
        conversation_id: Current conversation ID
        mode: Chat mode (english, chamorro, learn)
        token_count: Total input tokens
        model: LLM model being used
    """
    sentry_sdk.set_context("chat_request", {
        "conversation_id": conversation_id,
        "mode": mode,
        "token_count": token_count,
        "model": model,
    })


def capture_token_overflow(
    input_tokens: int,
    budget: int,
    model: str,
    conversation_id: str = None,
):
    """
    Capture a token overflow event (even if handled gracefully).
    
    This helps track how often users hit token limits.
    """
    sentry_sdk.set_context("token_overflow", {
        "input_tokens": input_tokens,
        "budget": budget,
        "overflow_amount": input_tokens - budget,
        "model": model,
        "conversation_id": conversation_id,
    })
    
    # Capture as a warning-level message (not an error)
    sentry_sdk.capture_message(
        f"Token overflow: {input_tokens} tokens exceeds budget of {budget}",
        level="warning"
    )


def capture_rag_error(error: Exception, query: str = None):
    """
    Capture a RAG-related error with context.
    """
    sentry_sdk.set_context("rag_error", {
        "query": query[:200] if query else None,  # Truncate for privacy
    })
    sentry_sdk.capture_exception(error)


def capture_database_error(error: Exception, operation: str = None):
    """
    Capture a database error with context.
    """
    sentry_sdk.set_context("database_error", {
        "operation": operation,
    })
    sentry_sdk.capture_exception(error)


# Performance monitoring helpers
def start_transaction(name: str, op: str = "task"):
    """
    Start a Sentry transaction for performance monitoring.
    
    Usage:
        with start_transaction("process_chat", op="llm") as transaction:
            # ... do work ...
            transaction.set_data("tokens", token_count)
    """
    return sentry_sdk.start_transaction(name=name, op=op)


def add_breadcrumb(message: str, category: str = "info", data: dict = None):
    """
    Add a breadcrumb for debugging.
    
    Breadcrumbs are shown in Sentry when an error occurs,
    providing context about what happened before the error.
    """
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        data=data or {},
    )

