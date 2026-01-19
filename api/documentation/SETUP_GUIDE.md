# 🌺 HåfaGPT - Developer Setup Guide

> Complete guide to get HåfaGPT running locally for development.

---

## 🔑 Step 0: Get Credentials From Your Team Lead

**Before you start**, ask your team lead for these credentials:

| Credential | What It's For |
|------------|---------------|
| `DATABASE_URL` | PostgreSQL database connection |
| `CLERK_SECRET_KEY` | Backend authentication |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend authentication |
| `OPENAI_API_KEY` | AI embeddings |
| `OPENROUTER_API_KEY` | AI chat (DeepSeek) |

> 💡 **Tip:** Your team lead will share these via Slack DM or a secure password manager. Keep them private!

### ❓ Do I Need to Create My Own Accounts?

**No!** You'll use the team's shared credentials for development:

| Service | Create your own? | Why |
|---------|------------------|-----|
| OpenAI | ❌ No | Uses team's API key (costs money) |
| OpenRouter | ❌ No | Uses team's API key |
| Clerk | ❌ No | Uses team's project (you'll be added) |
| AWS S3 | ❌ No | Optional, uses team's bucket |

The only account you'll create is a **user account in the app itself** (like any normal user would).

### 🌐 Understanding the Shared Development Environment

Unlike Rails where each developer runs `rails db:create` for their own local database, we use a **shared cloud-based development environment**:

```
┌─────────────────────────────────────────┐
│     Shared Clerk (Authentication)       │
│  • All devs see the same user accounts  │
│  • Your test account = visible to team  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   Shared Neon PostgreSQL (Dev Branch)   │
│  • Separate from production database    │
│  • All devs see the same conversations  │
│  • Quiz results, game scores, etc.      │
│  • Includes RAG knowledge base (45K+)   │
└─────────────────────────────────────────┘
```

**How it differs from Rails:**

| Rails (what you know) | HåfaGPT (what we do) |
|-----------------------|----------------------|
| `rails db:create` locally | Shared cloud database |
| Each dev has own users | All devs share users |
| `rails db:seed` for test data | RAG data already in shared DB |
| Complete isolation | Shared development environment |

**What this means for you:**
- ✅ You can see other developers' test data (and they can see yours)
- ✅ Your team lead can help debug your issues
- ✅ No complex setup - everyone uses the same credentials
- ✅ RAG/AI features work immediately (no need to seed 45,000+ chunks)
- ⚠️ Don't put sensitive personal info in test data
- ⚠️ The dev database is **separate from production** - you can't break real users

**Why it's set up this way:**
- Simpler onboarding (no per-developer infrastructure)
- RAG knowledge base is huge (~45,000 chunks) - impractical to seed locally
- Easier collaboration and debugging
- Consistent test environment for the whole team

> 📋 **Future:** We plan to add a local PostgreSQL option for developers who want full isolation. See IMPROVEMENT_GUIDE.md.

---

## ✅ Prerequisites

Make sure you have these installed:

| Tool | Version | Check Command | Install Guide |
|------|---------|---------------|---------------|
| **Node.js** | 18+ | `node --version` | [nodejs.org](https://nodejs.org) |
| **Python** | 3.12+ | `python --version` | [python.org](https://python.org) |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com) |

---

## Step 1: Clone the Repositories

Open your terminal and run:

```bash
# Create a workspace folder
mkdir HafaGPT && cd HafaGPT

# Clone backend
git clone https://github.com/Shimizu-Technology/HafaGPT-API.git

# Clone frontend
git clone https://github.com/Shimizu-Technology/chamorro-chatbot-frontend.git HafaGPT-frontend
```

You should now have:
```
HafaGPT/
├── HafaGPT-API/        # Backend
└── HafaGPT-frontend/   # Frontend
```

---

## Step 2: Set Up the Backend

### 2.1 Install Python dependencies

```bash
cd HafaGPT-API

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
DATABASE_URL=<paste from team lead>
OPENAI_API_KEY=<paste from team lead>
OPENROUTER_API_KEY=<paste from team lead>
CLERK_SECRET_KEY=<paste from team lead>

# These can stay as-is:
CHAT_MODEL=deepseek-v3
EMBEDDING_MODE=openai
```

### 2.3 Test the backend

```bash
uv run uvicorn api.main:app --reload --port 8000
```

Open http://localhost:8000/api/health in your browser. You should see:
```json
{"status": "healthy"}
```

✅ **Backend is running!** Keep this terminal open.

---

## Step 3: Set Up the Frontend

Open a **new terminal** (keep the backend running).

### 3.1 Install Node dependencies

```bash
cd HafaGPT-frontend
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
cd HafaGPT-API
uv run uvicorn api.main:app --reload --port 8000

# Terminal 2: Start frontend
cd HafaGPT-frontend
npm run dev
```

---

## 🔧 Troubleshooting

### "Module not found" (Backend)

```bash
cd HafaGPT-API
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

1. Verify your `DATABASE_URL` is correct
2. Ask team lead if the database is up

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
│  2. Clone repos: HafaGPT-API + chamorro-chatbot-frontend│
│  3. Backend: cd HafaGPT-API && uv sync                  │
│             cp .env.example .env (fill in keys)         │
│             uv run uvicorn api.main:app --reload        │
│  4. Frontend: cd HafaGPT-frontend && npm install        │
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
