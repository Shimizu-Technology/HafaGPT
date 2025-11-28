# 🌺 HåfaGPT - Chamorro Language Learning Platform

A **comprehensive Chamorro language learning application** combining AI tutoring, flashcards, quizzes, vocabulary browser, and progress tracking. Built with **Retrieval-Augmented Generation (RAG)** using 54,000+ chunks from authoritative dictionaries, grammar books, and cultural resources.

> **HåfaGPT has evolved from a simple chatbot into a complete learning platform for self-study and teaching children Chamorro!**

**🆕 LATEST:** Vocabulary Browser with 10,350+ dictionary words, Quiz Review, Dictionary-based flashcards & quizzes! 📚🎴📝

> **📁 See [docs/CODEBASE_STRUCTURE.md](docs/CODEBASE_STRUCTURE.md)** for the complete codebase organization.

## ✨ Features

### 🎓 **Complete Learning Platform**

- 🤖 **AI Chat Tutor** - 3 learning modes:
  - **General Chat** - Ask anything about Chamorro in English
  - **Immersion Mode** (`/chamorro`) - Chamorro-only responses
  - **Learning Mode** (`/learn`) - Chamorro with English breakdowns

- 📚 **Vocabulary Browser** (10,350+ words):
  - **12 Categories** - Greetings, Family, Numbers, Colors, Food, Animals, Body, Nature, Places, Time, Verbs, Phrases
  - **Smart Search** - Diacritic handling ("hanom" finds "hånum"), spelling variants (o↔u)
  - **Pagination** - Load 50 words at a time with "Load More"
  - **Word Details** - Definition, part of speech, examples, TTS pronunciation
  - **API Endpoints** - Categories, search, word of the day, flashcards, quizzes

- 🎴 **Flashcards** (Curated + Dictionary-based):
  - **6 Curated Decks** - Pre-made cards for Greetings, Family, Food, Numbers, Verbs, Phrases
  - **Dictionary Mode** - Generate flashcards from 10,350+ dictionary words
  - **Custom AI Generation** - RAG-powered flashcards tailored to each topic
  - **Save & Track Progress** - Save decks and rate cards (Hard/Good/Easy)
  - **Beautiful UI** - 3D flip animation, swipe gestures, keyboard navigation

- 📝 **Quizzes** (Curated + Dictionary-based):
  - **6 Curated Categories** - Greetings, Family, Numbers, Food, Phrases, Colors
  - **Dictionary Mode** - Generate quizzes from 10,350+ words (unlimited variety)
  - **3 Question Types** - Multiple choice, Type answer, Fill in blank
  - **Quiz Review** - View past attempts with detailed question-by-question breakdown
  - **Smart UX** - "I don't know" button, browser warning on exit, "Try Dictionary Mode" link

- 📅 **Daily Word/Phrase**:
  - **API-Powered** - Deterministic daily rotation from dictionary
  - **TTS Pronunciation** - Hear the word spoken
  - **Examples & Context** - Learn usage in sentences

- 📊 **Progress Dashboard**:
  - **Quiz Tracking** - Database-stored results with detailed answers
  - **Clickable History** - Review any past quiz attempt
  - **Stats** - Total quizzes, average score, best category

### 🎤 **Multimodal Input**

- **Speech-to-Text** - Speak your questions using browser microphone (Web Speech API)
- **Text-to-Speech** - Listen to Chamorro pronunciations using OpenAI TTS HD (automatic fallback to browser TTS offline)
- **Image Upload** - Take photos of Chamorro documents/text for translation and explanation
- **Vision AI** - GPT-4o-mini analyzes images and reads Chamorro text
- **S3 Storage** - Persistent image storage with AWS S3 (images survive page refreshes)

- 📚 **RAG-Enhanced Knowledge (45,167 high-quality chunks - 83.6% increase!):**
  - 🗄️ **PostgreSQL + PGVector** - Production-grade vector database
  - 📖 **Chamoru.info Dictionary** - 9,414 clean entries (JSON import, zero boilerplate) ✨
  - 📕 **TOD Dictionary** - 9,151 comprehensive dictionary entries (JSON import) ✨
  - 📗 **Revised Chamorro Dictionary** - 10,350 authoritative entries with examples (JSON import) ✨
  - 🌐 **Guampedia Encyclopedia** - 9,336 chunks from 3,094 pages (cultural, historical, environmental content) ✨
  - 📝 **Lengguahi-ta Lessons** - 248 clean grammar lesson chunks (WordPress boilerplate removed) ✨
  - 📚 **Academic Grammar Books** - Dr. Sandra Chung's authoritative grammar + historical references
  - 🎯 **Data Quality Upgrade (Nov 2024)** - Complete re-crawl with improved content cleaning
  - 🔍 **Powered by Docling** - Advanced PDF processing with table detection
  - 🌐 **Powered by Crawl4AI** - Smart web content extraction for online resources
  - 🔎 **Web Search** - Brave Search API for real-time information
  - ⚡ **Hybrid RAG** - Smart detection: full search for Chamorro questions, skip for simple chat
  - 🎯 **Smart Source Prioritization** - Educational content prioritized (Lengguahi-ta: priority 115)
  - 🔤 **Character Normalization** - Handles spelling variations (glottal stops, accents, case)
  - 🧠 **Dynamic Source System** - Automatically describes available knowledge sources
  - **Token-aware chunking** - Optimal semantic boundaries for better retrieval
  - **Source citations** - Shows which sources were referenced

- 🎯 **Smart Features:**
  - **Character normalization** - Type "manana si yuos" instead of "Mañana si Yu'os" ✨
  - Progress tracking (conversations, vocabulary, time)
  - Loading indicators with response times
  - Arrow-key support for command history
  - Duplicate detection for document management
  - Enhanced metadata (era, processing method, tables, token counts)

- 🌐 **API & Deployment:**
  - **FastAPI REST API** - Production-ready HTTP endpoints
  - **Conversation Logging** - PostgreSQL-based session tracking
  - **Conversation Memory** - Automatic context retrieval (last 10 message pairs)
  - **Session Management** - Track full conversations for analytics
  - **Rate Limiting** - 60 requests/minute per IP (sliding window algorithm)
  - **CORS Protection** - Configurable allowed origins via environment variables
  - **Proper Logging** - Python logging module with structured output
  - **Environment-based Config** - Database URL, API keys, rate limits via `.env`
  - **Health Checks** - `/api/health` endpoint for monitoring
  - **Stateless Design** - Scale horizontally with ease

- 🔐 **Authentication & User Management:**
  - **Clerk Authentication** - Secure JWT-based user authentication
  - **Optional Authentication** - Anonymous users supported (no login required)
  - **User Tracking** - Conversations linked to `user_id` when authenticated
  - **Database Migrations** - Alembic for schema version control
  - **Future-Ready** - Prepared for per-user conversations and billing integration

- 💬 **Conversation Management:**
  - **Create & Organize** - Create conversations with custom titles
  - **List & Switch** - View all conversations, switch between topics
  - **Rename** - Update conversation titles anytime (double-click or right-click)
  - **Soft Delete** - Hide conversations while preserving data for training
  - **Message Counts** - Track messages per conversation
  - **Auto-naming** - Conversations titled from first message (first 50 characters)
  - **Persistence** - Active conversation maintained across refreshes
  - **React Query** - Modern state management with automatic caching and background sync

- 👍 **User Feedback System:**
  - **Thumbs Up/Down** - Rate every assistant message
  - **Database Storage** - All feedback saved to `message_feedback` table
  - **PostHog Tracking** - Events tracked for analytics
  - **Anonymous Support** - Both logged-in and anonymous users can rate
  - **Query Analytics** - SQL queries to find problem areas and satisfaction trends

- 📱 **Mobile-Optimized UI:**
  - **Responsive Design** - Optimized for both mobile and desktop
  - **Hamburger Menu** - Smooth sidebar transitions with backdrop overlay
  - **Touch-Friendly** - Large tap targets for buttons and controls
  - **Adaptive Layout** - Content scales properly on all screen sizes

## 🚀 Quick Start

### Option 1: GitHub Codespaces

**No installation needed! Works on any computer:**

1. Fork this repository
2. Click **"Code"** → **"Codespaces"** → **"Create codespace"**
3. Wait 1-2 minutes for setup
4. Follow [CODESPACES_QUICKSTART.md](CODESPACES_QUICKSTART.md)

**Perfect for:** Learning, old laptops, Chromebooks

### Option 2: Local Installation

**Prerequisites:**
- Python 3.12+
- PostgreSQL 16+ with PGVector extension
- LM Studio (for local LLM)

### 1. Install PostgreSQL + PGVector
```bash
# macOS
brew install postgresql@16 pgvector
brew services start postgresql@16

# Create database
psql postgres -c "CREATE DATABASE chamorro_rag;"
psql chamorro_rag -c "CREATE EXTENSION vector;"
```

### 2. Install uv (Python package manager)
```bash
brew install uv
```

### 3. Install Python Dependencies
```bash
uv sync
```

**⚠️ IMPORTANT: Dependency Management**

This project uses TWO dependency management systems:

1. **`pyproject.toml`** (for local development with `uv`)
   - Used when running locally: `uv sync`
   - Managed by: `uv` package manager

2. **`requirements.txt`** (for production deployment on Render)
   - Used for deployment: `pip install -r requirements.txt`
   - Managed by: `uv pip compile pyproject.toml --universal -o requirements.txt`

**When adding a new dependency:**
1. Add it to `pyproject.toml` under `[project.dependencies]`
2. Run `uv sync` to install locally
3. Run `uv pip compile pyproject.toml --universal -o requirements.txt` to update requirements.txt
4. Commit BOTH files to git

**Why both?** Render uses `requirements.txt` for compatibility, while `uv` provides faster local development with better dependency resolution.

### 4. Set Up Environment
Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
# Required
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql://localhost/chamorro_rag

# Authentication (Optional - enables user tracking)
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key  # Get from https://clerk.com

# AWS S3 (Optional - for persistent image storage)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-west-2  # or your preferred region
AWS_S3_BUCKET=your-bucket-name

# Embeddings (see EMBEDDINGS_GUIDE.md)
EMBEDDING_MODE=openai  # or "local" for HuggingFace

# Optional - for local LLM
OPENAI_API_BASE=http://localhost:1234/v1

# Optional - for web search
TAVILY_API_KEY=your-tavily-key-here

# API Configuration
ALLOWED_ORIGINS=*
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW=60

# Weather API (Optional)
WEATHER_API_KEY=your-weather-api-key

# API Configuration (for production deployment)
ALLOWED_ORIGINS=*  # Development: "*" | Production: "https://your-frontend.com"
RATE_LIMIT_REQUESTS=60  # Default: 60 requests per minute per IP
RATE_LIMIT_WINDOW=60    # Default: 60 seconds
```

**Note:** You only need the keys for features you want to use:
- **Required:** `DATABASE_URL`, `OPENAI_API_KEY`
- **Embeddings:** `EMBEDDING_MODE` (openai/local, see below)
- **Authentication:** `CLERK_SECRET_KEY` (for user tracking)
- **Image Upload:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` (for persistent images)
- **Local LLM mode:** `OPENAI_API_BASE` + `LOCAL_MODEL`
- **Web search:** `BRAVE_API_KEY` (free tier: 2,000 queries/month)
- **Weather:** `WEATHER_API_KEY` (free tier: 1M calls/month)
- **Production API:** `ALLOWED_ORIGINS`, `RATE_LIMIT_REQUESTS` (optional, have defaults)

### 5. Run the Application

**Option A: FastAPI REST API (Recommended for production)**

**Start the API Server (Recommended):**

Easy startup with the helper script:
```bash
./scripts/dev-network.sh
```

This will:
- ✅ Auto-detect your local IP address
- ✅ Start FastAPI on your network (accessible from phone & desktop)
- ✅ Display URLs for API, docs, and mobile access
- ✅ Example: `http://192.168.1.190:8000` (phone) + `http://localhost:8000` (desktop)

**Benefits:**
- 📱 Test on mobile devices (same WiFi network)
- 💻 Still works on localhost for desktop development
- 🔧 Hot reload enabled (code changes auto-restart server)

**Or start manually (localhost only):**

If you only need localhost access:
```bash
uv run python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**Access the API:**
- **API Root:** http://localhost:8000
- **Interactive Docs:** http://localhost:8000/api/docs
- **Health Check:** http://localhost:8000/api/health

**Option B: CLI (Command Line Interface)**

**Cloud Mode (Default - Recommended):**
```bash
# Uses GPT-4o-mini via OpenAI API (fast, accurate, cheap)
uv run python tests/chamorro-chatbot-3.0.py
```

**Local Mode (Private & Free):**
```bash
# Uses local model via LM Studio (slower, but free)
uv run python tests/chamorro-chatbot-3.0.py --local
```

**View Help:**
```bash
uv run python tests/chamorro-chatbot-3.0.py --help
```

---

## 🗄️ Database Migrations (Alembic)

We use **Alembic** for database schema version control (similar to Rails migrations).

### Running Migrations

**Apply all pending migrations:**
```bash
uv run alembic upgrade head
```

**View migration history:**
```bash
uv run alembic history
```

**Check current version:**
```bash
uv run alembic current
```

### Creating New Migrations

**Auto-generate migration from schema changes:**
```bash
uv run alembic revision --autogenerate -m "add new column"
```

**Create blank migration:**
```bash
uv run alembic revision -m "description of change"
```

**Rollback one migration:**
```bash
uv run alembic downgrade -1
```

### How It Works

1. **Alembic tracks schema versions** in `alembic_version` table
2. **Migration files** are stored in `alembic/versions/`
3. **Configuration** in `alembic.ini` and `alembic/env.py`
4. **Database URL** is read from `.env` file automatically

### Example: The `user_id` Migration

```python
# alembic/versions/8297443c236c_add_user_id_to_conversation_logs.py
def upgrade():
    op.add_column('conversation_logs', sa.Column('user_id', sa.String(), nullable=True))
    op.create_index('idx_conversation_logs_user_id', 'conversation_logs', ['user_id'])

def downgrade():
    op.drop_index('idx_conversation_logs_user_id', table_name='conversation_logs')
    op.drop_column('conversation_logs', 'user_id')
```

**Benefits over raw SQL:**
- ✅ Version control for database schema
- ✅ Reversible changes (upgrade/downgrade)
- ✅ Team collaboration (no manual SQL scripts)
- ✅ Automatic migration generation
- ✅ Production-safe deployments

---

## ⚠️ Common Issues

**Error: "ModuleNotFoundError: No module named 'langchain_postgres'"**
- Fix: Always use `uv run` prefix to activate the virtual environment
- Command: `uv run python -m uvicorn api.main:app --reload --port 8000`

**Error: Database connection failed**
- Check PostgreSQL is running: `brew services list`
- Start it: `brew services start postgresql@16`
- Verify database exists: `psql postgres -c "SELECT 1 FROM pg_database WHERE datname = 'chamorro_rag';"`

**Error: Missing .env file**
- Copy template: `cp .env.example .env`
- Add your API keys to `.env`

**View API Docs:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**Test API:**
```bash
# Test chat endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hafa adai!", "mode": "english", "session_id": "test-123"}'

# Test flashcard generation
curl -X POST http://localhost:8000/api/generate-flashcards \
  -F "topic=greetings" \
  -F "count=3" \
  -F "variety=basic"
```

**See [api/README.md](api/README.md) for full API documentation.**

## 🧠 Conversation Memory

Both the CLI and API maintain conversation context, but use different approaches optimized for their use cases:

### CLI: In-Memory History 💾

**For personal learning sessions**

The CLI keeps conversation history in RAM during your session:
- ✅ **Fast** - No database overhead
- ✅ **Simple** - Works immediately
- ✅ **Smart trimming** - Keeps last 20 messages (local) or unlimited (cloud)
- ❌ **Session-only** - Lost when you exit

**Perfect for:** Personal testing, local learning, one-on-one use

---

### API: Database-Backed History 🗄️

**For production deployment**

The API automatically maintains conversation context using session-based PostgreSQL storage:

**Frontend sends `session_id` with each message:**
```json
{
  "message": "How do I say hello?",
  "mode": "english",
  "session_id": "user-123-session-abc"
}
```

**Backend automatically:**
1. ✅ Retrieves last 10 message pairs from database
2. ✅ Includes them in context sent to LLM
3. ✅ Enables follow-up questions and natural dialogue
4. ✅ Logs new response for future context

### Example Conversation

```
User: "How do I say good morning?"
Bot:  "In Chamorro, you say 'Buenas dias' (BWAY-nahs DEE-ahs)"

User: "How do I pronounce that?"  ← Bot remembers "Buenas dias"
Bot:  "It's pronounced BWAY-nahs DEE-ahs..."

User: "Can you use it in a sentence?"  ← Bot knows we're talking about greetings
Bot:  "Sure! 'Buenas dias, nana' means 'Good morning, mom'"
```

**API Features:**
- ✅ Persistent (survives server restarts)
- ✅ Multi-user support
- ✅ Analytics-ready
- ✅ Resume conversations
- ✅ Production-ready

**Perfect for:** Web apps, mobile apps, multi-user deployments

---

### Which Should I Use?

| Use Case | Recommendation |
|----------|----------------|
| **Personal learning** | CLI (in-memory) |
| **Local testing** | CLI (in-memory) |
| **Production deployment** | API (database) |
| **Web/mobile app** | API (database) |
| **Analytics needed** | API (database) |

Both work great - choose based on your needs! 🌺

**Key Features (API only):**
- ✅ Automatic context retrieval (no frontend complexity)
- ✅ Last 10 message pairs (~4,000 tokens)
- ✅ Smart context window management
- ✅ Works with GPT-4o-mini's 128K context limit
- ✅ Session-based isolation (multiple conversations don't interfere)

**New Conversation:** Frontend generates new `session_id`
**Same Conversation:** Frontend reuses same `session_id`

---

## 📊 Conversation Analytics

All conversations are logged to PostgreSQL for analytics and future model fine-tuning!

### Database Schema

**`conversations` table** - User-facing conversation management:
- `id` (UUID) - Unique conversation identifier
- `user_id` (String, nullable) - Linked to Clerk user (NULL for anonymous)
- `title` (String) - Conversation name
- `created_at`, `updated_at` (Timestamp) - Tracking
- `deleted_at` (Timestamp, nullable) - Soft delete marker
- `message_count` (Integer, computed) - Number of messages

**`conversation_logs` table** - Complete message history:
- All user/assistant messages
- Conversation ID linkage
- RAG usage, sources, response times
- **Preserved even when conversations are soft-deleted**

### View Recent Conversations
```sql
psql chamorro_rag -c "
SELECT id, title, message_count, created_at
FROM conversations
WHERE deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 10;
"
```

### Check Soft-Deleted Conversations
```sql
psql chamorro_rag -c "
SELECT c.id, c.title, c.deleted_at, COUNT(cl.id) as message_count
FROM conversations c
LEFT JOIN conversation_logs cl ON c.id = cl.conversation_id
WHERE c.deleted_at IS NOT NULL
GROUP BY c.id, c.title, c.deleted_at;
"
```

### View Recent Conversations
```sql
psql chamorro_rag -c "
SELECT id, session_id, mode, LEFT(user_message, 40) as message
FROM conversation_logs
ORDER BY timestamp DESC
LIMIT 10;
"
```

### Conversation Stats by Mode
```sql
psql chamorro_rag -c "
SELECT mode, COUNT(DISTINCT session_id) as conversations, COUNT(*) as messages
FROM conversation_logs
GROUP BY mode;
"
```

### Export for Fine-Tuning
```bash
uv run python export_for_finetuning.py
# Creates chamorro_training_data.jsonl
```

### User Feedback Analytics 👍👎

Users can rate assistant messages with thumbs up/down. Query the `message_feedback` table:

```sql
-- Overall satisfaction rate
psql chamorro_rag -c "
SELECT 
  feedback_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM message_feedback
GROUP BY feedback_type;
"

-- Most downvoted responses (find problem areas)
psql chamorro_rag -c "
SELECT LEFT(user_query, 50) as query, LEFT(bot_response, 80) as response, created_at
FROM message_feedback
WHERE feedback_type = 'down'
ORDER BY created_at DESC
LIMIT 10;
"

-- Feedback trend by day
psql chamorro_rag -c "
SELECT 
  DATE(created_at) as date,
  SUM(CASE WHEN feedback_type = 'up' THEN 1 ELSE 0 END) as thumbs_up,
  SUM(CASE WHEN feedback_type = 'down' THEN 1 ELSE 0 END) as thumbs_down
FROM message_feedback
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
"
```

**See [documentation/IMPROVEMENT_GUIDE.md](documentation/IMPROVEMENT_GUIDE.md) for PostHog dashboard plans.**

**See [CONVERSATION_ANALYTICS.md](CONVERSATION_ANALYTICS.md) for more SQL queries and Python analytics scripts!**

---

## 🔒 API Security & Rate Limiting

The FastAPI backend includes production-ready security features:

### Rate Limiting

**Sliding Window Algorithm** - Protects against abuse and excessive API usage:
- **Default:** 60 requests per minute per IP address
- **Window:** 60-second sliding window (not fixed intervals)
- **Response:** HTTP 429 (Too Many Requests) when exceeded
- **Configurable:** Set via environment variables

**Configure Rate Limits:**
```env
# .env file
RATE_LIMIT_REQUESTS=60  # Max requests per IP
RATE_LIMIT_WINDOW=60    # Time window in seconds
```

**Example:**
```bash
# More restrictive (for high-traffic production)
RATE_LIMIT_REQUESTS=30 RATE_LIMIT_WINDOW=60 uv run uvicorn api.main:app

# More permissive (for development/testing)
RATE_LIMIT_REQUESTS=100 RATE_LIMIT_WINDOW=60 uv run uvicorn api.main:app
```

**What Gets Rate Limited:**
- ✅ `/api/chat` - Main chat endpoint
- ❌ `/api/health` - Health checks (unlimited)
- ❌ `/api/docs` - API documentation (unlimited)

### CORS Protection

**Cross-Origin Resource Sharing** - Controls which domains can access your API:

**Development (allow all origins):**
```env
ALLOWED_ORIGINS=*
```

**Production (specific domains only):**
```env
ALLOWED_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
```

**Multiple domains:** Separate with commas, no spaces

### Logging & Monitoring

All requests are logged with structured output:
```
INFO: Rate limit check for IP: 192.168.1.100, path: /api/chat
INFO: Chat request: mode=english, session_id=abc-123
INFO: Chat response: used_rag=True, response_time=1.23s
WARNING: Rate limit exceeded for IP: 192.168.1.100
```

**Monitor in production:**
```bash
# View logs in real-time
tail -f /var/log/chamorro-api.log

# Check rate limit violations
grep "Rate limit exceeded" /var/log/chamorro-api.log
```

### Production Deployment Checklist

Before deploying to production:

- [ ] Set `ALLOWED_ORIGINS` to your frontend domain(s)
- [ ] Set `DATABASE_URL` to production database (e.g., Neon.tech)
- [ ] Configure appropriate `RATE_LIMIT_REQUESTS` for your use case
- [ ] Enable HTTPS (handled by Render.com/Vercel)
- [ ] Set up logging/monitoring
- [ ] Test rate limiting with load testing
- [ ] Set up database backups

**See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for full deployment instructions!**

---

## 📖 Usage

### Basic Commands
```
/chamorro   - Switch to Chamorro-only immersion
/learn      - Switch to learning mode (Chamorro + breakdown)
/english    - Switch to general chat mode
/help       - Show all commands
/stats      - View your learning progress
/vocab      - Show words learned this session
exit        - Quit
```

### Example Session
```
👤 USER: How do I say "good morning"?

🤖 ASSISTANT 📚 (⏱️ 2.1s)
──────────────────────────────────────────────────────────────────────
According to the Revised Chamorro Dictionary on page 45, "good morning" 
is "Buenas dias" (BWAY-nahs DEE-ahs).

You can also say:
- "Håfa adai" (HAH-fah ah-DYE) - General greeting, any time
- "Buenas yan håo" (BWAY-nahs yahn how) - "Hello to you"

📚 Referenced: Revised Chamorro Dictionary (p. 45), Chamorro Grammar 
(Dr. Sandra Chung) (p. 203)
──────────────────────────────────────────────────────────────────────
```

**Note:** The 📚 emoji indicates the response used grammar book context. 
Page numbers are shown both in the response text and in the references at the bottom.

## 🗂️ Managing Your RAG Database

### View Indexed Documents
```bash
uv run python src/rag/manage_rag_db.py list
```

### Add All PDFs from a Folder
```bash
# Simple! Finds all PDFs and indexes them (skips duplicates automatically)
uv run python src/rag/manage_rag_db.py add-all knowledge_base/pdfs/
```

### Add Individual PDFs
```bash
uv run python src/rag/manage_rag_db.py add knowledge_base/pdfs/new_vocab.pdf
```

### Add Website Content (NEW!)
```bash
# Add a webpage
uv run python src/crawlers/crawl_website.py http://www.chamoru.info/dictionary/

# Crawl deeper (follow internal links)
uv run python src/crawlers/crawl_website.py https://guampedia.com --max-depth 2
```

**Perfect for:** Online dictionaries, language learning sites, cultural resources

### Check for Duplicates
```bash
uv run python src/rag/manage_rag_db.py check knowledge_base/pdfs/grammar.pdf
```

### Database Stats
```bash
uv run python src/rag/manage_rag_db.py stats
```

See [documentation/RAG_MANAGEMENT_GUIDE.md](documentation/RAG_MANAGEMENT_GUIDE.md) for complete documentation.

## 📁 Project Structure

> **📁 See [docs/CODEBASE_STRUCTURE.md](docs/CODEBASE_STRUCTURE.md)** for the complete, detailed codebase organization guide.

```
HafaGPT-API/
├── api/                       # 🌐 FastAPI web service
│   ├── main.py                # FastAPI app & routes
│   ├── models.py              # Pydantic request/response models
│   ├── chatbot_service.py     # Core chatbot logic (shared with CLI)
│   ├── conversations.py       # Conversation CRUD operations
│   └── README.md              # API documentation
│
├── src/                       # 📦 All Python source code
│   ├── crawlers/              # 🕷️ Web crawlers for data ingestion
│   │   ├── crawl_website.py   # Generic website crawler (Guampedia)
│   │   └── crawl_lengguahita.py # Lengguahi-ta specific crawler
│   ├── importers/             # 📥 Data importers
│   │   ├── import_dictionary.py # Import dictionary JSON files
│   │   └── import_news_articles.py # Import news articles
│   ├── rag/                   # 🧠 RAG system
│   │   ├── chamorro_rag.py    # RAG search & retrieval logic
│   │   ├── manage_rag_db.py   # Database management tool
│   │   └── web_search_tool.py # Web search integration (Brave API)
│   └── utils/                 # 🔧 Utility scripts
│       ├── inspect_rag_db.py  # Database inspection tool
│       ├── improved_chunker.py # Docling processor + token-aware chunker
│       ├── sync_metadata.py   # Metadata synchronization
│       ├── update_metadata_from_db.py # Update metadata from DB
│       └── find_max_id.py     # Find max IDs in DB
│
├── scripts/                   # 🚀 All shell scripts
│   ├── crawlers/              # Crawler wrapper scripts
│   │   ├── crawl_guampedia.sh # Full Guampedia crawl
│   │   ├── crawl_guampedia_test.sh # Test Guampedia crawl
│   │   ├── crawl_lengguahita.sh # Full Lengguahi-ta crawl
│   │   └── crawl_pdn_batch.sh # Pacific Daily News batch crawl
│   ├── importers/             # Importer wrapper scripts
│   │   ├── download_dictionaries.sh # Download dictionary files
│   │   ├── import_dictionaries.sh # Import dictionaries
│   │   └── import_news_articles.sh # Import news articles
│   ├── inspect_db.sh          # Database inspection
│   ├── dev-network.sh         # Start dev server on network
│   └── start.sh               # Start production server
│
├── docs/                      # 📖 All documentation
│   ├── setup/                 # Setup & configuration docs
│   ├── crawlers/              # Crawler documentation
│   ├── CODEBASE_STRUCTURE.md  # Complete structure guide
│   ├── DATA_IMPORT_MASTER_PLAN.md
│   └── RAG_PRIORITY_SYSTEM.md
│
├── tests/                     # 🧪 Test files
│   ├── test_system.py         # System tests
│   └── chamorro-chatbot-3.0.py # CLI version (legacy)
│
├── logs/                      # 📝 Log files
├── data/                      # 📊 Data files
├── alembic/                   # 🗄️ Database migrations
├── knowledge_base/            # 📚 RAG source materials (PDFs)
├── backups/                   # 💾 Database backups
├── archive/                   # 📦 Archived scripts & docs
├── crawlers/                  # 🕷️ Old site-specific crawlers
│   ├── README.md              # Crawler usage guide
│   ├── SOURCES.md             # Human-readable source tracker
│   ├── pacific_daily_news.py  # PDN crawler with content cleaning
│   └── _template.py           # Template for new site crawlers
│
├── documentation/             # 📖 Old documentation (to be migrated)
│   ├── RAG_MANAGEMENT_GUIDE.md
│   ├── MODEL_SWITCHING_GUIDE.md
│   └── IMPROVEMENT_GUIDE.md
│
├── .env                       # 🔐 API configuration (keys, database URL)
├── pyproject.toml             # 📦 Project dependencies (uv)
├── requirements.txt           # 📦 Production dependencies (pip)
├── render.yaml                # 🚀 Render deployment config
├── rag_metadata.json          # 📊 Document & website tracking
└── README.md                  # 📖 This file
```

## 🛠️ Tech Stack & Services

This project uses a combination of open-source tools, cloud services, and APIs to deliver a production-ready Chamorro language learning experience.

---

### **🐍 Core Technology**

#### **Programming Language**
- **Python 3.12+** - Modern Python with type hints and async support
- **Package Management:** `uv` (local development) + `pip` (production)
- **Dependency Files:** `pyproject.toml` + `requirements.txt`

#### **Frontend (Separate Repository)**
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing for flashcards and navigation
- **React Query (TanStack Query)** - Server state management
  - Automatic caching and background sync
  - Optimistic updates for instant UX
  - Smart refetching and invalidation
  - Replaces sessionStorage with production-ready cache
- **Clerk React** - Authentication UI components
- **Deployment:** Netlify (auto-deploy on push)

---

### **🤖 AI & Language Models**

#### **Large Language Models (LLMs)**
- **OpenAI GPT-4o-mini** (Cloud, Default)
  - **Cost:** ~$0.15/1M input tokens, ~$0.60/1M output tokens
  - **Use Case:** Production API, fast responses (5-15s)
  - **Context:** 128K tokens
  - **Vision:** Supports image analysis for document translation
  
- **LM Studio + Qwen 2.5 Coder 32B** (Local, Optional)
  - **Cost:** Free (runs locally)
  - **Use Case:** Privacy-focused, offline use
  - **Speed:** Slower (30-60s responses)
  - **Models Tested:** Qwen 2.5 Coder 32B, Phi-4-mini

#### **Embeddings (Vector Search)**
- **OpenAI text-embedding-3-small** (Cloud, Default)
  - **Dimensions:** 384 (configured for compatibility)
  - **Cost:** ~$0.0001 per query (~$0.30/month typical usage)
  - **Use Case:** Production deployment, Render Starter plan
  
- **HuggingFace paraphrase-multilingual-MiniLM-L12-v2** (Local, Optional)
  - **Dimensions:** 384 (compatible with OpenAI)
  - **Cost:** Free (runs locally)
  - **Memory:** ~500MB RAM
  - **Use Case:** Self-hosting, high traffic, privacy

**Note:** Both embedding modes are 100% compatible - switch anytime without re-indexing!

---

### **🗄️ Database & Storage**

#### **Primary Database**
- **PostgreSQL 16** - Production-grade relational database
- **PGVector Extension** - Vector similarity search for RAG
- **Provider:** Neon.tech (production) or Local (development)
- **Schema Management:** Alembic migrations
- **Tables:**
  - `conversations` - User-facing conversation management
  - `conversation_logs` - Complete message history
  - `langchain_pg_embedding` - Vector embeddings (45,167 high-quality chunks)
  - `langchain_pg_collection` - RAG collections

#### **File Storage**
- **AWS S3** - Persistent image storage
  - **Region:** Configurable (e.g., us-west-2)
  - **Use Case:** Uploaded images for vision AI
  - **Cost:** ~$0.023/GB/month + ~$0.005/1K requests
  - **Bucket Policy:** Public read access for image URLs
  
---

### **🔐 Authentication & User Management**

#### **Clerk** - User Authentication & Management
- **Website:** https://clerk.com
- **Features:**
  - JWT-based authentication
  - Social login (Google, Facebook, etc.)
  - User profiles and metadata
  - Session management
  - Development + Production instances
- **Integration:** React frontend + FastAPI backend JWT verification
- **Future:** User billing and subscription management
- **Cost:** Free tier (10,000 MAUs), then $25/month

#### **Stripe** (Planned) - Payment Processing
- **Use Case:** Future subscription billing
- **Status:** 🔜 Not yet implemented
- **Plan:** Integrate with Clerk for user billing

---

### **🌐 API & Web Framework**

#### **FastAPI** - Modern Python Web Framework
- **Features:**
  - Async request handling
  - Automatic OpenAPI docs
  - Pydantic data validation
  - Type hints throughout
  - Built-in CORS support
  
- **Server:** Uvicorn (ASGI)
- **Security:**
  - Rate limiting (60 req/min per IP, configurable)
  - CORS protection
  - JWT verification (Clerk)
  - Environment-based config

---

### **📚 Document Processing & Web Crawling**

#### **Docling** - Advanced PDF Processing
- **Purpose:** Extract text, tables, and structure from PDFs
- **Features:**
  - Table detection and parsing
  - Layout understanding
  - Token-aware chunking
- **Use Case:** Grammar books, dictionaries, academic papers
- **Provider:** IBM Research open-source

#### **Crawl4AI** - AI-Optimized Web Scraping
- **Purpose:** Extract clean content from websites
- **Features:**
  - JavaScript rendering
  - Content cleaning (removes nav, ads, footers)
  - Markdown conversion
  - Internal link discovery
  - Rate limiting and polite crawling
- **Use Case:** Guampedia, Lengguahi-ta, Chamoru.info
- **Provider:** Open-source

#### **Beautiful Soup** - HTML Parsing
- **Purpose:** Parse and clean HTML content
- **Use Case:** Supplementary web scraping

---

### **🔍 Search & Retrieval**

#### **RAG (Retrieval-Augmented Generation) System**
- **Vector Store:** PostgreSQL + PGVector
- **Framework:** LangChain
- **Chunking:** Token-aware (350 tokens/chunk, 40 token overlap)
- **Retrieval:** Semantic similarity search (top-k)
- **Re-ranking:** Priority-based scoring system

#### **Brave Search API** - Web Search
- **Purpose:** Real-time information (news, weather, current events)
- **Cost:** Free tier (2,000 queries/month)
- **Use Case:** Supplement static knowledge with current information
- **Provider:** Brave.com

---

### **🚀 Deployment & Infrastructure**

#### **Backend Hosting**
- **Render.com** - API deployment
  - **Plan:** Starter ($7/month) or Pro ($85/month)
  - **Features:** Auto-deploy on push, environment variables, health checks
  - **Build:** Automatic from `render.yaml`
  - **Migrations:** Auto-run on deploy

#### **Frontend Hosting**
- **Netlify** - React app deployment
  - **Plan:** Free tier
  - **Features:** Auto-deploy on push, environment variables, custom domains
  - **Build:** Automatic from GitHub

#### **Database Hosting**
- **Neon.tech** - Serverless PostgreSQL
  - **Plan:** Free tier (0.5GB storage) or Pro ($19/month)
  - **Features:** Auto-scaling, branching, point-in-time recovery
  - **Connection:** Internal URL for server-to-server

---

### **📊 Analytics & Monitoring**

#### **Logging**
- **Python logging module** - Structured application logs
- **PostgreSQL** - Conversation analytics and training data
- **Render Dashboard** - Server logs and metrics

#### **Conversation Tracking**
- **Database:** All messages logged to `conversation_logs`
- **Metrics:** Session duration, message counts, RAG usage, response times
- **Future:** User analytics, learning progress tracking

---

### **🎤 Multimedia & Input**

#### **Web Speech API** - Speech-to-Text
- **Provider:** Browser-native (Chrome, Edge, Safari)
- **Cost:** Free
- **Use Case:** Voice input for Chamorro questions
- **Language:** English (automatic transcription)

#### **OpenAI TTS HD** - Text-to-Speech (Audio Pronunciation)
- **Provider:** OpenAI
- **Model:** tts-1-hd (high definition)
- **Voice:** Shimmer (optimized for Spanish/Chamorro pronunciation)
- **Cost:** $0.030 per 1K characters (~$0.60 for 100 pronunciations)
- **Fallback:** Browser TTS (Web Speech API) when offline
- **Language Hint:** Spanish phonetics for better Chamorro pronunciation
- **Use Case:** Listen to correct Chamorro pronunciations

#### **GPT-4o-mini Vision** - Image Analysis
- **Provider:** OpenAI
- **Cost:** Included in LLM costs
- **Use Case:** Translate Chamorro text in photos/documents
- **Integration:** S3 storage + Base64 encoding

---

### **📦 Key Python Libraries**

**AI & LLM:**
- `openai` - OpenAI API client
- `langchain` - LLM orchestration framework
- `langchain-postgres` - PostgreSQL vector store
- `langchain-openai` - OpenAI embeddings integration
- `langchain-huggingface` - Local embeddings (optional)

**Web & API:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `python-multipart` - File upload support
- `httpx` - Async HTTP client

**Database:**
- `psycopg2` - PostgreSQL adapter
- `alembic` - Database migrations
- `sqlalchemy` - ORM (used by LangChain)

**Authentication:**
- `clerk-backend-api` - Clerk SDK (deprecated in our usage)
- `python-jose[cryptography]` - JWT verification

**Document Processing:**
- `docling` - PDF processing
- `crawl4ai` - Web crawling
- `beautifulsoup4` - HTML parsing

**Storage:**
- `boto3` - AWS S3 SDK

**Development:**
- `python-dotenv` - Environment variables
- `prompt-toolkit` - Enhanced CLI

---

### **💰 Estimated Monthly Costs**

**Production Deployment (Moderate Usage):**

| Service | Plan | Cost |
|---------|------|------|
| **Render** (API hosting) | Starter | $7.00 |
| **Neon** (Database) | Free tier | $0.00 |
| **Netlify** (Frontend) | Free tier | $0.00 |
| **OpenAI** (LLM + Embeddings + TTS) | Pay-as-you-go | ~$5-15 |
| **AWS S3** (Image storage) | Pay-as-you-go | ~$1-2 |
| **Clerk** (Authentication) | Free tier | $0.00 |
| **Brave Search** | Free tier | $0.00 |
| **TOTAL** | | **~$13-24/month** |

**Notes:**
- OpenAI costs scale with usage (~100-300 queries/day + flashcard generation)
- TTS costs: ~$0.60 per 100 pronunciations (HD quality)
- Flashcards: ~$0.02 per custom deck generation (3-9 cards)
- Can reduce to ~$7/month with local embeddings (requires Render Pro $85)
- S3 costs depend on image uploads (typical: 10-50 images/month)
- Database can be free tier (<0.5GB) or Pro ($19/month for growth)

**Development (Local):**
- **Cost:** $0 (all free/local tools)
- Uses: Local PostgreSQL, local LLM (LM Studio), local embeddings

---

### **🔧 Development Tools**

- **uv** - Fast Python package manager
- **Git** - Version control
- **VS Code / Cursor** - Code editor
- **Alembic** - Database migrations
- **Render CLI** - Deployment management
- **Netlify CLI** - Frontend deployment

---

### **📖 Why These Tools?**

**OpenAI vs. Local LLM:**
- ✅ OpenAI: Fast (5-15s), accurate, cheap (~$0.01/request), vision support
- ✅ Local: Private, free, offline, but slower (30-60s)

**PostgreSQL + PGVector vs. Pinecone/Weaviate:**
- ✅ Single database for everything (vectors + conversations)
- ✅ Mature, battle-tested, easy backups
- ✅ No separate vector DB subscription

**Clerk vs. Auth0/Firebase:**
- ✅ Modern developer experience
- ✅ React/TypeScript first-class support
- ✅ Built-in user management UI
- ✅ Free tier generous for learning projects

**S3 vs. Cloudinary/ImgBB:**
- ✅ Industry standard, battle-tested
- ✅ Cheap (~$0.023/GB/month)
- ✅ Integrates with everything
- ✅ Direct URL access

**FastAPI vs. Flask/Django:**
- ✅ Async-first (better for LLM calls)
- ✅ Automatic API docs
- ✅ Type hints + validation
- ✅ Modern Python features

**Render vs. Heroku/Railway:**
- ✅ Simple deployment (render.yaml)
- ✅ Free PostgreSQL
- ✅ Auto-migrations on deploy
- ✅ Reasonable pricing

---

**See `pyproject.toml` for complete dependency list.**

## 📚 Data Sources & Attribution

**Knowledge Base: 45,167 high-quality chunks (83.6% increase from data quality upgrade)** ✨

All content is used for educational purposes to help preserve and teach the Chamorro language.

### **Major Sources:**

#### **🗄️ Dictionaries (28,918 chunks - 64.0% of database)**

**Chamoru.info Dictionary** (9,414 chunks - JSON import)
- Complete modern Chamorro dictionary with 9,400+ clean entries
- Definitions, examples, pronunciation guides, etymology
- **Priority:** 50 (standard dictionary lookups)
- **Format:** Clean JSON import (zero boilerplate, no navigation/footers)

**TOD Dictionary** (9,151 chunks - JSON import)
- Comprehensive Chamorro-English dictionary entries
- Additional vocabulary not in web-crawled sources
- **Priority:** 50 (standard dictionary lookups)
- **Format:** `chamorro_english_dictionary_TOD.json`

**Revised Chamorro Dictionary** (10,350 chunks - JSON import)
- Modern Chamorro dictionary with detailed examples
- Rich contextual usage and bilingual content
- **Priority:** 50 (standard dictionary lookups)
- **Format:** `revised_and_updated_chamorro_dictionary.json`

#### **🌐 Guampedia Encyclopedia** (11,144 chunks from 3,094 pages) ✨
- Comprehensive encyclopedia of Guam's history, culture, and language
- Chamorro folktales, legends, cultural practices, historical articles, wildlife, environment
- **Priority:** 85-105 (high priority for cultural content)
- **Data Quality:** Clean extraction with zero navigation/boilerplate (Nov 2024 re-crawl)
- **Coverage:** ~60-70% of Guampedia's content (3,094 of ~4,000 pages)

#### **📝 Lengguahi-ta Educational Resources** (248 chunks) ✨
- Structured bilingual Chamorro lessons by Schyuler Lujan
- Beginner/intermediate grammar, stories, legends, songs
- **Priority:** 100-115 (highest priority for educational content)
- **Data Quality:** Clean WordPress content extraction (Nov 2024 re-crawl)
- **Coverage:** 250 lesson pages with zero boilerplate

#### **📚 Academic Grammar Books** (~1,500 chunks)
- Dr. Sandra Chung's authoritative Chamorro Grammar (1998)
- Historical dictionaries and reference materials
- **Priority:** 15-100 (authoritative grammar reference)

#### **📝 Chamorro Language Blogs** (~4,860 chunks)
- **Fino'Chamoru Blog** - Daily word posts, grammar lessons, vocabulary
- **Chamorro Language & Culture Blog** - Cultural content, literature, traditions
- **Priority:** 85-115 (educational lessons prioritized)
- **Content:** Word of the Day series, Chamorro lessons (pronouns, prefixes, verbs), cultural articles

### **🎯 Data Quality Upgrade (November 2024):**

**Problem:** Original data contained excessive boilerplate (navigation, footers, social widgets)

**Solution:** Complete re-crawl with improved content cleaning
- ✅ **Lengguahi-ta:** Removed WordPress navigation and subscription widgets
- ✅ **Chamoru.info:** Used clean JSON import instead of web crawl
- ✅ **Guampedia:** Enhanced regex patterns to remove site navigation and preserve articles
- ✅ **Result:** 45,167 clean chunks (vs 24,609 corrupted chunks before)

**Impact:**
- 83.6% increase in database size (20,558 new chunks)
- 100% removal of boilerplate content
- 6x more Guampedia content (3,094 pages vs 500)
- Improved RAG retrieval quality and relevance

### **Smart Priority System:**

The RAG system automatically prioritizes content based on your question:

- **115** → Grammar lessons (Lengguahi-ta, blog lessons)
- **110** → Stories, modern bilingual content
- **105** → Vocabulary building (Word of the Day)
- **100** → Educational lessons, authoritative grammar
- **50** → Dictionary entries, vocabulary lookups

When you ask "How do I form sentences?", you get **grammar lessons**, not dictionary definitions! 🎓

### **Real-Time Information:**
- **Web Search:** Brave Search API for current events
- **Weather:** Live weather with Chamorro vocabulary

---

**📖 For complete attribution, detailed credits, and academic citations, see [docs/SOURCES.md](docs/SOURCES.md)**

**🔧 For developer guide on adding new sources, see [docs/SOURCE_CITATION_SYSTEM.md](docs/SOURCE_CITATION_SYSTEM.md)**

---

### **🙏 Acknowledgments:**

**Si Yu'os Ma'åse'** (Thank you) to everyone preserving the Chamorro language:

- **Chamoru.info** - Modern online dictionary
- **Guampedia.com** - Guam's encyclopedia
- **Schyuler Lujan** - Lengguahi-ta educational content
- **Dr. Sandra Chung** - Authoritative Chamorro grammar
- **Aaron Matanane** - Fino'Chamoru Blog (daily vocabulary & lessons)
- **Chamorro Language & Culture Blog** - Cultural preservation & literature
- **Peter R. Onedera** - Bilingual Chamorro journalism
- **All Chamorro language educators and content creators** 🌺

## 🔄 Embeddings Configuration (NEW!)

The chatbot now supports **two embedding modes** for maximum flexibility:

### OpenAI Embeddings (Cloud) ☁️ - Default

**Best for:** Render deployment, low memory servers, getting started

```bash
# In .env
EMBEDDING_MODE=openai
OPENAI_API_KEY=sk-...
```

**Pros:**
- ✅ Tiny memory (~10MB vs 500MB)
- ✅ Instant startup
- ✅ Better quality
- ✅ Works on Render Starter ($7/mo)

**Cons:**
- ❌ ~$0.0001 per query (~$0.30/month for 3k queries)
- ❌ Requires internet

**Cost:** For typical usage (100 queries/day), expect **$0.30/month** in embedding costs.

### HuggingFace Embeddings (Local) 🔧

**Best for:** Self-hosting, high traffic (30k+ queries/month), privacy-critical apps

```bash
# In .env
EMBEDDING_MODE=local

# Install additional dependencies
pip install sentence-transformers transformers
```

**Pros:**
- ✅ Completely free
- ✅ Private (data never leaves your server)
- ✅ Works offline

**Cons:**
- ❌ 500MB+ RAM usage
- ❌ 5-10 second startup time
- ❌ Needs 4GB+ server (Render Pro $85/mo)

**📖 See [EMBEDDINGS_GUIDE.md](EMBEDDINGS_GUIDE.md) for complete documentation, cost analysis, and when to use each mode.**

### 🔄 Compatibility Note

**Both embedding modes use 384 dimensions** to ensure complete compatibility:
- ✅ Switch between OpenAI and HuggingFace anytime
- ✅ Mix modes (query with cloud, index locally, or vice versa)
- ✅ No re-indexing needed when switching
- ✅ OpenAI is configured to match HuggingFace dimensions

This means you can start with OpenAI (cloud) and switch to HuggingFace (local) later without any database changes!

---

## 🔄 Switching Between Local & Cloud LLM Models

The chatbot supports both **local models** (via LM Studio) and **cloud models** (via OpenAI API) with a simple CLI flag.

### 🆕 Quick Switch via CLI Flag

**Cloud Mode (Default - Recommended):**
```bash
uv run python tests/chamorro-chatbot-3.0.py
```
- ✅ Fast (5-15s responses)
- ✅ Smart (GPT-4o-mini)
- ✅ Enhanced prompts with structured output
- ✅ Cheap ($0.005/translation)

**Local Mode:**
```bash
uv run python tests/chamorro-chatbot-3.0.py --local
```
- ✅ Private (all local)
- ✅ Free (no API costs)
- ✅ Works offline
- ⚠️ Slower (30-60s responses)

---

### Configuration

**Cloud Setup (GPT-4o-mini):**
1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Update `.env`:
   ```env
   OPENAI_API_KEY=sk-your-actual-key-here
   # No need for OPENAI_API_BASE
   ```
3. Run: `uv run python tests/chamorro-chatbot-3.0.py`

**Local Setup (LM Studio):**
1. Install LM Studio from https://lmstudio.ai/
2. Download a model (Qwen 2.5 Coder 32B recommended)
3. Start LM Studio server on port 1234
4. Run: `uv run python tests/chamorro-chatbot-3.0.py --local`

**Custom Local Model:**
Set `LOCAL_MODEL` in `.env`:
```env
LOCAL_MODEL=your-model-name
```

---

### Prompt Differences

**Cloud Mode (Enhanced Prompts):**
- ✨ Structured sections (Translation, Explanation, Examples)
- ✨ Etymology and word origins
- ✨ Cultural context automatically included
- ✨ Multiple examples per response
- ✨ More detailed grammar explanations

**Local Mode (Simple Prompts):**
- 📝 Clear, concise responses
- 📝 Essential information only
- 📝 Optimized for smaller models

---

### Model Recommendations

**Cloud:**
- **Best:** GPT-4o-mini ($0.15/M in, $0.60/M out)
- Also good: GPT-4o, GPT-4-turbo

**Local:**
- **Best:** Qwen 2.5 Coder 32B MLX (37s, 95% accurate)
- Also good: Qwen 2.5 14B, Phi-4-mini

---

See [documentation/MODEL_SWITCHING_GUIDE.md](documentation/MODEL_SWITCHING_GUIDE.md) for detailed comparisons.

---

## 🎓 Learning Tips

1. **Start with General Chat** - Get comfortable asking questions
2. **Try `/learn` mode** - See Chamorro with translations
3. **Use `/chamorro` mode** - Challenge yourself with immersion
4. **Check `/stats`** - Track your progress
5. **Look for 📚** - This emoji means the response used grammar book context!
6. **Check sources** - Page numbers appear at the bottom of RAG responses

## 📖 Documentation

### Core Documentation
- **[RAG Management Guide](documentation/RAG_MANAGEMENT_GUIDE.md)** - PostgreSQL database management
- **[Model Switching Guide](documentation/MODEL_SWITCHING_GUIDE.md)** - Switch between local & cloud models
- **[Improvement Guide](documentation/IMPROVEMENT_GUIDE.md)** - Two-phase improvement roadmap
- **[Conversation Analytics](CONVERSATION_ANALYTICS.md)** - SQL queries & analytics scripts

### API & Frontend Development
- **[API Documentation](api/README.md)** - FastAPI endpoints & usage
- **[Frontend Integration Guide](FRONTEND_INTEGRATION_GUIDE.md)** - Build web/mobile apps
- **[Session Tracking Guide](FRONTEND_SESSION_TRACKING_GUIDE.md)** - Implement conversation sessions
- **[Session Persistence Guide](FRONTEND_SESSION_PERSISTENCE_GUIDE.md)** - localStorage integration
- **[AI Builder Prompt](AI_BUILDER_PROMPT.md)** - Prompt for bolt.new/v0.dev

### Additional Resources
- **[Chamorro Resources Research](documentation/CHAMORRO_RESOURCES_RESEARCH.md)** - Resource analysis
- **[Archived Docs](archive/)** - Upgrade history and reference scripts

## 🚀 Deployment

### Render (Recommended)

This project includes `render.yaml` for easy deployment to Render.com.

**Note:** The `requirements.txt` file is required for Render deployment (Render doesn't support `pyproject.toml` directly). This file is already included in the repo.

**Deployment Steps:**

1. **Create a Render account** at https://render.com

2. **Fork this repository** to your GitHub account

3. **Create a new Web Service** on Render:
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml` and configure build/start commands

4. **Set Environment Variables** in Render dashboard:
   ```
   OPENAI_API_KEY=sk-your-key-here
   DATABASE_URL=your-postgresql-connection-string
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   TAVILY_API_KEY=your-tavily-key-here  # Optional
   ```

5. **Database Setup:**
   - Create a PostgreSQL database on Render
   - Get the **Internal Database URL** (faster for server-to-server)
   - Set as `DATABASE_URL` environment variable
   - The API will handle migrations automatically

6. **Deploy:**
   - Push to your `main` branch
   - Render will automatically build and deploy
   - API will be available at `https://your-service.onrender.com`

### Manual Deployment

If deploying to other platforms (Heroku, Railway, etc.):

1. Ensure Python 3.12+ is available
2. Install dependencies: `pip install -r requirements.txt`
3. Set all required environment variables
4. Run: `python -m uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### Health Check

After deployment, verify the API is running:
```bash
curl https://your-api-url.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "chunks": 44810
}
```

## 🤝 Contributing

Feel free to:
- Add more Chamorro learning resources (PDFs)
- Improve prompts or learning modes
- Report issues or suggest features

## 📄 License

Educational project for learning Chamorro language.

## 🙏 Acknowledgments

This project would not be possible without the following contributors to Chamorro language preservation and education:

### **Content Creators & Educators**
- **Chamoru.info** - Comprehensive online Chamorro dictionary (10,500+ entries)
- **Guampedia.com** - Encyclopedia of Guam's history, culture, and language (2,853 pages)
- **Schyuler Lujan (Lengguahi-ta)** - Structured bilingual Chamorro lessons and educational materials
- **Dr. Sandra Chung (UC Santa Cruz)** - Authoritative academic grammar of Chamorro
- **Peter R. Onedera** - Bilingual Chamorro journalism and language advocacy
- **Rosetta Project** - Linguistic documentation and language preservation

### **Technology & Infrastructure**
- **LM Studio** - Local LLM support for privacy-focused deployments
- **OpenAI** - GPT-4o-mini for cloud-based language processing
- **Brave Search** - Real-time web search integration
- **PostgreSQL + PGVector** - Vector database for semantic search

### **Community**
- **The Chamorro language community** - For keeping the language alive and sharing knowledge
- **All educators, parents, and learners** - For their dedication to language preservation

**Si Yu'os Ma'åse'** (Thank you) to everyone working to preserve and teach the Chamorro language! 🌺

---

**Hafa Adai!** Enjoy your Chamorro learning journey! 🌺

