"""
Chatbot Service - Core logic extracted from CLI

This module contains the core chatbot logic that can be used by both
the CLI application and the FastAPI service.
"""

import time
import os
import json
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# Add parent directory to path for root-level imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# DON'T import heavy modules at startup!
# Lazy-load them when needed to save memory on free tier
# from chamorro_rag import rag
from web_search_tool import web_search, format_search_results

# Load environment
load_dotenv()

# Initialize OpenAI client
llm = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
)

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
            SELECT user_message, bot_response, timestamp
            FROM (
                SELECT user_message, bot_response, timestamp
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
        
        # Build conversation history (already in chronological order)
        history = []
        for user_msg, bot_msg, timestamp in rows:
            history.append({"role": "user", "content": user_msg})
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
    session_id: str = None
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
    """
    try:
        import psycopg
        
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL", "postgresql://localhost/chamorro_rag")
        
        # Connect to database
        conn = psycopg.connect(database_url)
        cursor = conn.cursor()
        
        # Insert conversation log
        cursor.execute("""
            INSERT INTO conversation_logs (
                session_id, mode, user_message, bot_response,
                sources_used, used_rag, used_web_search, response_time_seconds
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            session_id,
            mode,
            user_message,
            bot_response,
            json.dumps(sources),  # JSONB field
            used_rag,
            used_web_search,
            round(response_time, 2)
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
    """
    import re
    
    user_lower = user_input.lower().strip()
    
    # Always use RAG for Chamorro language/grammar questions
    language_indicators = [
        'chamorro', 'chamoru', 'how do i', 'how to', 'what is', 'what does',
        'translate', 'say in', 'mean', 'definition', 'grammar', 'word', 'phrase'
    ]
    if any(indicator in user_lower for indicator in language_indicators):
        return True, "full"
    
    # Skip RAG for simple greetings (first few messages)
    if conversation_length < 3:
        greeting_patterns = [
            r'^(hi|hello|hey|hafa adai|good (morning|afternoon|evening))[\s\?\.!]*$',
            r'^(thank(s| you)|ok|okay|cool|nice|great|got it)[\s\?\.!]*$'
        ]
        for pattern in greeting_patterns:
            if re.search(pattern, user_lower):
                return True, "light"
    
    # Skip RAG for meta-requests
    meta_patterns = ['summarize', 'summary', 'recap', 'review']
    if any(pattern in user_lower for pattern in meta_patterns):
        return False, None
    
    # Default: Use full RAG
    return True, "full"


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
        # Lazy-load RAG module only when needed (saves memory on startup)
        from chamorro_rag import rag
        
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
    session_id: str = None
) -> dict:
    """
    Get chatbot response (core logic for both CLI and API).
    
    Args:
        message: User's message
        mode: Chat mode ("english", "chamorro", or "learn")
        conversation_length: Number of messages so far
        session_id: Session identifier for tracking conversations
    
    Returns:
        dict: {
            "response": str,
            "sources": list[dict],
            "used_rag": bool,
            "used_web_search": bool,
            "response_time": float
        }
    """
    start_time = time.time()
    
    # Get mode configuration
    mode_config = MODE_PROMPTS.get(mode, MODE_PROMPTS["english"])
    
    # Check if we should use web search
    use_web, search_type = should_use_web_search(message)
    web_context = ""
    
    if use_web:
        search_result = web_search(message, search_type=search_type, max_results=3)
        if search_result["success"] and search_result["results"]:
            web_context = format_search_results(search_result)
    
    # Get RAG context
    rag_context, sources = get_rag_context(message, conversation_length)
    used_rag = bool(rag_context)
    
    # Build system prompt
    system_prompt = mode_config["prompt"]
    
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
    
    # Add current user message
    history.append({"role": "user", "content": message})
    
    # Get LLM response
    try:
        response = llm.responses.create(
            model="gpt-4o-mini",
            temperature=0.7,
            input=history
        )
        
        response_text = response.output_text
        
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
    
    # Log the conversation
    log_conversation(
        user_message=message,
        bot_response=response_text,
        mode=mode,
        sources=formatted_sources,
        used_rag=used_rag,
        used_web_search=use_web,
        response_time=response_time,
        session_id=session_id
    )
    
    return {
        "response": response_text,
        "sources": formatted_sources,
        "used_rag": used_rag,
        "used_web_search": use_web,
        "response_time": response_time
    }

