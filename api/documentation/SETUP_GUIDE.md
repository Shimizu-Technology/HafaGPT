# 🌺 HåfaGPT - Developer Setup Guide

> Complete guide to get HåfaGPT running locally for development.

---

## Prerequisites

Before you start, make sure you have:

| Tool | Version | Check Command |
|------|---------|---------------|
| **Node.js** | 18+ | `node --version` |
| **Python** | 3.12+ | `python --version` |
| **Git** | Any | `git --version` |

Optional (for database):
- **PostgreSQL** 15+ (or use the hosted Render database)

---

## 1. Clone the Repositories

```bash
# Clone the main workspace (contains both repos as subfolders)
git clone https://github.com/ShimizuTechnology/HafaGPT.git
cd HafaGPT

# Or clone separately:
git clone https://github.com/ShimizuTechnology/HafaGPT-API.git
git clone https://github.com/ShimizuTechnology/HafaGPT-frontend.git
```

---

## 2. Backend Setup (HafaGPT-API)

### Install Dependencies

```bash
cd HafaGPT-API

# Install uv (Python package manager) if not installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync
```

### Environment Variables

Create `.env` file in `HafaGPT-API/`:

```bash
# Copy the example (or create manually)
cp .env.example .env
```

Required variables:

```env
# Database (get from team lead or use Render dashboard)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...

# OpenRouter (for DeepSeek chat model)
OPENROUTER_API_KEY=sk-or-...

# Clerk (authentication) - get from Clerk Dashboard
CLERK_SECRET_KEY=sk_test_...

# AWS S3 (for file uploads) - optional for local dev
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=hafagpt-uploads

# Chat model selection
CHAT_MODEL=deepseek-v3
EMBEDDING_MODE=openai
```

### Getting API Keys

| Service | Where to Get | Notes |
|---------|--------------|-------|
| **OpenAI** | [platform.openai.com](https://platform.openai.com/api-keys) | For embeddings |
| **OpenRouter** | [openrouter.ai](https://openrouter.ai/keys) | For DeepSeek |
| **Clerk** | [dashboard.clerk.com](https://dashboard.clerk.com) | See Clerk Setup below |
| **AWS S3** | Ask team lead | Optional for local |

### Run the Backend

```bash
cd HafaGPT-API

# Option 1: Using uv (recommended)
uv run uvicorn api.main:app --reload --port 8000

# Option 2: Use the dev script
./scripts/dev-network.sh
```

Backend runs at: **http://localhost:8000**

Test it: `curl http://localhost:8000/api/health`

---

## 3. Frontend Setup (HafaGPT-frontend)

### Install Dependencies

```bash
cd HafaGPT-frontend
npm install
```

### Environment Variables

Create `.env.local` file in `HafaGPT-frontend/`:

```env
# Backend URL
VITE_API_URL=http://localhost:8000

# Clerk (get from Clerk Dashboard → API Keys)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Run the Frontend

```bash
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 4. Clerk Setup (Authentication)

Clerk handles all user authentication. Here's how to get set up:

### Get Your Keys

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign in with your work email (ask team lead to add you)
3. Select the **HafaGPT** application
4. Go to **API Keys** in the sidebar
5. Copy:
   - `CLERK_SECRET_KEY` → backend `.env`
   - `VITE_CLERK_PUBLISHABLE_KEY` → frontend `.env.local`

### Set Yourself as Admin

To access the admin dashboard:

1. Go to Clerk Dashboard → **Users**
2. Find your user (search by email)
3. Click on your user
4. Scroll to **Public metadata**
5. Click **Edit** and set:

```json
{
  "role": "admin",
  "is_premium": true
}
```

6. Save
7. Refresh your local app
8. Click your profile avatar → **Admin Dashboard**

### Set Yourself as Premium (for testing)

Same as above, but just:

```json
{
  "is_premium": true
}
```

---

## 5. Database Access

### Option A: Use Hosted Database (Recommended)

The team uses a shared PostgreSQL database on Render. Get the `DATABASE_URL` from your team lead.

### Option B: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb hafagpt_dev

# Set DATABASE_URL
DATABASE_URL=postgresql://localhost/hafagpt_dev
```

Run migrations:

```bash
cd HafaGPT-API
uv run alembic upgrade head
```

---

## 6. Running Both Together

### Terminal 1 - Backend

```bash
cd HafaGPT-API
./scripts/dev-network.sh
# Or: uv run uvicorn api.main:app --reload --port 8000
```

### Terminal 2 - Frontend

```bash
cd HafaGPT-frontend
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/api/health |
| Admin Dashboard | http://localhost:5173/admin |

---

## 7. Common Issues & Fixes

### "Module not found" errors (Backend)

```bash
cd HafaGPT-API
uv sync  # Reinstall dependencies
```

### "CORS error" in browser

Make sure backend is running on port 8000 and frontend `.env.local` has:
```env
VITE_API_URL=http://localhost:8000
```

### "Clerk error" or auth not working

1. Check your Clerk keys are correct
2. Make sure you're using **Development** instance keys (not Production)
3. Clear browser cookies and try again

### Database connection errors

1. Verify `DATABASE_URL` is correct
2. Check if you can connect directly:
   ```bash
   psql $DATABASE_URL
   ```

### "Admin access denied"

Make sure your Clerk user has `"role": "admin"` in public metadata.

---

## 8. Project Structure

```
HafaGPT/
├── HafaGPT-API/              # Backend (FastAPI + Python)
│   ├── api/                  # API endpoints
│   ├── src/rag/              # RAG system
│   ├── dictionary_data/      # Chamorro dictionary
│   ├── documentation/        # 📚 You are here
│   └── evaluation/           # Test suite
│
├── HafaGPT-frontend/         # Frontend (React + TypeScript)
│   ├── src/components/       # React components
│   ├── src/hooks/            # Custom hooks
│   └── public/               # Static assets
│
└── .cursorrules              # AI assistant rules
```

---

## 9. Useful Commands

### Backend

```bash
# Run server
uv run uvicorn api.main:app --reload --port 8000

# Run tests
uv run pytest

# Add a dependency
uv add <package>
uv pip compile pyproject.toml --universal -o requirements.txt

# Database migration
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "description"
```

### Frontend

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Add a dependency
npm install <package>
```

---

## 10. Getting Help

- **Documentation**: See other files in `documentation/` folder
- **Roadmap**: `IMPROVEMENT_GUIDE.md`
- **Billing/Subscriptions**: `BILLING_AND_SUBSCRIPTIONS.md`
- **Games**: `GAMES_FEATURE.md`
- **RAG System**: `HOW_RAG_WORKS.md`

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  HåfaGPT Quick Start                                    │
├─────────────────────────────────────────────────────────┤
│  Backend:  cd HafaGPT-API && ./scripts/dev-network.sh   │
│  Frontend: cd HafaGPT-frontend && npm run dev           │
│                                                         │
│  URLs:                                                  │
│    App:      http://localhost:5173                      │
│    API:      http://localhost:8000                      │
│    Admin:    http://localhost:5173/admin                │
│                                                         │
│  Become Admin:                                          │
│    Clerk → Users → Edit metadata → {"role": "admin"}    │
└─────────────────────────────────────────────────────────┘
```

---

**Welcome to the team! 🌺**

