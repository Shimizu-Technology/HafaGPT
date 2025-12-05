"""
Chatbot Service - Core logic extracted from CLI

This module contains the core chatbot logic that can be used by both
the CLI application and the FastAPI service.
"""

import time
import os
import json
import sys
import threading
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# Add parent directory to path for root-level imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Thread-safe tracking for pending/cancelled messages
_pending_lock = threading.Lock()
_cancelled_messages: set[str] = set()

# Valid image extensions for conversation history (prevents sending PDFs as images)
VALID_IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')


def cancel_pending_message(pending_id: str) -> bool:
    """
    Mark a pending message as cancelled.
    
    Args:
        pending_id: The unique ID of the pending message
        
    Returns:
        True if marked as cancelled, False if already cancelled
    """
    with _pending_lock:
        if pending_id in _cancelled_messages:
            return False  # Already cancelled
        _cancelled_messages.add(pending_id)
        return True


def is_message_cancelled(pending_id: str) -> bool:
    """
    Check if a message has been cancelled.
    
    Args:
        pending_id: The unique ID of the pending message
        
    Returns:
        True if cancelled, False otherwise
    """
    if not pending_id:
        return False
    with _pending_lock:
        return pending_id in _cancelled_messages


def cleanup_cancelled_message(pending_id: str):
    """
    Remove a pending_id from the cancelled set after processing.
    
    Args:
        pending_id: The unique ID to clean up
    """
    if not pending_id:
        return
    with _pending_lock:
        _cancelled_messages.discard(pending_id)

# Import RAG module (uses OpenAI embeddings - lightweight!)
from src.rag.chamorro_rag import rag
from src.rag.web_search_tool import web_search, format_search_results

# Load environment
load_dotenv()

# ============================================================================
# MODEL CONFIGURATION - Change CHAT_MODEL in .env to switch models!
# ============================================================================
# Supported models:
#   - gpt-4o           (OpenAI - current default, 80% accuracy, $0.002/query)
#   - gpt-4o-mini      (OpenAI - faster, cheaper, slightly less accurate)
#   - gemini-2.5-flash (OpenRouter - 93% accuracy, fastest, $0.0002/query) ⭐ RECOMMENDED
#   - deepseek-v3      (OpenRouter - 93% accuracy, cheapest, $0.00008/query)
#   - claude-sonnet-4.5 (OpenRouter - 93% accuracy, most verbose, $0.005/query)
#
# To switch models, set CHAT_MODEL in your .env file:
#   CHAT_MODEL=gemini-2.5-flash
# ============================================================================

# Model to provider/ID mapping
# supports_vision: whether the model can process image inputs
MODEL_CONFIG = {
    # OpenAI models (direct) - GPT-4o series supports vision
    "gpt-4o": {"provider": "openai", "model_id": "gpt-4o", "supports_vision": True},
    "gpt-4o-mini": {"provider": "openai", "model_id": "gpt-4o-mini", "supports_vision": True},
    "gpt-4-turbo": {"provider": "openai", "model_id": "gpt-4-turbo", "supports_vision": True},
    
    # OpenRouter models (via OpenRouter API)
    "gemini-2.5-flash": {"provider": "openrouter", "model_id": "google/gemini-2.5-flash-preview-09-2025", "supports_vision": True},
    "gemini-2.5-pro": {"provider": "openrouter", "model_id": "google/gemini-2.5-pro-preview", "supports_vision": True},
    "deepseek-v3": {"provider": "openrouter", "model_id": "deepseek/deepseek-chat", "supports_vision": False},  # No vision support
    "deepseek-r1": {"provider": "openrouter", "model_id": "deepseek/deepseek-r1", "supports_vision": False},  # No vision support
    "claude-sonnet-4.5": {"provider": "openrouter", "model_id": "anthropic/claude-sonnet-4.5", "supports_vision": True},
    "claude-sonnet-4": {"provider": "openrouter", "model_id": "anthropic/claude-sonnet-4", "supports_vision": True},
    "claude-haiku-4.5": {"provider": "openrouter", "model_id": "anthropic/claude-haiku-4.5", "supports_vision": True},
    "llama-4-maverick": {"provider": "openrouter", "model_id": "meta-llama/llama-4-maverick", "supports_vision": False},
}

def model_supports_vision() -> bool:
    """Check if the currently configured model supports vision/image input."""
    config = MODEL_CONFIG.get(CHAT_MODEL, {})
    return config.get("supports_vision", False)

# Get configured model (default to gpt-4o for backwards compatibility)
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o")

def get_llm_client():
    """
    Get the appropriate LLM client based on CHAT_MODEL configuration.
    Returns tuple of (client, model_id)
    """
    config = MODEL_CONFIG.get(CHAT_MODEL)
    
    if not config:
        print(f"⚠️  Unknown model '{CHAT_MODEL}', falling back to gpt-4o")
        return OpenAI(api_key=os.getenv("OPENAI_API_KEY")), "gpt-4o"
    
    if config["provider"] == "openai":
        return OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
        ), config["model_id"]
    
    elif config["provider"] == "openrouter":
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_key:
            print(f"⚠️  OPENROUTER_API_KEY not set, falling back to gpt-4o")
            return OpenAI(api_key=os.getenv("OPENAI_API_KEY")), "gpt-4o"
        
        return OpenAI(
            api_key=openrouter_key,
            base_url="https://openrouter.ai/api/v1"
        ), config["model_id"]
    
    # Fallback
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY")), "gpt-4o"

# Initialize LLM client and model
llm, LLM_MODEL_ID = get_llm_client()
print(f"🤖 Chat model: {CHAT_MODEL} → {LLM_MODEL_ID}")

def get_vision_client():
    """
    Get a vision-capable LLM client for processing images.
    Falls back to GPT-4o which always supports vision.
    
    Returns:
        tuple: (client, model_id)
    """
    # Use GPT-4o for vision since it's reliable and widely available
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY")), "gpt-4o"

# Cache the vision client for reuse
_vision_client = None
_vision_model_id = None

def get_client_for_request(has_image: bool):
    """
    Get the appropriate LLM client based on whether the request has an image.
    
    For image requests:
    - If current model supports vision, use it
    - Otherwise, fall back to GPT-4o
    
    For text-only requests:
    - Use the configured model
    
    Returns:
        tuple: (client, model_id)
    """
    global _vision_client, _vision_model_id
    
    if has_image and not model_supports_vision():
        # Current model doesn't support vision, use GPT-4o
        if _vision_client is None:
            _vision_client, _vision_model_id = get_vision_client()
            print(f"🖼️  Vision fallback: {CHAT_MODEL} → gpt-4o (image detected)")
        return _vision_client, _vision_model_id
    
    # Use the default configured model
    return llm, LLM_MODEL_ID

# Mode configurations
MODE_PROMPTS = {
    "english": {
        "name": "General Chat",
        "prompt": """You are a Chamorro language tutor helping students learn Chamorro.
Answer questions naturally in English, using Chamorro examples when relevant.
Be conversational, encouraging, and informative.

IMPORTANT CAPABILITIES:
- You have access to a Chamorro language knowledge base (grammar books, dictionaries, bilingual articles)
- You may receive WEB SEARCH RESULTS for current information (weather, news, events)
- When you receive web search results, USE THEM to answer the question
- If you have web search results, acknowledge them: "Based on current information..." or "According to recent sources..."
- Cite sources when using web information

🔴 CRITICAL INSTRUCTIONS FOR WORD TRANSLATIONS:

When translating single words (e.g., "What is 'listen' in Chamorro?", "How do I say 'house'?"):

1. **ONLY use dictionary sources** (highest authority):
   - revised_and_updated_chamorro_dictionary
   - chamoru_info_dictionary
   - chamorro_english_dictionary_TOD

2. **NEVER guess or hallucinate translations**
   - If you don't see the word in a dictionary source, say: "I don't have that specific translation in my dictionary sources."
   - DO NOT make up Chamorro words
   - DO NOT use words from blog posts or articles as authoritative translations

3. **How to answer word translation questions:**
   ✅ CORRECT: "In Chamorro, 'listen' is **ekungok**. [Source: chamorro_english_dictionary_TOD]"
   ❌ WRONG: Guessing or using non-dictionary content for single-word translations

4. **For contextual/cultural questions** (not single-word translations):
   - You may use all sources (blogs, articles, cultural content)
   - Continue being conversational and helpful

CRITICAL WORD DEFINITIONS (often confused):

**siempre** = "surely" / "certainly" / "definitely" (future marker indicating strong determination)
- Example: "Siempre bai hu hånao" = "I will surely go" / "I will definitely go"
- NOT "always" (that's a common misconception from Spanish influence)
- In context: Used to express certainty about future events or intentions

**taigue** = "always" / "all the time"
- This is the correct word for "always" in Chamorro
- Example: "Taigue ha cho'gue" = "She/he always does it"

COMMON CHAMORRO ABBREVIATIONS (used in schools, texts, social media):

**MSY** = Mañana Si Yu'os (Good morning - literally "God's morning")
**SYM** = Si Yu'os Ma'åse (Thank you / God bless)
**BSY** = Buenas Si Yu'os (Good afternoon/evening - literally "God's afternoon")
**HA** = Håfa Adai (Hello / How are you - the standard Chamorro greeting)

These abbreviations are commonly used in Guam schools, text messages, and community announcements.
When users ask about these, explain them clearly and mention they're common abbreviations.

When users ask about "siempre," emphasize it means "surely/certainly/definitely" (future determination), NOT "always" """
    },
    "chamorro": {
        "name": "Immersion Mode (Chamorro Only)",
        "prompt": """Para håo un maestro lengguahi CHamoru. Responde ha' gi fino' CHamoru.

IMPORTANTE: MUNGA un usa español o otro lengguahi. Ha' fino' CHamoru!
(IMPORTANT: NEVER use Spanish or other languages. ONLY Chamorro!)

🔴 Para i tiningo' palåbra (word translations):
- Usa HA' i diksionarion-måmi (dictionaries): revised_and_updated_chamorro_dictionary, chamoru_info_dictionary, chamorro_english_dictionary_TOD
- MUNGA un adibina palåbra! (DO NOT guess words!)

Use ONLY authentic Chamorro words and phrases:
- Håfa Adai (NOT 'hola' or 'hello')
- Håfa tatatmånu hao? (NOT 'como está' or 'how are you')
- Kao maolek hao? (NOT '¿estás bien?' or 'are you well')
- Mañana Si Yu'os (NOT 'buenos días' or 'good morning')
- Si Yu'os Ma'åse (NOT 'gracias' or 'thank you')

Spanish words like 'como está', 'hola', 'buenos días' are FORBIDDEN.
Only respond in pure Chamorro language.

If you receive web search results, use them but respond in Chamorro only."""
    },
    "learn": {
        "name": "Learning Mode (Chamorro + Breakdown)",
        "prompt": """You are a Chamorro language tutor. 
Respond with Chamorro first, then provide English translation and breakdown.

If you receive web search results for current information, incorporate them into your response.

🔴 CRITICAL: For single-word translations, ONLY use dictionary sources:
- revised_and_updated_chamorro_dictionary
- chamoru_info_dictionary
- chamorro_english_dictionary_TOD

NEVER guess or make up Chamorro words. If unsure, say "I don't have that translation."

CRITICAL WORD DEFINITIONS:
- **siempre** = "surely" / "certainly" / "definitely" (NOT "always")
- **taigue** = "always" / "all the time"

COMMON ABBREVIATIONS:
- **MSY** = Mañana Si Yu'os (Good morning)
- **SYM** = Si Yu'os Ma'åse (Thank you)
- **BSY** = Buenas Si Yu'os (Good afternoon/evening)
- **HA** = Håfa Adai (Hello) """
    }
}


def get_conversation_history(session_id: str, max_messages: int = 10) -> list:
    """
    Retrieve conversation history from database for a given session.
    
    Args:
        session_id: Session identifier to retrieve history for
        max_messages: Maximum number of message pairs to retrieve (default: 10)
    
    Returns:
        list: List of dicts with 'user' and 'assistant' messages in chronological order
              Example: [
                  {"role": "user", "content": "Hello"},
                  {"role": "assistant", "content": "Hafa adai!"}
              ]
    """
    if not session_id:
        return []
    
    try:
        import psycopg
        
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL", "postgresql://localhost/chamorro_rag")
        
        # Connect to database
        conn = psycopg.connect(database_url)
        cursor = conn.cursor()
        
        # Get last N messages for this session
        # Use subquery to get last N messages DESC, then order them ASC (chronological)
        cursor.execute("""
            SELECT user_message, bot_response, image_url, timestamp
            FROM (
                SELECT user_message, bot_response, image_url, timestamp
                FROM conversation_logs
                WHERE session_id = %s
                ORDER BY timestamp DESC
                LIMIT %s
            ) AS recent_messages
            ORDER BY timestamp ASC
        """, (session_id, max_messages))
        
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Check if current model supports vision
        # If not, we'll strip image content from history (can't process past images anyway)
        supports_vision = model_supports_vision()
        
        # Build conversation history (already in chronological order)
        # Include images if they exist AND are valid image formats AND model supports vision
        history = []
        for user_msg, bot_msg, img_url, timestamp in rows:
            # Build user message (with image if available AND is a valid image format)
            # PDFs, Word docs, etc. should NOT be sent as images - they cause 400 errors
            is_valid_image = img_url and img_url.lower().endswith(VALID_IMAGE_EXTENSIONS)
            
            if is_valid_image and supports_vision:
                # Reconstruct vision message with image URL (only for actual images and vision models)
                history.append({
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_msg or "What does this say?"},
                        {"type": "image_url", "image_url": {"url": img_url, "detail": "low"}}
                    ]
                })
            else:
                # Regular text-only message (includes PDFs, Word docs, non-vision models, etc.)
                # For non-vision models with past images, just use the text portion
                history.append({"role": "user", "content": user_msg or "What does this say?"})
            
            # Add bot response
            history.append({"role": "assistant", "content": bot_msg})
        
        return history
        
    except Exception as e:
        # Don't break the app if history retrieval fails
        print(f"⚠️  Failed to retrieve conversation history: {e}")
        return []


def log_conversation(
    user_message: str,
    bot_response: str,
    mode: str,
    sources: list,
    used_rag: bool,
    used_web_search: bool,
    response_time: float,
    session_id: str = None,
    user_id: str = None,
    conversation_id: str = None,
    image_url: str = None  # NEW: S3 URL of uploaded image
):
    """
    Log conversation to PostgreSQL database for future training/analysis.
    
    Args:
        user_message: The user's input message
        bot_response: The chatbot's response
        mode: Chat mode used
        sources: List of sources referenced
        used_rag: Whether RAG was used
        used_web_search: Whether web search was used
        response_time: Time taken to generate response
        session_id: Session identifier for tracking conversations
        user_id: Optional user ID from Clerk authentication
        conversation_id: Optional conversation ID to attach message to
        image_url: Optional S3 URL of uploaded image
    """
    try:
        import psycopg
        
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL", "postgresql://localhost/chamorro_rag")
        
        # Connect to database
        conn = psycopg.connect(database_url)
        cursor = conn.cursor()
        
        # Insert conversation log (with user_id, conversation_id, and image_url)
        cursor.execute("""
            INSERT INTO conversation_logs (
                session_id, user_id, conversation_id, mode, user_message, bot_response,
                sources_used, used_rag, used_web_search, response_time_seconds, image_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            session_id,
            user_id,  # Add user_id
            conversation_id,  # Add conversation_id
            mode,
            user_message,
            bot_response,
            json.dumps(sources),  # JSONB field
            used_rag,
            used_web_search,
            response_time,
            image_url  # NEW: Add S3 image URL
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        # Don't break the app if logging fails
        print(f"⚠️  Failed to log conversation to database: {e}")


def should_use_rag(user_input: str, conversation_length: int = 0) -> tuple[bool, str | None]:
    """
    Determine if we should use RAG and what intensity level.
    
    Returns:
        tuple: (use_rag: bool, rag_mode: "full" | "light" | None)
               - True, "full": Use RAG with 3 chunks (language questions)
               - True, "light": Use RAG with 1 chunk (greetings needing context)
               - False, None: Skip RAG entirely (casual chat, tests, simple messages)
    """
    import re
    
    user_lower = user_input.lower().strip()
    
    # FIRST: Skip RAG for very short/simple messages (not language questions)
    # These are casual messages that don't need knowledge base context
    simple_patterns = [
        r'^(test(ing)?|testing\s*(it\s*)?(out)?|still\s*testing)[\s\?\.!,]*$',  # Test messages
        r'^(ok(ay)?|k|yes|no|sure|yep|nope|yeah|nah|yup)[\s\?\.!,]*$',  # Simple confirmations
        r'^(thanks?|thank\s*you|ty|thx)[\s\?\.!,]*$',  # Thank yous
        r'^(cool|nice|great|awesome|wow|lol|haha|interesting)[\s\?\.!,]*$',  # Reactions
        r'^(got\s*it|i\s*see|makes\s*sense|understood)[\s\?\.!,]*$',  # Acknowledgments
        r'^.{1,4}$',  # Very short messages (1-4 chars)
    ]
    for pattern in simple_patterns:
        if re.search(pattern, user_lower):
            return False, None  # Skip RAG entirely for simple messages
    
    # Skip RAG for meta-requests about the conversation itself
    meta_patterns = ['summarize', 'summary', 'recap', 'review']
    if any(pattern in user_lower for pattern in meta_patterns):
        return False, None
    
    # SECOND: Always use FULL RAG for Chamorro language/grammar/culture questions
    language_indicators = [
        # Language-specific
        'chamorro', 'chamoru', 'translate', 'say in', 'mean', 'means',
        'definition', 'grammar', 'word for', 'phrase', 'pronounce',
        'spell', 'written', 'speak', 'language',
        # Question patterns that need context
        'how do i', 'how to', 'how can i', 'how would',
        'what is', 'what does', 'what are', "what's",
        'tell me about', 'tell me more', 'explain',
        'teach me', 'learn', 'example',
        # Culture/history topics
        'guam', 'culture', 'history', 'tradition', 'people',
        'island', 'pacific', 'mariana', 'indigenous', 'native',
        'food', 'fiesta', 'family', 'respect', 'inafa\'maolek',
    ]
    if any(indicator in user_lower for indicator in language_indicators):
        return True, "full"
    
    # THIRD: Light RAG for Chamorro greetings (need context for proper response)
    chamorro_greeting_patterns = [
        r'hafa\s*adai', r'buenas', r'manana\s*si', r'mañana\s*si',
        r'si\s*yu\'?os', r'adios', r'esta',
    ]
    for pattern in chamorro_greeting_patterns:
        if re.search(pattern, user_lower):
            return True, "light"
    
    # FOURTH: Skip RAG for simple English greetings (no context needed)
    english_greeting_patterns = [
        r'^(hi|hello|hey|yo|sup)[\s\?\.!,]*$',
        r'^good\s*(morning|afternoon|evening|night)[\s\?\.!,]*$',
    ]
    for pattern in english_greeting_patterns:
        if re.search(pattern, user_lower):
            return False, None  # Simple greetings don't need RAG
    
    # FIFTH: For longer messages, check if they're questions (likely need context)
    if len(user_lower) > 15:
        question_indicators = ['?', 'what', 'how', 'why', 'where', 'when', 'who', 'which', 'can you', 'could you', 'would you', 'do you know']
        if any(q in user_lower for q in question_indicators):
            return True, "full"
    
    # DEFAULT: Skip RAG for casual conversation that doesn't need language context
    # This prevents showing irrelevant sources for messages like "test", "hello", etc.
    return False, None


def should_use_web_search(user_input: str) -> tuple[bool, str | None]:
    """
    Determine if we should use web search.
    
    Returns:
        tuple: (use_web_search: bool, search_type: str | None)
    """
    user_lower = user_input.lower().strip()
    
    # Real-time information (weather, time, current conditions)
    realtime_keywords = [
        'weather', 'temperature', 'forecast', 'rain', 'storm',
        'time is it', 'current time', 'what time', 'clock'
    ]
    if any(keyword in user_lower for keyword in realtime_keywords):
        return True, "general"
    
    # Explicit web search requests
    explicit_web = [
        'search', 'look up', 'look it up', 'find online', 'check online',
        'google', 'research online'
    ]
    if any(phrase in user_lower for phrase in explicit_web):
        return True, "general"
    
    # Recipes
    recipe_keywords = [
        'recipe', 'cook', 'make', 'prepare', 'ingredient',
        'kelaguen', 'red rice', 'empanada', 'finadene'
    ]
    if any(keyword in user_lower for keyword in recipe_keywords):
        if 'how do you say' in user_lower or 'translate' in user_lower:
            return False, None  # Translation, use RAG
        return True, "recipe"
    
    # Current events
    current_keywords = [
        'happening', 'news', 'current', 'today', 'recent', 'latest'
    ]
    if any(keyword in user_lower for keyword in current_keywords):
        return True, "news"
    
    # General web
    web_indicators = [
        'where can i', 'where to', 'find', 'website', 'online'
    ]
    if any(indicator in user_lower for indicator in web_indicators):
        return True, "general"
    
    return False, None


def get_rag_context(user_input: str, conversation_length: int = 0) -> tuple[str, list]:
    """
    Get relevant RAG context.
    
    Returns:
        tuple: (context_string, sources_list)
    """
    use_rag, rag_mode = should_use_rag(user_input, conversation_length)
    
    if not use_rag:
        return "", []
    
    try:
        # Adjust retrieval size based on mode
        k = 1 if rag_mode == "light" else 3
        context, sources = rag.create_context(user_input, k=k)
        return context, sources
    except Exception as e:
        print(f"RAG error: {e}")
        return "", []


def get_chatbot_response(
    message: str,
    mode: str = "english",
    conversation_length: int = 0,
    session_id: str = None,
    user_id: str = None,
    conversation_id: str = None,
    image_base64: str = None,  # Base64-encoded image
    image_url: str = None,  # S3 URL of uploaded image
    pending_id: str = None  # Unique ID for cancel tracking
) -> dict:
    """
    Get chatbot response (core logic for both CLI and API).
    
    Args:
        message: User's message
        mode: Chat mode ("english", "chamorro", or "learn")
        conversation_length: Number of messages so far
        session_id: Session identifier for tracking conversations
        user_id: Optional user ID from Clerk authentication
        conversation_id: Optional conversation ID to attach message to
        image_base64: Optional base64-encoded image for vision analysis
        image_url: Optional S3 URL of uploaded image (for logging)
        pending_id: Optional unique ID for tracking cancellation
    
    Returns:
        dict: {
            "response": str,
            "sources": list[dict],
            "used_rag": bool,
            "used_web_search": bool,
            "response_time": float,
            "cancelled": bool
        }
    """
    start_time = time.time()
    
    # Helper to build early cancelled response and log the user message
    def early_cancelled_response(log_user_message: bool = True):
        response_time = time.time() - start_time
        
        # Still save the user's message with a "cancelled" response (Option B behavior)
        if log_user_message:
            log_conversation(
                user_message=message,
                bot_response="[Message was cancelled by user]",
                mode=mode,
                sources=[],
                used_rag=False,
                used_web_search=False,
                response_time=response_time,
                session_id=session_id,
                user_id=user_id,
                conversation_id=conversation_id,
                image_url=image_url
            )
        
        cleanup_cancelled_message(pending_id)
        return {
            "response": "[Message was cancelled by user]",
            "sources": [],
            "used_rag": False,
            "used_web_search": False,
            "response_time": response_time,
            "cancelled": True
        }
    
    # Check for early cancellation before starting any expensive operations
    if is_message_cancelled(pending_id):
        print(f"⚠️  Message {pending_id} cancelled before processing started")
        return early_cancelled_response()
    
    # Get mode configuration
    mode_config = MODE_PROMPTS.get(mode, MODE_PROMPTS["english"])
    
    # Check if we should use web search
    use_web, search_type = should_use_web_search(message)
    web_context = ""
    
    if use_web:
        # Check for cancellation before web search
        if is_message_cancelled(pending_id):
            print(f"⚠️  Message {pending_id} cancelled before web search")
            return early_cancelled_response()
        search_result = web_search(message, search_type=search_type, max_results=3)
        if search_result["success"] and search_result["results"]:
            web_context = format_search_results(search_result)
    
    # Check for cancellation before RAG search
    if is_message_cancelled(pending_id):
        print(f"⚠️  Message {pending_id} cancelled before RAG search")
        return early_cancelled_response()
    
    # Get RAG context
    rag_context, sources = get_rag_context(message, conversation_length)
    used_rag = bool(rag_context)
    
    # Build system prompt
    system_prompt = mode_config["prompt"]
    
    # Add document analysis instructions if image is present
    if image_base64:
        system_prompt += """

DOCUMENT ANALYSIS MODE:
You are analyzing a Chamorro language document/text via an uploaded image.
Be thorough and proactive - provide a COMPLETE analysis in ONE response!

Provide the following in a well-organized format:

1. **FULL TRANSCRIPTION**
   - Type out all visible Chamorro text exactly as shown
   - Maintain the original structure and formatting

2. **ENGLISH TRANSLATION**
   - Translate the complete text to English
   - Keep the same structure and organization

3. **KEY INFORMATION EXTRACTION** (Be proactive!)
   - 📅 **Dates and Times**: List ALL dates, deadlines, or time-related information
   - 🎯 **Events/Activities**: What events, meetings, or activities are mentioned?
   - 📞 **Contact Info**: Phone numbers, emails, websites, addresses
   - ⚠️ **Important Notices**: Warnings, requirements, or critical information
   - 📍 **Locations**: Places, addresses, or venues mentioned
   - 👥 **Names**: People, organizations, or entities referenced

4. **GRAMMAR & CULTURAL NOTES**
   - Explain interesting Chamorro grammar structures
   - Provide cultural context if relevant
   - Clarify any idiomatic expressions or cultural references

5. **SUMMARY**
   - Brief overview of the document's purpose
   - Who it's for and what action (if any) is needed
   - Key takeaways

**Important Guidelines:**
- If text is unclear or partially visible, mention which parts you're uncertain about and why
- If it appears to be homework, help explain the concepts and guide learning (don't just give direct answers)
- Be thorough but friendly and conversational in your explanation
- Don't make users ask follow-up questions for information that's visible in the image!
"""
    
    # Add RAG context if available
    if rag_context:
        system_prompt += f"\n\n{rag_context}"
    
    # Add web search context if available
    if web_context:
        system_prompt += f"\n\n{web_context}"
    
    # Build conversation history
    history = [
        {"role": "system", "content": system_prompt}
    ]
    
    # Retrieve and add past conversation history (last 10 message pairs)
    if session_id:
        past_messages = get_conversation_history(session_id, max_messages=10)
        history.extend(past_messages)
        
        # Update conversation_length for RAG decisions
        conversation_length = len(past_messages) // 2  # Divide by 2 to get message pairs
    
    # Build user message (text + optional image)
    if image_base64:
        # Vision message with image
        user_message = {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": message or "What does this say in Chamorro?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_base64}",
                        "detail": "low"  # Cost-effective for text recognition
                    }
                }
            ]
        }
    else:
        # Regular text-only message
        user_message = {"role": "user", "content": message}
    
    # Add current user message
    history.append(user_message)
    
    # Check for cancellation before the expensive GPT call
    if is_message_cancelled(pending_id):
        print(f"⚠️  Message {pending_id} cancelled before GPT call")
        return early_cancelled_response()
    
    # Get LLM response
    # Use vision-capable model if image is present and current model doesn't support vision
    request_client, request_model = get_client_for_request(has_image=bool(image_base64))
    
    try:
        response = request_client.chat.completions.create(
            model=request_model,
            temperature=0.7,
            messages=history
        )
        
        response_text = response.choices[0].message.content
        
    except Exception as e:
        response_text = f"Error: {str(e)}"
        sources = []
        used_rag = False
        use_web = False
    
    # Calculate response time
    response_time = time.time() - start_time
    
    # Format sources for API
    formatted_sources = [
        {"name": source[0], "page": source[1] if len(source) > 1 else None}
        for source in sources
    ]
    
    # OPTION B: Only show sources if they're actually relevant to the query
    message_lower = message.lower().strip()
    should_show_sources = (
        used_rag and 
        len(formatted_sources) > 0 and
        len(message.strip()) > 8 and
        any(word in message_lower for word in [
            'chamorro', 'chamoru', 'translate', 'mean', 'word', 'say', 'phrase',
            'definition', 'grammar', 'pronounce', 'spell', 'language',
            'how', 'what', 'why', 'where', 'when', 'who', 'which',
            'tell me', 'explain', 'teach', 'learn', 'example',
            'culture', 'history', 'tradition', 'people', 'guam', 'island',
            'food', 'fiesta', 'family', 'story', 'legend',
        ])
    )
    
    # Apply source filtering
    if not should_show_sources:
        formatted_sources = []
        used_rag = False
    
    # Check if this message was cancelled before saving
    was_cancelled = is_message_cancelled(pending_id)
    
    if was_cancelled:
        # Save user message with cancelled indicator (Option B behavior)
        print(f"⚠️  Message {pending_id} was cancelled - saving user message with cancelled response")
        log_conversation(
            user_message=message,
            bot_response="[Message was cancelled by user]",
            mode=mode,
            sources=[],
            used_rag=used_rag,
            used_web_search=use_web,
            response_time=response_time,
            session_id=session_id,
            user_id=user_id,
            conversation_id=conversation_id,
            image_url=image_url
        )
        cleanup_cancelled_message(pending_id)
        return {
            "response": "[Message was cancelled by user]",
            "sources": [],
            "used_rag": used_rag,
            "used_web_search": use_web,
            "response_time": response_time,
            "cancelled": True
        }
    
    # Log the conversation (only if not cancelled)
    log_conversation(
        user_message=message,
        bot_response=response_text,
        mode=mode,
        sources=formatted_sources,
        used_rag=used_rag,
        used_web_search=use_web,
        response_time=response_time,
        session_id=session_id,
        user_id=user_id,
        conversation_id=conversation_id,
        image_url=image_url
    )
    
    # Cleanup pending_id tracking
    cleanup_cancelled_message(pending_id)
    
    return {
        "response": response_text,
        "sources": formatted_sources,
        "used_rag": used_rag,
        "used_web_search": use_web,
        "response_time": response_time,
        "cancelled": False
    }


def get_chatbot_response_stream(
    message: str,
    mode: str = "english",
    conversation_length: int = 0,
    session_id: str = None,
    user_id: str = None,
    conversation_id: str = None,
    image_base64: str = None,
    image_url: str = None,
    pending_id: str = None
):
    """
    Streaming version of get_chatbot_response.
    
    Yields chunks of the response as they are generated by the LLM.
    
    Yields:
        dict: Either a chunk {"type": "chunk", "content": "..."} 
              or metadata {"type": "metadata", "sources": [...], "used_rag": bool, ...}
    """
    start_time = time.time()
    
    # Check for early cancellation
    if is_message_cancelled(pending_id):
        yield {"type": "cancelled", "content": "[Message was cancelled by user]"}
        cleanup_cancelled_message(pending_id)
        return
    
    # Get mode configuration
    mode_config = MODE_PROMPTS.get(mode, MODE_PROMPTS["english"])
    
    # Check if we should use web search
    use_web, search_type = should_use_web_search(message)
    web_context = ""
    
    if use_web:
        if is_message_cancelled(pending_id):
            yield {"type": "cancelled", "content": "[Message was cancelled by user]"}
            cleanup_cancelled_message(pending_id)
            return
        search_result = web_search(message, search_type=search_type, max_results=3)
        if search_result["success"] and search_result["results"]:
            web_context = format_search_results(search_result)
    
    # Check for cancellation before RAG
    if is_message_cancelled(pending_id):
        yield {"type": "cancelled", "content": "[Message was cancelled by user]"}
        cleanup_cancelled_message(pending_id)
        return
    
    # Get RAG context
    rag_context, sources = get_rag_context(message, conversation_length)
    used_rag = bool(rag_context)
    
    # Build system prompt
    system_prompt = mode_config["prompt"]
    
    # Add document analysis instructions if image is present
    if image_base64:
        system_prompt += """

DOCUMENT ANALYSIS MODE:
You are analyzing a Chamorro language document/text via an uploaded image.
Be thorough and proactive - provide a COMPLETE analysis in ONE response!

Provide the following in a well-organized format:

1. **FULL TRANSCRIPTION** - Type out all visible Chamorro text exactly as shown
2. **ENGLISH TRANSLATION** - Translate the complete text to English
3. **KEY INFORMATION EXTRACTION** - Dates, events, contacts, locations, names
4. **GRAMMAR & CULTURAL NOTES** - Explain interesting structures
5. **SUMMARY** - Brief overview of the document's purpose
"""
    
    # Add RAG context if available
    if rag_context:
        system_prompt += f"\n\n{rag_context}"
    
    # Add web search context if available
    if web_context:
        system_prompt += f"\n\n{web_context}"
    
    # Build conversation history
    history = [{"role": "system", "content": system_prompt}]
    
    # Retrieve past conversation history
    if session_id:
        past_messages = get_conversation_history(session_id, max_messages=10)
        history.extend(past_messages)
        conversation_length = len(past_messages) // 2
    
    # Build user message
    if image_base64:
        user_message = {
            "role": "user",
            "content": [
                {"type": "text", "text": message or "What does this say in Chamorro?"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}", "detail": "low"}}
            ]
        }
    else:
        user_message = {"role": "user", "content": message}
    
    history.append(user_message)
    
    # Check for cancellation before GPT call
    if is_message_cancelled(pending_id):
        yield {"type": "cancelled", "content": "[Message was cancelled by user]"}
        cleanup_cancelled_message(pending_id)
        return
    
    # Format sources for metadata
    formatted_sources = [
        {"name": source[0], "page": source[1] if len(source) > 1 else None}
        for source in sources
    ]
    
    # OPTION B: Only show sources if they're actually relevant to the query
    # This prevents showing irrelevant dictionary sources for casual messages
    message_lower = message.lower().strip()
    should_show_sources = (
        used_rag and 
        len(formatted_sources) > 0 and
        len(message.strip()) > 8 and  # Message has some substance (not just "test", "hi")
        any(word in message_lower for word in [
            # Language/translation keywords
            'chamorro', 'chamoru', 'translate', 'mean', 'word', 'say', 'phrase',
            'definition', 'grammar', 'pronounce', 'spell', 'language',
            # Question keywords
            'how', 'what', 'why', 'where', 'when', 'who', 'which',
            'tell me', 'explain', 'teach', 'learn', 'example',
            # Culture/topic keywords  
            'culture', 'history', 'tradition', 'people', 'guam', 'island',
            'food', 'fiesta', 'family', 'story', 'legend',
        ])
    )
    
    # Send metadata first (sources, rag status, etc.)
    yield {
        "type": "metadata",
        "sources": formatted_sources if should_show_sources else [],
        "used_rag": used_rag and should_show_sources,  # Only mark as used_rag if showing sources
        "used_web_search": use_web
    }
    
    # Stream LLM response
    # Use vision-capable model if image is present and current model doesn't support vision
    request_client, request_model = get_client_for_request(has_image=bool(image_base64))
    
    full_response = ""
    try:
        stream = request_client.chat.completions.create(
            model=request_model,
            temperature=0.7,
            messages=history,
            stream=True  # Enable streaming!
        )
        
        for chunk in stream:
            # Check for cancellation during streaming
            if is_message_cancelled(pending_id):
                yield {"type": "cancelled", "content": "[Message was cancelled by user]"}
                # Log partial response as cancelled
                log_conversation(
                    user_message=message,
                    bot_response="[Message was cancelled by user]",
                    mode=mode,
                    sources=formatted_sources,
                    used_rag=used_rag,
                    used_web_search=use_web,
                    response_time=time.time() - start_time,
                    session_id=session_id,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    image_url=image_url
                )
                cleanup_cancelled_message(pending_id)
                return
            
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                yield {"type": "chunk", "content": content}
        
    except Exception as e:
        yield {"type": "error", "content": f"Error: {str(e)}"}
        cleanup_cancelled_message(pending_id)
        return
    
    # Calculate response time
    response_time = time.time() - start_time
    
    # Log the complete conversation
    log_conversation(
        user_message=message,
        bot_response=full_response,
        mode=mode,
        sources=formatted_sources,
        used_rag=used_rag,
        used_web_search=use_web,
        response_time=response_time,
        session_id=session_id,
        user_id=user_id,
        conversation_id=conversation_id,
        image_url=image_url
    )
    
    cleanup_cancelled_message(pending_id)
    
    # Send completion signal with response time
    yield {
        "type": "done",
        "response_time": response_time
    }

