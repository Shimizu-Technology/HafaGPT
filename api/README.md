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
| **Backend** | FastAPI + Python 3.12 |
| **Database** | Neon PostgreSQL + PGVector |
| **LLM** | DeepSeek V3 (via OpenRouter) |
| **Embeddings** | OpenAI text-embedding-3-small |
| **Auth** | Clerk |
| **Storage** | AWS S3 |
| **Frontend** | React 18 + TypeScript + Vite |
| **Deployment** | Render (API) + Netlify (Frontend) |

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

| Document | Description |
|----------|-------------|
| **[SETUP_GUIDE.md](documentation/SETUP_GUIDE.md)** | 🚀 Start here - local development setup |
| **[HOW_AUTH_WORKS.md](documentation/HOW_AUTH_WORKS.md)** | 🔐 Clerk auth (if you're used to bcrypt/JWT) |
| **[HOW_MIGRATIONS_WORK.md](documentation/HOW_MIGRATIONS_WORK.md)** | 🗄️ Alembic (if you're used to Rails) |
| **[HOW_RAG_WORKS.md](documentation/HOW_RAG_WORKS.md)** | 🔍 How the AI knowledge base works |
| **[HOW_DEPLOYMENT_WORKS.md](documentation/HOW_DEPLOYMENT_WORKS.md)** | 🚀 Gunicorn, Render, production setup |

📂 **More docs:** [documentation/](documentation/) folder

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
