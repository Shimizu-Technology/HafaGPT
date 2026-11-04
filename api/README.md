# 🌺 HåfaGPT - Chamorro Language Learning Platform

> **Currently in Beta** - Free for all users while we test and improve. Paid plans coming to help cover AI costs.

A comprehensive Chamorro language learning platform with AI tutoring, flashcards,
quizzes, games, stories, and conversation practice. The production RAG path is
currently governed around a legacy 44,865-row corpus; its duplication, provenance,
and permission gaps are documented and must not be described as 45,000 verified
language facts. Model evaluation uses a separate 101-entry purpose-locked corpus.

> **Language trust status:** source-backed is not the same as native-reviewed or
> licensed for production reuse. See the
> [resource program](documentation/LANGUAGE_RESOURCE_PROGRAM_2026.md) and
> [August 8 execution record](documentation/PHASE_1_2_EXECUTION_2026-08-08.md).
> The current 23-model landscape is tracked in
> [FRONTIER_MODEL_RESEARCH_2026-08-08.md](documentation/FRONTIER_MODEL_RESEARCH_2026-08-08.md).

> 📚 **New to the team?** Start with the **[Developer Setup Guide](documentation/SETUP_GUIDE.md)** for step-by-step onboarding.

**Live:** [hafagpt.com](https://hafagpt.com) | **Repository:** [Shimizu-Technology/HafaGPT](https://github.com/Shimizu-Technology/HafaGPT)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat** | RAG-enhanced chatbot with 3 modes (English, Chamorro, Learn) |
| 💬 **Conversation Practice** | 7 role-play scenarios with AI characters |
| 📖 **Story Mode** | Permission-gated story catalog with tap-to-translate UI |
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
git clone https://github.com/Shimizu-Technology/HafaGPT.git
cd HafaGPT
cd api
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt pytest

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys (see documentation/SETUP_GUIDE.md)

# 3. Run the server
.venv/bin/python -m uvicorn api.main:app --reload --port 8000

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
| **LLM** | GPT-5.6 Luna tutor; GPT-6 Luna flashcards; GPT-6.1 Terra practice (OpenRouter) |
| **Embeddings** | OpenAI text-embedding-3-small |
| **Auth** | Clerk |
| **Storage** | AWS S3 |
| **Frontend** | React 18 + TypeScript + Vite |
| **Deployment** | Render (API) + Netlify (Frontend) |

---

## 📁 Project Structure

```
api/
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
OPENROUTER_API_KEY=sk-or-...    # For tutor, flashcards, practice, and summaries
CLERK_SECRET_KEY=sk_...         # For auth

# Optional
AWS_ACCESS_KEY_ID=...           # For file uploads
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
CHAT_MODEL=gpt-5.6-luna         # Tutor and photos; unchanged production value
FLASHCARD_MODEL=gpt-6-luna      # Optional alias; default shown
PRACTICE_MODEL=gpt-6.1-terra     # Optional alias; default shown
```

`CHAT_MODEL`, `FLASHCARD_MODEL`, and `PRACTICE_MODEL` must name an alias in
`MODEL_CONFIG`: `gpt-5.6-luna`, `gpt-6-luna`, or `gpt-6.1-terra`. Unknown aliases,
empty values, and missing provider keys fail startup with `ModelConfigurationError`.
No production environment change is needed: `CHAT_MODEL=gpt-5.6-luna` stays valid.

Flashcards use reasoning `none`, a 6,000-token output cap, and no temperature;
practice uses reasoning `none`, a 2,000-token cap, JSON object output, and no
temperature. Both have a 45-second provider timeout with no automatic SDK retries.
Failures return a friendly retry message and use the shared provider alerts.

**Rollback:** set either feature alias to `gpt-5.6-luna` and restart. This retains
the new parsing, caps, and error handling. Leave `CHAT_MODEL=gpt-5.6-luna` for the
established tutor/photo route. The old DeepSeek rollback is removed. A text-only
chat model routes images explicitly to `gpt-5.6-luna`, or fails clearly if that
route is unavailable; vision-capable chat models keep their existing image path.

History/document summaries use `openai/gpt-6-luna` with reasoning `none` and keep
the existing truncation fallback. `gpt-4o` in token-manager defaults selects only
a local tiktoken encoding; it makes no provider call.

Live and newly generated admin speech use ElevenLabs only. If it is unavailable,
`/api/tts` returns 503; the web hook clears its generated-audio state and attempts
device speech (a Spanish approximation), or reports audio unavailable. Static
MP3s and their manifests are unchanged. Historical OpenAI candidates remain
reviewable/playable. `OPENAI_API_KEY` is still required for `text-embedding-3-small`.

OpenAI has no supported Speech API drop-in beyond the January 6, 2027 shutdown:
[`gpt-realtime-2.1-mini` requires Realtime](https://developers.openai.com/api/docs/guides/text-to-speech),
and [all listed Speech API models retire together](https://developers.openai.com/api/docs/deprecations).
No realtime integration is included.

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
| OpenRouter generation | Usage-dependent |
| OpenAI Embeddings | $0.30 |
| ElevenLabs speech | Usage-dependent |
| AWS S3 | $0.05 |
| **Total** | **Fixed hosting plus usage** |

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
