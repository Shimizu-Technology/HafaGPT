# 🌺 HåfaGPT - Developer Setup Guide

> Complete guide to get HåfaGPT running locally for development.

---

## 🔑 Step 0: Get Development Credentials Securely

Use the team's password manager or provider access. Do not move secrets through
chat, email, screenshots, documentation, or Git.

| Credential | What It's For |
|------------|---------------|
| `DATABASE_URL` | Local PostgreSQL + pgvector (`postgresql://localhost/chamorro_rag`) |
| `CLERK_SECRET_KEY` | HåfaGPT **Development** instance backend authentication |
| `VITE_CLERK_PUBLISHABLE_KEY` | Matching HåfaGPT **Development** publishable key |
| `OPENAI_API_KEY` | AI embeddings |
| `OPENROUTER_API_KEY` | AI chat and private model evaluation |

Production Clerk credentials and the production database are not needed for normal
development or model testing.

### Development boundaries

- Use the Clerk Development instance; local test accounts are not production users.
- Use the local `chamorro_rag` database for conversations, progress, and retrieval.
- Do not copy production user data into the local database.
- Treat AI, S3, and analytics keys as billable credentials even in development.
- Use separate provider keys with spend limits when the provider supports them.

---

## ✅ Prerequisites

Make sure you have these installed:

| Tool | Version | Check Command | Install Guide |
|------|---------|---------------|---------------|
| **Node.js** | 20+ | `node --version` | [nodejs.org](https://nodejs.org) |
| **Python** | 3.12+ | `python --version` | [python.org](https://python.org) |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com) |
| **PostgreSQL** | 16+ | `psql --version` | [postgresql.org](https://postgresql.org) |
| **pgvector** | database-compatible | `SELECT extversion FROM pg_extension WHERE extname='vector';` | [pgvector](https://github.com/pgvector/pgvector) |

---

## Step 1: Clone the Repository

Open your terminal and run:

```bash
# Clone the monorepo
git clone https://github.com/Shimizu-Technology/HafaGPT.git
cd HafaGPT
```

You should now have:
```
HafaGPT/
├── api/        # Backend
└── web/   # Frontend
```

---

## Step 2: Set Up the Backend

### 2.1 Install Python dependencies

```bash
cd api

# Install uv (Python package manager) - only needed once
curl -LsSf https://astral.sh/uv/install.sh | sh

# Restart your terminal, then run:
uv sync
```

### 2.2 Create your `.env` file

```bash
cp .env.example .env
```

Now open `.env` in your editor and fill in the credentials from Step 0:

```env
DATABASE_URL=postgresql://localhost/chamorro_rag
OPENAI_API_KEY=<paste from team lead>
OPENROUTER_API_KEY=<paste from team lead>
CLERK_SECRET_KEY=<paste from team lead>

# These can stay as-is:
CHAT_MODEL=deepseek-v3
EMBEDDING_MODE=openai
```

### 2.3 Verify the local RAG database

```bash
psql -d chamorro_rag -c "SELECT COUNT(*) FROM langchain_pg_embedding;"
psql -d chamorro_rag -c "SELECT '[1,2,3]'::vector <=> '[1,2,4]'::vector;"
```

If PostgreSQL reports that `$libdir/vector` is missing, the installed pgvector
bottle was built for a different PostgreSQL major version. Install/build pgvector
against the `pg_config` belonging to the running server; do not point local testing
at production as a workaround.

### 2.4 Test the backend

```bash
uv run uvicorn api.main:app --reload --port 8000
```

Open http://localhost:8000/api/health in your browser. You should see:
```json
{"status": "healthy", "database": "not_checked", "chunks": null}
```

This is intentionally a process-level liveness check. It does not contact the
database or AI providers.

✅ **Backend is running!** Keep this terminal open.

---

## Step 3: Set Up the Frontend

Open a **new terminal** (keep the backend running).

### 3.1 Install Node dependencies

```bash
cd web
npm install
```

### 3.2 Create your `.env.local` file

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=<paste from team lead>
```

### 3.3 Start the frontend

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

✅ **Frontend is running!** You should see the HåfaGPT homepage.

---

## Step 4: Create Your Account & Test

1. Click **Sign Up** on the homepage
2. Create an account with your **work email**
3. Verify your email if prompted
4. Try sending a message in the chat!

> 💡 **You create your own account** - Your team lead doesn't create it for you. Just sign up like any normal user would.

---

## Step 5: Get Admin/Premium Access

After you've created your account, **tell your team lead your email** so they can give you admin access.

### What Your Team Lead Will Do

1. Log into the app at `http://localhost:5173`
2. Go to **Admin Dashboard** → **Users**
3. Search for your email and click on your user
4. Click **"Grant Admin"** button → Confirm

That's it! The app UI handles everything.

### What You Do

1. **Refresh** the app in your browser
2. Click your avatar (top right)
3. You should now see **Admin Dashboard** in the menu!

> 📖 **Want to understand how auth works?** See [HOW_AUTH_WORKS.md](HOW_AUTH_WORKS.md) for a comparison with bcrypt/JWT.

---

## 🎉 You're Done!

Your local development environment is ready. Here's what you have:

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **Admin Dashboard** | http://localhost:5173/admin |

### Daily Workflow

```bash
# Terminal 1: Start backend
cd api
uv run uvicorn api.main:app --reload --port 8000

# Terminal 2: Start frontend
cd web
npm run dev
```

---

## 🔧 Troubleshooting

### "Module not found" (Backend)

```bash
cd api
uv sync  # Reinstall dependencies
```

### "CORS error" in browser

Make sure backend is running on port 8000 and your frontend `.env.local` has:
```env
VITE_API_URL=http://localhost:8000
```

### "Clerk error" or login not working

1. Double-check your Clerk keys are correct
2. Make sure you're using **Development** keys (not Production)
3. Clear browser cookies and try again

### Backend won't start / Database error

1. Verify `DATABASE_URL=postgresql://localhost/chamorro_rag`.
2. Confirm the PostgreSQL service is running.
3. Run both verification queries from Step 2.3.
4. Confirm pgvector was built for the same PostgreSQL major version.

### "Admin access denied"

Make sure you completed Step 5 (setting `"role": "admin"` in Clerk).

---

## 📚 Learn More

| Topic | Document |
|-------|----------|
| How authentication works | [HOW_AUTH_WORKS.md](HOW_AUTH_WORKS.md) ← If you're used to bcrypt/JWT |
| How migrations work | [HOW_MIGRATIONS_WORK.md](HOW_MIGRATIONS_WORK.md) ← If you're used to Rails migrations |
| How the AI works | [HOW_RAG_WORKS.md](HOW_RAG_WORKS.md) |
| Billing system | [BILLING_AND_SUBSCRIPTIONS.md](BILLING_AND_SUBSCRIPTIONS.md) |
| Learning games | [GAMES_FEATURE.md](GAMES_FEATURE.md) |
| Project roadmap | [IMPROVEMENT_GUIDE.md](IMPROVEMENT_GUIDE.md) |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  HåfaGPT Quick Start                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Get credentials from team lead                      │
│  2. Clone Shimizu-Technology/HafaGPT                 │
│  3. Backend: cd api && uv sync                  │
│             cp .env.example .env (fill in keys)         │
│             uv run uvicorn api.main:app --reload        │
│  4. Frontend: cd web && npm install        │
│              cp .env.example .env.local (fill in keys)  │
│              npm run dev                                │
│                                                         │
│  URLs:                                                  │
│    App:      http://localhost:5173                      │
│    API:      http://localhost:8000                      │
│    Admin:    http://localhost:5173/admin                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Welcome to the team! 🌺**
