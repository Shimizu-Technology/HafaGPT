# 🌺 HåfaGPT - Chamorro Language Learning Platform

> **Currently in Beta** - Free for all users while we test and improve. Paid plans coming to help cover AI costs.

A comprehensive Chamorro language learning platform with AI tutoring, flashcards, quizzes, games, stories, and conversation practice. Built with **RAG** using 45,000+ chunks from Chamorro dictionaries and educational resources.

> 📚 **New to the team?** Start with the **[Developer Setup Guide](documentation/SETUP_GUIDE.md)** for step-by-step onboarding.

**Live:** [hafagpt.com](https://hafagpt.com) | **Frontend:** [chamorro-chatbot-frontend](https://github.com/Shimizu-Technology/chamorro-chatbot-frontend)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat** | RAG-enhanced chatbot with 3 modes (English, Chamorro, Learn) |
| 💬 **Conversation Practice** | 7 role-play scenarios with AI characters |
| 📖 **Story Mode** | 24 bilingual stories with tap-to-translate |
| 🎴 **Flashcards** | Curated decks + dictionary-based (10,350+ words) |
| 📝 **Quizzes** | Multiple choice, fill-in-blank, type answer |
| 📚 **Vocabulary Browser** | Searchable dictionary with 12 categories |
| 🎮 **Learning Games** | Memory Match, Word Scramble, Falling Words, Word Catch, Wordle |
| 💳 **Freemium Model** | Free tier with daily limits, Premium for unlimited |
| 🔐 **Admin Dashboard** | User management, stats, whitelist controls |

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Shimizu-Technology/HafaGPT-API.git
cd HafaGPT-API
uv sync

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys (see documentation/SETUP_GUIDE.md)

# 3. Run the server
uv run uvicorn api.main:app --reload --port 8000

# 4. Test it
curl http://localhost:8000/api/health
```

**Full setup guide:** [documentation/SETUP_GUIDE.md](documentation/SETUP_GUIDE.md)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI + Python 3.12 + Gunicorn |
| **Database** | Neon PostgreSQL + PGVector (connection pooling enabled) |
| **LLM** | DeepSeek V3 (via OpenRouter) |
| **Embeddings** | OpenAI text-embedding-3-small (cloud, not local) |
| **Auth** | Clerk |
| **Billing** | Stripe (via Clerk) |
| **Storage** | AWS S3 |
| **Frontend** | React 18 + TypeScript + Vite |
| **Deployment** | Render Standard (API) + Netlify (Frontend) |

### Infrastructure Details

- **Gunicorn**: 3 workers for parallel request handling
- **Neon Pooling**: PgBouncer via `-pooler` URL suffix (handles 100+ connections)
- **Cloud Embeddings**: OpenAI instead of local models (saves 500MB RAM)
- **Render Standard**: 2GB RAM, auto-deploy on push

### Why Gunicorn Instead of Uvicorn?

| Aspect | Uvicorn (default) | Gunicorn + Uvicorn Workers |
|--------|-------------------|----------------------------|
| **Processes** | 1 process | Multiple (we use 3) |
| **Parallelism** | Async I/O only | True parallelism across CPUs |
| **Memory** | Shared | Each worker has own memory |
| **Crash Recovery** | App crashes = downtime | One worker crashes, others continue |

**Start Command:**
```bash
gunicorn api.main:app -w 3 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 300
```

| Flag | Purpose |
|------|---------|
| `-w 3` | 3 parallel worker processes |
| `-k uvicorn.workers.UvicornWorker` | Use async uvicorn under the hood |
| `--timeout 120` | Kill stuck workers after 2 min |
| `--keep-alive 300` | Keep connections open for streaming (5 min) |

**What works with multiple workers:**
- ✅ Freemium limits (5 chats/day, etc.) - stored in database
- ✅ All database queries - workers share the same DB
- ⚠️ IP rate limiting - in-memory, so ~3x more lenient with 3 workers (minor)

> See [IMPROVEMENT_GUIDE.md](documentation/IMPROVEMENT_GUIDE.md) for full infrastructure documentation.

---

## 📁 Project Structure

```
HafaGPT-API/
├── api/                    # FastAPI endpoints
│   ├── main.py             # Main application
│   ├── models.py           # Pydantic models
│   └── chatbot_service.py  # LLM integration
├── src/rag/                # RAG system
│   ├── chamorro_rag.py     # Core RAG logic
│   └── manage_rag_db.py    # Knowledge base management
├── dictionary_data/        # Chamorro dictionary (13,800+ entries)
├── documentation/          # 📚 Detailed docs
├── evaluation/             # Test suite & benchmarks
└── alembic/                # Database migrations
```

---

## 📚 Documentation

### Getting Started
| Document | Description |
|----------|-------------|
| **[SETUP_GUIDE.md](documentation/SETUP_GUIDE.md)** | 🆕 Local development setup |
| **[IMPROVEMENT_GUIDE.md](documentation/IMPROVEMENT_GUIDE.md)** | Roadmap & feature status |

### How Things Work
| Document | Description |
|----------|-------------|
| **[HOW_AUTH_WORKS.md](documentation/HOW_AUTH_WORKS.md)** | 🔐 Clerk authentication (for devs familiar with bcrypt/JWT) |
| **[HOW_MIGRATIONS_WORK.md](documentation/HOW_MIGRATIONS_WORK.md)** | 🗄️ Alembic migrations (for devs familiar with Rails) |
| **[HOW_RAG_WORKS.md](documentation/HOW_RAG_WORKS.md)** | 🔍 RAG system, hybrid search, vector similarity |
| **[HOW_CRAWLING_AND_PROCESSING_WORKS.md](documentation/HOW_CRAWLING_AND_PROCESSING_WORKS.md)** | 🕷️ Crawl4AI, Docling, chunking |
| **[HOW_EVALUATION_WORKS.md](documentation/HOW_EVALUATION_WORKS.md)** | 🧪 Test suites, running tests, accuracy tracking |
| **[HOW_TTS_WORKS.md](documentation/HOW_TTS_WORKS.md)** | 🔊 Text-to-speech, pronunciation |
| **[HOW_FILE_UPLOADS_WORK.md](documentation/HOW_FILE_UPLOADS_WORK.md)** | 📎 Image/document uploads, S3, vision AI |

### Features
| Document | Description |
|----------|-------------|
| **[BILLING_AND_SUBSCRIPTIONS.md](documentation/BILLING_AND_SUBSCRIPTIONS.md)** | 💳 Freemium model & Clerk/Stripe |
| **[GAMES_FEATURE.md](documentation/GAMES_FEATURE.md)** | 🎮 Learning games |
| **[MODEL_SWITCHING_GUIDE.md](documentation/MODEL_SWITCHING_GUIDE.md)** | 🤖 LLM configuration |

### Data & Sources
| Document | Description |
|----------|-------------|
| **[RAG_MANAGEMENT_GUIDE.md](documentation/RAG_MANAGEMENT_GUIDE.md)** | 📝 Adding documents to RAG |
| **[crawlers/SOURCES.md](crawlers/SOURCES.md)** | 📚 Knowledge base sources |
| **[evaluation/BASELINE_METRICS.md](evaluation/BASELINE_METRICS.md)** | 📊 Accuracy history |

### Testing
| File | Description |
|------|-------------|
| **[evaluation/test_evaluation.py](evaluation/test_evaluation.py)** | 🧪 RAG accuracy tests (240 queries) |
| **[evaluation/test_conversation_context.py](evaluation/test_conversation_context.py)** | 🔄 Multi-turn context tests (6 tests) |

---

## 🔑 Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...           # For embeddings
OPENROUTER_API_KEY=sk-or-...    # For DeepSeek
CLERK_SECRET_KEY=sk_...         # For auth

# Optional
AWS_ACCESS_KEY_ID=...           # For file uploads
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
CHAT_MODEL=deepseek-v3          # Model selection
```

---

## 🧪 API Endpoints

### Chat
- `POST /api/chat` - Send message to AI tutor
- `POST /api/chat/stream` - Streaming response

### Vocabulary
- `GET /api/vocabulary/categories` - List categories
- `GET /api/vocabulary/search?q=...` - Search dictionary
- `GET /api/daily-word` - Word of the day

### Quizzes & Games
- `POST /api/quiz/generate` - Generate quiz
- `POST /api/quiz/results` - Save quiz result
- `POST /api/games/results` - Save game result

### Admin
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id` - Update user

**Full API docs:** http://localhost:8000/docs

---

## 💰 Costs (Monthly)

| Service | Cost |
|---------|------|
| Render Standard (API) | $25 |
| Neon PostgreSQL | $0 (free tier) |
| DeepSeek V3 | $0.50-2 |
| OpenAI Embeddings | $0.30 |
| OpenAI TTS | $0.50-2 |
| AWS S3 | $0.05 |
| **Total** | **~$26-30** |

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file

---

**Built with ❤️ for the Chamorro language community 🌺**
