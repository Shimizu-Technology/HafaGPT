# 🌺 Chamorro Language Learning Chatbot

An AI-powered chatbot for learning Chamorro (the native language of Guam) with **Retrieval-Augmented Generation (RAG)** using authoritative grammar books, dictionaries, and online resources.

**🆕 LATEST:** Speech-to-text input + Image upload with GPT-4o-mini Vision + S3 storage! 🎤📸

## ✨ Features

- 🤖 **3 Learning Modes:**
  - **General Chat** - Ask anything about Chamorro in English
  - **Immersion Mode** (`/chamorro`) - Chamorro-only responses
  - **Learning Mode** (`/learn`) - Chamorro with English breakdowns

- 🎤 **Multimodal Input:**
  - **Speech-to-Text** - Speak your questions using browser microphone (Web Speech API)
  - **Image Upload** - Take photos of Chamorro documents/text for translation and explanation
  - **Vision AI** - GPT-4o-mini analyzes images and reads Chamorro text
  - **S3 Storage** - Persistent image storage with AWS S3 (images survive page refreshes)

- 📚 **RAG-Enhanced Knowledge (44,810 chunks):**
  - 🗄️ **PostgreSQL + PGVector** - Production-grade vector database
  - 📖 **Complete Chamoru.info Dictionary** - All 10,500 dictionary entries (IDs 1-10,500) ✨ **COMPLETE!**
  - 📰 **85 Bilingual PDN Articles** - Peter Onedera's Chamorro opinion columns (2016-2022)
  - 📚 **Grammar Books & Dictionaries** - Authoritative references from Dr. Sandra Chung & historical sources
  - 🔍 **Powered by Docling** - Advanced PDF processing with table detection
  - 🌐 **Web Crawling** - Crawl4AI integration with site-specific crawlers
  - 🔎 **Web Search** - Brave Search API for real-time information
  - ⚡ **Hybrid RAG** - Smart detection: full search for Chamorro questions, skip for simple chat
  - 🎯 **Smart Source Prioritization** - Modern bilingual content prioritized (PDN +110 score boost)
  - 🔤 **Character Normalization** - Handles spelling variations (glottal stops, accents, case)
  - 🧠 **Dynamic Source System** - Automatically describes available knowledge sources
  - **Token-aware chunking** - Optimal semantic boundaries for better retrieval
  - **Source citations** - Shows which sources and page numbers were referenced

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

**Local Development (Desktop Only):**

Easy startup with the helper script:
```bash
./start.sh
```

Or manually:
```bash
uv run python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Access the API:
- **API Root:** http://localhost:8000
- **Interactive Docs:** http://localhost:8000/api/docs
- **Health Check:** http://localhost:8000/api/health

**Mobile Testing (Network Access):**

```bash
./dev-network.sh
```

This will:
- ✅ Auto-detect your local IP address
- ✅ Start FastAPI on your network (accessible from phone)
- ✅ Display URLs for API, docs, and mobile access
- ✅ Example: `http://192.168.1.190:8000`

**Requirements:**
- Phone and computer must be on the same WiFi network
- Make sure firewall allows port 8000
- Backend will be accessible at `http://YOUR_IP:8000`

**Option B: CLI (Command Line Interface)**

**Cloud Mode (Default - Recommended):**
```bash
# Uses GPT-4o-mini via OpenAI API (fast, accurate, cheap)
uv run python chamorro-chatbot-3.0.py
```

**Local Mode (Private & Free):**
```bash
# Uses local model via LM Studio (slower, but free)
uv run python chamorro-chatbot-3.0.py --local
```

**View Help:**
```bash
uv run python chamorro-chatbot-3.0.py --help
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
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hafa adai!", "mode": "english", "session_id": "test-123"}'
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
uv run python manage_rag_db.py list
```

### Add All PDFs from a Folder
```bash
# Simple! Finds all PDFs and indexes them (skips duplicates automatically)
uv run python manage_rag_db.py add-all knowledge_base/pdfs/
```

### Add Individual PDFs
```bash
uv run python manage_rag_db.py add knowledge_base/pdfs/new_vocab.pdf
```

### Add Website Content (NEW!)
```bash
# Add a webpage
uv run python crawl_website.py http://www.chamoru.info/dictionary/

# Crawl deeper (follow internal links)
uv run python crawl_website.py https://guampedia.com --max-depth 2
```

**Perfect for:** Online dictionaries, language learning sites, cultural resources

### Check for Duplicates
```bash
uv run python manage_rag_db.py check knowledge_base/pdfs/grammar.pdf
```

### Database Stats
```bash
uv run python manage_rag_db.py stats
```

See [documentation/RAG_MANAGEMENT_GUIDE.md](documentation/RAG_MANAGEMENT_GUIDE.md) for complete documentation.

## 📁 Project Structure

```
llm-project/
├── chamorro-chatbot-3.0.py    # Main chatbot CLI (dynamic source system)
├── chamorro_rag.py            # RAG system (PostgreSQL + character normalization)
├── manage_rag_db.py           # Database management tool
├── improved_chunker.py        # Docling processor + token-aware chunker
├── web_search_tool.py         # Web search integration (Brave API)
├── crawl_website.py           # Generic web crawling (Crawl4AI)
├── crawl_pdn_batch.sh         # Batch crawler for PDN articles
├── pdn_urls.txt               # URL list for batch processing
├── README.md                  # This file
├── pyproject.toml             # Project dependencies
├── .env                       # API configuration (keys, database URL)
├── rag_metadata.json          # Document & website tracking (~1,150 sources)
├── api/                       # 🌐 FastAPI web service
│   ├── main.py                # FastAPI app & routes
│   ├── models.py              # Pydantic request/response models
│   ├── chatbot_service.py     # Core chatbot logic (shared with CLI)
│   └── README.md              # API documentation
├── crawlers/                  # 🕷️ Site-specific crawlers
│   ├── README.md              # Crawler usage guide
│   ├── SOURCES.md             # Human-readable source tracker
│   ├── pacific_daily_news.py  # PDN crawler with content cleaning
│   └── _template.py           # Template for new site crawlers
├── documentation/             # 📖 All project documentation
│   ├── RAG_MANAGEMENT_GUIDE.md         # Database & content management
│   ├── MODEL_SWITCHING_GUIDE.md        # Local vs cloud models
│   ├── IMPROVEMENT_GUIDE.md            # Roadmap & optimization triggers
│   ├── CHAMORRO_RESOURCES_RESEARCH.md  # Resource analysis
│   ├── FRONTEND_INTEGRATION_GUIDE.md   # API integration for frontends
│   ├── FRONTEND_SESSION_TRACKING_GUIDE.md  # Session management
│   └── FRONTEND_SESSION_PERSISTENCE_GUIDE.md  # localStorage persistence
├── CONVERSATION_ANALYTICS.md  # 📊 SQL queries & analytics scripts
├── AI_BUILDER_PROMPT.md       # 🤖 Prompt for AI frontend builders
├── knowledge_base/            # 📚 RAG source materials
│   ├── pdfs/                  # Chamorro grammar books & dictionaries
│   └── README.md              # Source documentation
└── archive/                   # 📦 Archived scripts & docs
    ├── old-chatbot-versions/  # Previous versions
    ├── learning-examples/     # Learning scripts
    ├── crawl-scripts/         # Archived crawl patterns
    ├── migration/             # ChromaDB → PostgreSQL migration
    └── upgrade-docs/          # Technical documentation
```

## 🛠️ Tech Stack

- **Language:** Python 3.12+
- **LLM:** Cloud (GPT-4o-mini) or Local (LM Studio - Qwen 2.5 Coder 32B)
- **Database:** PostgreSQL 16 + PGVector for vector storage
- **API Framework:** FastAPI + Uvicorn (ASGI server)
- **Document Processing:** Docling (advanced PDF understanding)
- **Web Scraping:** Crawl4AI (AI-optimized web content extraction)
- **Chunking:** Token-aware semantic chunking (350 tokens/chunk)
- **Embeddings:** OpenAI text-embedding-3-small (cloud, default) or HuggingFace multilingual-MiniLM-L12-v2 (local)
- **UI:** prompt_toolkit for enhanced CLI
- **Data Validation:** Pydantic models
- **Logging:** PostgreSQL conversation logs with session tracking
- **Dependencies:** See `pyproject.toml`

## 📚 Indexed Resources

**Current knowledge base: ~1,150+ sources, 44,810 chunks** ✨

### **🌟 Bilingual Modern Content (Prioritized):**
1. **Pacific Daily News - Chamorro Opinion Columns** (85 articles, 2016-2022)
   - Author: Peter R. Onedera (Chamorro language advocate)
   - Format: Full Chamorro text + English translations
   - Topics: Culture, politics, health, community, FestPac, language preservation
   - **Score boost: +110** (highest priority in search results)

### **📖 Dictionary & Language Resources:**
2. **Chamoru.info Dictionary** (10,500 entries - **COMPLETE!** ✅)
   - All dictionary entries from IDs 1-10,500
   - Modern dictionary with definitions, examples, pronunciation, etymology
   - Contemporary Chamorro usage and idioms
   - **Two-phase crawl system:** Phase 1 (IDs 1-6,500: 6,500 entries) + Phase 2 (IDs 6,501-10,500: 4,000 entries)
   - Total chunks from dictionary: ~13,700
   
### **📚 Grammar Books & Reference Materials (PDFs):**
3. **Chamorro Grammar** by Dr. Sandra Chung (1998, 754 pages)
4. **Dictionary and Grammar of the Chamorro Language** (1865, historical reference)
5. **Revised Chamorro Dictionary** (comprehensive vocabulary)
6. **Rosetta Project Chamorro Vocabulary** (linguistic documentation)

### **Source Prioritization:**
The RAG system automatically prioritizes sources based on:
- **+110 boost:** Pacific Daily News bilingual articles (modern, contextual)
- **+100 boost:** Chamorro Grammar by Dr. Sandra Chung (authoritative)
- **+80 boost:** Chamoru.info (contemporary usage)
- **+50 boost:** Other dictionaries and reference materials

This ensures modern, conversational Chamorro appears first in search results!

### **Real-Time Information:**
- **Web Search (Brave API):** Current events, news, recipes, cultural information
- **Weather Data:** Integrated weather information with Chamorro vocabulary

---

**Note:** The knowledge base contains 927 tracked sources in `rag_metadata.json`. The actual PostgreSQL database has 23,564 indexed chunks (some early content was added before comprehensive tracking was implemented).

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
uv run python chamorro-chatbot-3.0.py
```
- ✅ Fast (5-15s responses)
- ✅ Smart (GPT-4o-mini)
- ✅ Enhanced prompts with structured output
- ✅ Cheap ($0.005/translation)

**Local Mode:**
```bash
uv run python chamorro-chatbot-3.0.py --local
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
3. Run: `uv run python chamorro-chatbot-3.0.py`

**Local Setup (LM Studio):**
1. Install LM Studio from https://lmstudio.ai/
2. Download a model (Qwen 2.5 Coder 32B recommended)
3. Start LM Studio server on port 1234
4. Run: `uv run python chamorro-chatbot-3.0.py --local`

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

- Dr. Sandra Chung's comprehensive Chamorro Grammar
- The Chamorro language community
- LM Studio for local LLM support

---

**Hafa Adai!** Enjoy your Chamorro learning journey! 🌺

