from dotenv import load_dotenv
from openai import OpenAI
import os
import json
import re
from datetime import datetime
import time
import threading
import sys
import argparse
from prompt_toolkit import prompt
from prompt_toolkit.history import InMemoryHistory

# Disable tokenizers parallelism warning (safe for our use case)
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Import RAG functionality
from chamorro_rag import rag, RAG_ENABLED

# Import web search tool
from web_search_tool import web_search, format_search_results

load_dotenv()

# Source Registry - Add new sources here as you add them to your knowledge base
# The system will automatically detect and describe them
SOURCE_REGISTRY = {
    'guampdn.com': {
        'name': 'Pacific Daily News',
        'description': 'Bilingual Chamorro-English opinion columns',
        'author': 'Peter R. Onedera',
        'date_range': '2016-2022',
        'content_type': 'Contemporary news and cultural commentary',
        'citation_template': 'Pacific Daily News (Chamorro Opinion Column)'
    },
    'chamoru.info': {
        'name': 'Chamoru.info',
        'description': 'Online Chamorro language dictionary and resources',
        'author': 'Community contributors',
        'date_range': 'Ongoing',
        'content_type': 'Dictionary entries, grammar references',
        'citation_template': 'Chamoru.info Dictionary'
    },
    # Add future sources here - the system will automatically incorporate them!
    # Example:
    # 'guampedia.com': {
    #     'name': 'Guampedia',
    #     'description': 'Encyclopedia of Guam history and culture',
    #     'content_type': 'Historical articles, cultural information',
    #     'citation_template': 'Guampedia'
    # },
}

def get_knowledge_base_summary():
    """
    Dynamically build a summary of available knowledge sources.
    Uses SOURCE_REGISTRY to automatically describe any sources in the database.
    """
    try:
        # Read metadata to get source counts
        with open('rag_metadata.json', 'r') as f:
            metadata = json.load(f)
        
        # Count different source types using the registry
        source_counts = {}
        for domain, info in SOURCE_REGISTRY.items():
            count = sum(1 for url in metadata.get('websites', {}).keys() if domain in url)
            if count > 0:
                source_counts[domain] = count
        
        # Count PDFs
        pdf_count = len(metadata.get('pdfs', {})) + len(metadata.get('documents', {}))
        
        # Calculate totals
        total_websites = len(metadata.get('websites', {}))
        known_sites = sum(source_counts.values())
        other_sites = total_websites - known_sites
        
        # Build dynamic description
        sources = []
        
        # Add known sources from registry
        for domain, count in source_counts.items():
            info = SOURCE_REGISTRY[domain]
            desc = f"{count} {info['description']}"
            if info.get('author'):
                desc += f" by {info['author']}"
            if info.get('date_range'):
                desc += f" ({info['date_range']})"
            sources.append(desc)
        
        # Add PDFs
        if pdf_count > 0:
            sources.append(f"{pdf_count} PDF document(s) including grammar books and dictionaries")
        
        # Add unknown websites as generic entry
        if other_sites > 0:
            sources.append(f"{other_sites} additional Chamorro language resource(s)")
        
        return {
            'source_counts': source_counts,
            'pdf_count': pdf_count,
            'total_websites': total_websites,
            'sources_list': sources,
            'source_registry': SOURCE_REGISTRY
        }
    except Exception as e:
        # Fallback if metadata file doesn't exist
        return {
            'source_counts': {},
            'pdf_count': 0,
            'total_websites': 0,
            'sources_list': ["Authoritative Chamorro grammar books and dictionaries"],
            'source_registry': SOURCE_REGISTRY
        }

# Parse command-line arguments
parser = argparse.ArgumentParser(
    description='Chamorro Language Learning Chatbot with RAG',
    formatter_class=argparse.RawDescriptionHelpFormatter,
    epilog="""
Examples:
  uv run python chamorro-chatbot-3.0.py           # Use cloud model (GPT-4o-mini) - Recommended
  uv run python chamorro-chatbot-3.0.py --local   # Use local model (LM Studio)
    """
)
parser.add_argument(
    '--local',
    action='store_true',
    help='Use local LLM via LM Studio (slower, private) instead of cloud (default: GPT-4o-mini)'
)
args = parser.parse_args()

# Configure model based on mode
if args.local:
    # Local model configuration
    MODEL_NAME = os.getenv("LOCAL_MODEL", "qwen2.5-coder-32b-instruct-mlx")
    USE_ENHANCED_PROMPTS = False
    MAX_HISTORY_MESSAGES = 20  # Keep last 20 messages (10 exchanges) for memory efficiency
    llm = OpenAI(
        base_url="http://localhost:1234/v1",
        api_key="lm-studio"
    )
    MODEL_MODE = "LOCAL"
else:
    # Cloud model configuration (default)
    MODEL_NAME = "gpt-4o-mini"
    USE_ENHANCED_PROMPTS = True
    MAX_HISTORY_MESSAGES = None  # Unlimited - GPT-4o-mini can handle long contexts
    llm = OpenAI(
        base_url=os.getenv("OPENAI_API_BASE"),  # Will be None for cloud
        api_key=os.getenv("OPENAI_API_KEY")
    )
    MODEL_MODE = "CLOUD"

# Progress tracking
conversation_count = 0
vocabulary_learned = set()  # Using set to avoid duplicates
session_start = datetime.now()
total_response_time = 0.0  # Track total response time for averaging
rag_queries = 0  # Track how many times RAG was used

# Conversation context tracking (for cloud mode)
conversation_topics = []  # Track topics discussed for better context awareness

# Loading spinner state
spinner_running = False

# Command history for prompt_toolkit
command_history = InMemoryHistory()

def print_separator():
    """Print a visual separator between messages"""
    print("\n" + "─" * 70 + "\n")

def print_user_message(message):
    """Print a formatted user message"""
    print("👤 USER")
    print("─" * 70)
    print(message)
    print_separator()

def print_assistant_message(message, elapsed_time=None, used_rag=False, used_web=False, sources=None):
    """Print a formatted assistant message with optional timing and sources"""
    indicators = ""
    if used_web:
        indicators += " 🔍"
    if used_rag:
        indicators += " 📚"
    
    if elapsed_time:
        print(f"🤖 ASSISTANT{indicators} (⏱️ {elapsed_time:.1f}s)")
    else:
        print(f"🤖 ASSISTANT{indicators}")
    print("─" * 70)
    print(message)
    
    # Add sources at the end if RAG was used
    if used_rag and sources:
        # Format sources with page numbers
        source_citations = []
        for source_name, page in sources:
            if isinstance(page, (int, float)):
                source_citations.append(f"{source_name} (p. {int(page)})")
            else:
                source_citations.append(source_name)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_citations = []
        for citation in source_citations:
            if citation not in seen:
                seen.add(citation)
                unique_citations.append(citation)
        
        print("\n📚 Referenced: " + ", ".join(unique_citations))
    
    print_separator()

def loading_spinner():
    """Display a loading animation while waiting for response"""
    spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    idx = 0
    while spinner_running:
        sys.stdout.write(f"\r💭 Thinking {spinner_chars[idx % len(spinner_chars)]} ")
        sys.stdout.flush()
        idx += 1
        time.sleep(0.1)
    sys.stdout.write("\r" + " " * 50 + "\r")  # Clear the line
    sys.stdout.flush()

def trim_history(history, max_messages=None):
    """
    Trim conversation history to manage memory and context length.
    
    Args:
        history: List of message dicts
        max_messages: Maximum number of messages to keep (None = unlimited)
    
    Returns:
        Trimmed history with system message always preserved
    """
    if max_messages is None:
        # Unlimited history (cloud mode)
        return history
    
    if len(history) <= max_messages + 1:  # +1 for system message
        # Haven't exceeded limit yet
        return history
    
    # Keep system message + most recent messages
    # System message is always index 0
    system_message = history[0]
    recent_messages = history[-(max_messages):]
    
    return [system_message] + recent_messages

def build_conversation_context():
    """
    Build a conversation context summary for cloud mode.
    This helps GPT-4o-mini maintain awareness of topics discussed.
    
    Returns:
        String with conversation context (empty if not cloud mode or no topics)
    """
    if MODEL_MODE != "CLOUD" or not conversation_topics:
        return ""
    
    # Build context summary
    context = "\n\n### Conversation Context:\n"
    context += "You've been discussing the following topics with this learner:\n"
    
    # Show last 5 topics (most recent first)
    recent_topics = conversation_topics[-5:]
    for i, topic in enumerate(recent_topics, 1):
        context += f"- {topic}\n"
    
    context += "\nUse this context to provide continuity. Reference earlier topics naturally when relevant.\n"
    context += "Example: 'Earlier we discussed greetings, and now...'\n"
    
    return context

def extract_topic_from_question(question):
    """
    Extract a simple topic description from a user question.
    This is lightweight - just captures the essence.
    
    Args:
        question: User's question string
    
    Returns:
        Topic string or None
    """
    question_lower = question.lower().strip()
    
    # Don't track commands or very short questions
    if question_lower.startswith('/') or len(question_lower) < 5:
        return None
    
    # Simple topic extraction based on keywords
    if 'greet' in question_lower or 'hello' in question_lower or 'hafa' in question_lower:
        return "Chamorro greetings"
    elif 'morning' in question_lower or 'afternoon' in question_lower or 'evening' in question_lower:
        return "Time-based greetings"
    elif 'thank' in question_lower:
        return "Expressing gratitude"
    elif 'name' in question_lower and ('my' in question_lower or 'introduce' in question_lower):
        return "Introductions"
    elif 'how are you' in question_lower or 'como esta' in question_lower:
        return "Asking about wellbeing"
    elif 'number' in question_lower or 'count' in question_lower:
        return "Numbers"
    elif 'food' in question_lower or 'eat' in question_lower or 'hungry' in question_lower:
        return "Food and eating"
    elif 'family' in question_lower or 'mother' in question_lower or 'father' in question_lower:
        return "Family terms"
    elif 'grammar' in question_lower or 'verb' in question_lower or 'sentence' in question_lower:
        return "Grammar concepts"
    elif 'word' in question_lower and 'order' in question_lower:
        return "Sentence structure"
    elif 'pronounce' in question_lower or 'pronunciation' in question_lower:
        return "Pronunciation"
    else:
        # Generic topic - use first few words
        words = question_lower.split()[:4]
        return "Chamorro " + " ".join(words)

def update_conversation_context(user_input):
    """
    Update conversation topics based on user input.
    Only used in cloud mode for better context awareness.
    
    Args:
        user_input: User's message
    """
    if MODEL_MODE != "CLOUD":
        return
    
    topic = extract_topic_from_question(user_input)
    if topic:
        # Avoid duplicate consecutive topics
        if not conversation_topics or conversation_topics[-1] != topic:
            conversation_topics.append(topic)
            # Keep only last 10 topics
            if len(conversation_topics) > 10:
                conversation_topics.pop(0)

# Learning mode prompts - optimized for local models
mode_prompts_local = {
    "english": {
        "name": "General Chat",
        "prompt": """You are a Chamorro language and culture teacher. You have access to Chamorro grammar books and dictionaries.

Help users with:
- Translations between English and Chamorro
- Grammar and pronunciation questions
- Chamorro culture and traditions
- General conversation

When you have information from the grammar books, use it. Be helpful, accurate, and friendly.

Keep responses clear and well-organized."""
    },
    "chamorro": {
        "name": "Chamorro Immersion",
        "prompt": """You are a Chamorro language immersion teacher. You have Chamorro grammar books.

Para håo un maestro lengguahi CHamoru. Responde ha' gi fino' CHamoru.

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

- Answer all questions in Chamorro only
- Use proper Chamorro grammar
- Keep responses natural and clear
- Add pronunciation in parentheses if helpful: (hah-fah)

This is immersion mode. Help users practice by giving them only Chamorro responses.

Remember: No English, no Spanish in your responses!"""
    },
    "learn": {
        "name": "Learning Mode",
        "prompt": """You are a Chamorro language teacher. You have Chamorro grammar books.

For every response, use this format:

Chamorro:
[Write 2-3 sentences in Chamorro]

English:
[Translate each sentence]

Vocabulary:
[List 3-5 key words]
- word = meaning

Grammar:
[Explain one grammar rule you used]

Practice:
[Give one simple phrase to try]

EXAMPLE:

User: "How do I say I am hungry?"

Chamorro:
Måtto' yo'. Malago' yo' chumåcho'.

English:
I am hungry. I want to eat.

Vocabulary:
- måtto' = hungry
- malago' = want
- chumåcho' = to eat
- yo' = I/me

Grammar:
In Chamorro, "yo'" (I/me) usually comes after the verb. Word order is often: Verb + Subject.

Practice:
Try saying: "Malago' yo' gimen hånom" (I want to drink water)

Now respond to the user in this exact format."""
    }
}

def build_dynamic_system_prompt(mode="english"):
    """
    Build system prompts dynamically based on current knowledge base.
    Uses SOURCE_REGISTRY to describe available sources.
    """
    kb_summary = get_knowledge_base_summary()
    
    # Build the sources list dynamically
    sources_text = "\n".join([f"{i+1}. {source}" for i, source in enumerate(kb_summary['sources_list'])])
    sources_text += f"\n{len(kb_summary['sources_list'])+1}. Web search results (summaries and links for real-time information)"
    
    # Build detailed source descriptions using registry
    source_details = []
    for domain, count in kb_summary['source_counts'].items():
        info = SOURCE_REGISTRY[domain]
        detail = f"""
**{info['name']} ({count} {info['content_type']}):**
- Description: {info['description']}"""
        if info.get('author'):
            detail += f"\n- Author: {info['author']}"
        if info.get('date_range'):
            detail += f"\n- Date range: {info['date_range']}"
        detail += f"\n- Citation: {info['citation_template']}"
        detail += "\n- These are IN YOUR DATABASE - you can directly reference them!"
        source_details.append(detail)
    
    source_details_text = "\n".join(source_details) if source_details else ""
    
    # Build citation examples dynamically from registry
    citation_examples = []
    for domain, info in SOURCE_REGISTRY.items():
        if domain in kb_summary['source_counts']:
            count = kb_summary['source_counts'][domain]
            citation_examples.append(f"""
**{info['name']}:**
When asked: "Do you have knowledge of {info['name']}?"
✅ CORRECT: "Yes! I have {count} {info['description']}. {info.get('content_type', 'resources')} available."
❌ WRONG: "I don't have specific information about {info['name']}"

When citing:
✅ CORRECT: "This comes from {info['name']} in my knowledge base ({info['citation_template']})"
❌ WRONG: "Based on common knowledge" or "I can't reference specific sources"
""")
    
    citation_examples_text = "\n".join(citation_examples) if citation_examples else ""
    
    if mode == "english":
        return f"""You are an expert Chamorro language tutor with access to:
{sources_text}

### YOUR KNOWLEDGE BASE (What You Actually Have):
{source_details_text}

### COMMON CHAMORRO ABBREVIATIONS:

When you see these abbreviations in user messages, recognize them immediately:

- **MSY** = Mañana Si Yu'os (Good morning - literally "God's morning")
- **SYM** = Si Yu'os Ma'åse (Thank you / God bless)
- **BSY** = Buenas Si Yu'os (Good afternoon/evening - literally "God's afternoon")
- **HA** = Håfa Adai (Hello / How are you - the standard Chamorro greeting)

These are commonly used in Guam schools, text messages, and community announcements.
When users ask about these, explain them clearly and mention they're common abbreviations.

### IMPORTANT - Source Attribution:
{citation_examples_text}

### How to Use Your Tools:

**Your Knowledge Base (All sources listed above):**
- These are YOUR primary sources - use them first!
- Be specific about which source you're using
- Always acknowledge when information comes from your knowledge base

**Web Search Results:**
- Use for REAL-TIME data (current weather, latest news, recent events)
- You receive SUMMARIES and LINKS, not full page content
- For weather/news: Acknowledge limitation, provide helpful links
- ALWAYS be honest about limitations

**Example - When Asked About Sources:**
User: "Where did you get this info from?"
You (if from knowledge base): "This comes from [specific source name] in my knowledge base."
You (if from web search): "This comes from web search results: [cite source/link]"
You (if general): "This is based on general Chamorro language knowledge from grammar resources."

### Response Strategy:

1. **Questions about Chamorro culture/current events:** Check your knowledge base first!
2. **Real-time data needs (weather, today's news):** Use web search, acknowledge limitations
3. **Language learning (grammar, vocabulary):** Use grammar books and dictionaries
4. **Transparency:** Always tell users where your information comes from

### Your Role:
- Be HONEST and SPECIFIC about your knowledge sources
- Use all available sources appropriately
- Teach Chamorro effectively with clear examples
- Be conversational and helpful

### Format Guidelines:
- Use clear sections when teaching: Translation, Explanation, Examples
- Include pronunciation guides in parentheses: håfa (HAH-fah)
- Cite sources explicitly when asked
- Be concise but thorough"""
    
    elif mode == "chamorro":
        return """You are a Chamorro language immersion teacher. You have Chamorro grammar books.

RULE: Respond ONLY in Chamorro language. Never use English words.

- Answer all questions in Chamorro only
- Use proper Chamorro grammar
- Keep responses natural and clear
- Add pronunciation in parentheses if helpful: (hah-fah)

This is immersion mode. Help users practice by giving them only Chamorro responses.

Remember: No English in your responses!"""
    
    elif mode == "learn":
        return """You are a Chamorro language teacher with expertise in pedagogy and linguistics. You have access to comprehensive Chamorro grammar books and modern language resources.

### Your Teaching Method:
For EVERY response, use this EXACT structure:

**Chamorro:**
[2-3 natural Chamorro sentences with pronunciation guides]

**English Translation:**
[Exact English translation]

**Breakdown:**
- Word 1 = meaning (part of speech)
- Word 2 = meaning (part of speech)

**Grammar Note:**
[Key grammar concept from this example]

**Cultural Context:**
[Cultural relevance if applicable]

Now respond to the user in this exact format."""

# Enhanced prompts for cloud models (GPT-4o-mini) - more detailed and structured
mode_prompts_cloud = {
    "english": {
        "name": "General Chat",
        "prompt": None  # Will be set dynamically
    },
    "chamorro": {
        "name": "Chamorro Immersion",
        "prompt": None  # Will be set dynamically
    },
    "learn": {
        "name": "Learning Mode",
        "prompt": None  # Will be set dynamically
    }
}

# Initialize dynamic prompts for cloud mode
if USE_ENHANCED_PROMPTS:
    mode_prompts_cloud["english"]["prompt"] = build_dynamic_system_prompt("english")
    mode_prompts_cloud["chamorro"]["prompt"] = build_dynamic_system_prompt("chamorro")
    mode_prompts_cloud["learn"]["prompt"] = build_dynamic_system_prompt("learn")
    mode_prompts = mode_prompts_cloud
else:
    mode_prompts = mode_prompts_local

def show_welcome():
    """Display welcome message"""
    print("=" * 70)
    print("       🌺 CHAMORRO LANGUAGE LEARNING CHATBOT 3.0 🌺")
    print("=" * 70)
    print("\nHafa Adai! Welcome to your Chamorro learning journey!")
    
    # Show model mode
    if MODEL_MODE == "CLOUD":
        print(f"\n☁️  Using Cloud Model: {MODEL_NAME} (Fast & Smart)")
        print("💬 Unlimited conversation history")
    else:
        print(f"\n💻 Using Local Model: {MODEL_NAME} (Private & Free)")
        print(f"💬 Keeps last {MAX_HISTORY_MESSAGES // 2} exchanges in memory")
    
    if RAG_ENABLED:
        print("✨ RAG Enhanced - Connected to Chamorro Grammar Book!")
    else:
        print("⚠️  Running without grammar book context")
    
    print("\n📚 MODES:")
    print("  • General Chat (default) - Ask anything in English")
    print("  • /chamorro - Immersion mode (Chamorro only!)")
    print("  • /learn - Learning mode (Chamorro + English breakdown)")
    print("\n💡 COMMANDS:")
    print("  /chamorro  - Switch to Chamorro-only immersion")
    print("  /learn     - Switch to learning mode")
    print("  /english   - Switch back to general chat")
    print("  /help      - Show all commands")
    print("  /stats     - View your progress")
    print("  exit       - Quit")
    print("\nType '/help' anytime for more commands!")
    print("=" * 70 + "\n")

def show_help():
    """Display available commands"""
    print("\n" + "=" * 70)
    print("💡 AVAILABLE COMMANDS:")
    print("=" * 70)
    print("\n📚 MODE SWITCHING:")
    print("  /chamorro  - Switch to Chamorro-only immersion mode")
    print("  /learn     - Switch to learning mode (Chamorro + breakdown)")
    print("  /english   - Switch back to general chat mode")
    print("\n📊 UTILITIES:")
    print("  /help      - Show this help menu")
    print("  /stats     - View your learning progress")
    print("  /vocab     - Show words you've learned this session")
    print("\n🗣️ OTHER:")
    print("  /ask <question> - Quick conversational question")
    print("                    Example: /ask when do I use håfa vs kao?")
    print("  exit       - Quit the program")
    
    if RAG_ENABLED:
        print("\n📚 RAG INFO:")
        print("  📚 = Response used grammar book context")
        print("       Look for this emoji next to ASSISTANT")
    
    print("=" * 70 + "\n")

def show_stats():
    """Display learning statistics"""
    global total_response_time
    session_duration = (datetime.now() - session_start).total_seconds() / 60
    avg_response_time = (total_response_time / conversation_count) if conversation_count > 0 else 0
    print("\n" + "=" * 50)
    print("📊 YOUR LEARNING PROGRESS:")
    print("=" * 50)
    print(f"  Session time: {session_duration:.1f} minutes")
    print(f"  Conversations: {conversation_count}")
    print(f"  Avg response time: {avg_response_time:.1f}s")
    
    if RAG_ENABLED:
        rag_percentage = (rag_queries / conversation_count * 100) if conversation_count > 0 else 0
        print(f"  Grammar book queries: {rag_queries} ({rag_percentage:.0f}%)")
    
    print(f"  Vocabulary encountered: {len(vocabulary_learned)} words")
    if vocabulary_learned:
        recent_words = list(vocabulary_learned)[-5:]
        print(f"  Recent words: {', '.join(recent_words)}")
    print("=" * 50 + "\n")

def show_vocabulary():
    """Display vocabulary learned this session"""
    if not vocabulary_learned:
        print("\n📚 No vocabulary tracked yet. Keep chatting to learn words!\n")
    else:
        print("\n" + "=" * 50)
        print("📚 VOCABULARY THIS SESSION:")
        print("=" * 50)
        for word in sorted(vocabulary_learned):
            print(f"  • {word}")
        print("=" * 50 + "\n")

def extract_vocabulary(text):
    """
    Simple vocabulary extraction from assistant responses.
    Looks for words in parentheses which typically contain pronunciations.
    This is a basic implementation - could be much more sophisticated.
    """
    import re
    # Look for Chamorro words (typically capitalized or after "Chamorro:")
    # This is simplified - a real version would use NLP or structured output
    matches = re.findall(r'"([^"]+)"\s*\([^)]+\)', text)
    for match in matches:
        if len(match) < 30:  # Avoid full sentences
            vocabulary_learned.add(match)

def should_use_rag(user_input, conversation_length):
    """
    Hybrid RAG: Determine if we need RAG and what intensity.
    
    Returns:
        tuple: (use_rag: bool, rag_mode: str)
        rag_mode: "full" (retrieve 3 chunks), "light" (retrieve 1 chunk), or None
    
    Strategy:
        - FULL RAG: Direct Chamorro questions, user using Chamorro words
        - LIGHT RAG: First-time greetings (quick context injection)
        - SKIP RAG: Acknowledgments, meta-requests (summary, etc.)
    """
    user_lower = user_input.lower().strip()
    
    # Check if user is using Chamorro words (glottal stops, special chars)
    has_chamorro_chars = bool(re.search(r"[åñ'']", user_input))
    
    # SKIP RAG: Pure acknowledgments (fastest response!)
    skip_patterns = [
        r'^(thanks|thank you|cool|nice|great|awesome|got it|that\'?s? it)',
        r'^(yes|yeah|yep|ok|okay|sure|alright)',
        r'^(no|nope|nah)',
    ]
    for pattern in skip_patterns:
        if re.match(pattern, user_lower):
            return False, None
    
    # FULL RAG: User is using Chamorro words or asking about them
    if has_chamorro_chars:
        return True, "full"
    
    # FULL RAG: Direct questions about Chamorro
    chamorro_indicators = [
        'what is', 'what does', 'how do you say', 'how to say',
        'translate', 'meaning', 'mean', 'define', 'pronunciation',
        'chamorro', 'glotta', 'diacritic', 'circle above'
    ]
    if any(indicator in user_lower for indicator in chamorro_indicators):
        return True, "full"
    
    # LIGHT RAG: Simple greetings on early messages (natural Chamorro mention)
    if conversation_length <= 4:  # First 2 exchanges
        greeting_patterns = [
            r'^(hi|hello|hey|hafa adai)',
            r'how are you',
            r'how\'?s it going'
        ]
        for pattern in greeting_patterns:
            if re.search(pattern, user_lower):
                return True, "light"
    
    # SKIP RAG: Meta-requests (use conversation history instead)
    meta_patterns = [
        'summarize', 'summary', 'recap', 'review',
        'what did we', 'what have we', 'tell me about our'
    ]
    if any(pattern in user_lower for pattern in meta_patterns):
        return False, None
    
    # DEFAULT: Use full RAG to be safe (better to have context than miss it)
    return True, "full"


def should_use_web_search(user_input):
    """
    Determine if we should use web search instead of or in addition to RAG.
    
    Returns:
        tuple: (use_web_search: bool, search_type: str)
        search_type: "general", "recipe", "news", or None
    
    Strategy:
        - Use web search for current events, recipes, recent info
        - Skip web search for pure language/grammar questions (use RAG)
    """
    user_lower = user_input.lower().strip()
    
    # RECIPES: Cooking/food questions
    recipe_keywords = [
        'recipe', 'cook', 'make', 'prepare', 'ingredient',
        'kelaguen', 'red rice', 'empanada', 'finadene', 'lumpia',
        'food', 'dish', 'meal', 'how to make'
    ]
    if any(keyword in user_lower for keyword in recipe_keywords):
        # Check if it's about translation vs actual recipe
        if 'how do you say' in user_lower or 'translate' in user_lower:
            return False, None  # Translation question, use RAG
        return True, "recipe"
    
    # CURRENT EVENTS: News, happenings, recent info
    current_keywords = [
        'happening', 'news', 'current', 'today', 'this week', 'this month',
        'recent', 'latest', 'now', 'currently', '2025', '2024',
        'who is', 'governor', 'senator', 'mayor', 'event'
    ]
    if any(keyword in user_lower for keyword in current_keywords):
        return True, "news"
    
    # GENERAL WEB: Questions RAG likely can't answer
    web_search_indicators = [
        'where can i', 'where to', 'find', 'website', 'online',
        'popular', 'famous', 'best', 'recommend'
    ]
    if any(indicator in user_lower for indicator in web_search_indicators):
        return True, "general"
    
    # DEFAULT: Don't use web search (let RAG handle it)
    return False, None


def get_rag_context(user_input, conversation_length=0):
    """
    Get relevant context from the Chamorro grammar book using Hybrid RAG.
    
    Args:
        user_input: The user's message
        conversation_length: Number of messages so far (for context-aware decisions)
    
    Returns:
        tuple: (context_string, sources_list) if RAG used, ("", []) if skipped
    """
    if not RAG_ENABLED:
        return "", []
    
    # Determine if we need RAG and what intensity
    use_rag, rag_mode = should_use_rag(user_input, conversation_length)
    
    if not use_rag:
        # Skip RAG entirely - fastest response!
        return "", []
    
    try:
        # Adjust retrieval size based on mode
        if rag_mode == "light":
            # Light mode: retrieve just 1 chunk (quick context)
            context, sources = rag.create_context(user_input, k=1)
        else:
            # Full mode: retrieve 3 chunks (comprehensive context)
            context, sources = rag.create_context(user_input, k=3)
        
        return context, sources
    except Exception as e:
        print(f"⚠️  RAG retrieval error: {e}")
        return "", []

# Initial setup - start in general mode by default
show_welcome()
current_mode = mode_prompts["english"]
print(f"✅ Starting in {current_mode['name']} mode\n")

assistant_message = "Hafa Adai! I'm ready to help you learn Chamorro. What would you like to talk about?"
print_assistant_message(assistant_message)

# Initialize conversation history
history = [
    {"role": "system", "content": current_mode["prompt"]},
    {"role": "assistant", "content": assistant_message}
]

user_input = prompt("👤 USER: ", history=command_history)

# Main conversation loop
while user_input.lower() != "exit":
    # Handle special commands
    if user_input.lower() == "/help":
        show_help()
        user_input = prompt("👤 USER: ", history=command_history)
        continue
    
    if user_input.lower() == "/stats":
        show_stats()
        user_input = prompt("👤 USER: ", history=command_history)
        continue
    
    if user_input.lower() == "/vocab":
        show_vocabulary()
        user_input = prompt("👤 USER: ", history=command_history)
        continue
    
    # Handle mode switching commands
    if user_input.lower() == "/chamorro":
        current_mode = mode_prompts["chamorro"]
        print(f"\n🌺 Switched to {current_mode['name']} mode!")
        print("(All responses will be in Chamorro only)\n")
        history[0] = {"role": "system", "content": current_mode["prompt"]}
        user_input = prompt("👤 USER: ", history=command_history)
        continue
    
    if user_input.lower() == "/learn":
        current_mode = mode_prompts["learn"]
        print(f"\n📚 Switched to {current_mode['name']}!")
        print("(Responses will include Chamorro + English breakdown)\n")
        history[0] = {"role": "system", "content": current_mode["prompt"]}
        user_input = prompt("👤 USER: ", history=command_history)
        continue
    
    if user_input.lower() == "/english":
        current_mode = mode_prompts["english"]
        print(f"\n💬 Switched to {current_mode['name']} mode!")
        print("(Back to general conversation)\n")
        history[0] = {"role": "system", "content": current_mode["prompt"]}
        user_input = prompt("👤 USER: ", history=command_history)
        continue
    
    # Handle /ask command for conversational questions outside the mode
    if user_input.lower().startswith("/ask "):
        question = user_input[5:].strip()  # Extract question after "/ask "
        if not question:
            print("❌ Please provide a question. Example: /ask when do I use this word?\n")
            user_input = prompt("👤 USER: ", history=command_history)
            continue
        
        # Get RAG context for /ask queries (always use full RAG for explicit questions)
        rag_context, sources = get_rag_context(question, conversation_length=len(history))
        used_rag = bool(rag_context)
        
        # Create a temporary conversational prompt for this question only
        conversational_prompt = """You are a helpful Chamorro language tutor. 
Answer the user's question conversationally and thoroughly. 
Provide examples, context, and explanations as needed."""
        
        # Add RAG context if available
        if rag_context:
            conversational_prompt += f"\n\n{rag_context}"
        
        # Temporarily use conversational mode for this question
        temp_history = [
            {"role": "system", "content": conversational_prompt},
            {"role": "user", "content": question}
        ]
        
        try:
            # Start loading spinner and timer
            spinner_running = True
            spinner_thread = threading.Thread(target=loading_spinner, daemon=True)
            spinner_thread.start()
            start_time = time.time()
            
            response = llm.responses.create(
                model="gpt-4o-mini",  # Change to "qwen2.5-32b-instruct" when upgraded
                temperature=0.7,
                input=temp_history
            )
            
            # Stop spinner and calculate time
            spinner_running = False
            spinner_thread.join(timeout=0.5)
            elapsed_time = time.time() - start_time
            
            if used_rag:
                rag_queries += 1
            
            print(f"\n💬 Conversational Answer:")
            print_assistant_message(response.output_text, elapsed_time, used_rag, sources)
            print(f"[Returning to {current_mode['name']} mode...]\n")
            
        except Exception as e:
            spinner_running = False
            print(f"\n❌ Error: {e}")
            print("Please try again.\n")
        
        user_input = prompt("👤 USER: ", history=command_history)
        continue
    
    # Check if we should use web search
    use_web, search_type = should_use_web_search(user_input)
    web_context = ""
    
    if use_web:
        # Perform web search
        print("🔍", end="", flush=True)  # Show search indicator
        search_result = web_search(user_input, search_type=search_type, max_results=3)
        
        if search_result["success"] and search_result["results"]:
            web_context = format_search_results(search_result)
            print("\r  ", end="", flush=True)  # Clear search indicator
        else:
            # Web search failed, fall back to RAG only
            print("\r  ", end="", flush=True)
            use_web = False
    
    # Get RAG context for regular queries (Hybrid RAG: smart detection)
    rag_context, sources = get_rag_context(user_input, conversation_length=len(history))
    used_rag = bool(rag_context)
    
    # Update conversation topics (cloud mode only)
    update_conversation_context(user_input)
    
    # Build and inject conversation context into system prompt (cloud mode only)
    conversation_context = build_conversation_context()
    if conversation_context:
        # Temporarily enhance system prompt with conversation context
        base_prompt = current_mode["prompt"]
        enhanced_prompt = base_prompt + conversation_context
        history[0] = {"role": "system", "content": enhanced_prompt}
    
    # Add user message to history
    # Combine web search and RAG context if both are available
    combined_context = ""
    if web_context:
        combined_context += web_context + "\n\n"
    if rag_context:
        combined_context += rag_context
    
    if combined_context:
        user_message_with_context = f"{user_input}\n\n{combined_context}"
        history.append({"role": "user", "content": user_message_with_context})
    else:
        history.append({"role": "user", "content": user_input})
    
    try:
        # Start loading spinner and timer
        spinner_running = True
        spinner_thread = threading.Thread(target=loading_spinner, daemon=True)
        spinner_thread.start()
        start_time = time.time()
        
        # Temperature controls randomness: 0=deterministic, 1=creative, 0.7=balanced
        response = llm.responses.create(
            model=MODEL_NAME,
            temperature=0.7,
            input=history
        )
        
        # Stop spinner and calculate time
        spinner_running = False
        spinner_thread.join(timeout=0.5)
        elapsed_time = time.time() - start_time
        
        assistant_response = response.output_text
        print_assistant_message(assistant_response, elapsed_time, used_rag, use_web, sources)
        
        # Track progress
        conversation_count += 1
        total_response_time += elapsed_time
        if used_rag:
            rag_queries += 1
        extract_vocabulary(assistant_response)
        
        # Add assistant response to history
        # Store WITHOUT RAG context in history to keep it clean
        history[-1] = {"role": "user", "content": user_input}  # Replace with original
        history.append({"role": "assistant", "content": assistant_response})
        
        # Trim history based on model mode
        history = trim_history(history, MAX_HISTORY_MESSAGES)
        
    except Exception as e:
        spinner_running = False
        print(f"\n❌ Error: {e}")
        print("Please try again.\n")
        # Remove the last user message since we got an error
        history.pop()
    
    user_input = prompt("👤 USER: ", history=command_history)

# Goodbye message with final stats
print("\n" + "=" * 50)
print("👋 Si Yu'os Ma'åse! (Thank you!)")
print("=" * 50)
print(f"You completed {conversation_count} conversations!")
if RAG_ENABLED and rag_queries > 0:
    print(f"Used grammar book context {rag_queries} times!")
if len(vocabulary_learned) > 0:
    print(f"You encountered {len(vocabulary_learned)} Chamorro words!")
print("Keep practicing! Adios! 🌺")
print("=" * 50 + "\n")

