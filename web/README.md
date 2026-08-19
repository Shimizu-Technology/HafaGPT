# 🌺 HåfaGPT Frontend

> **Currently in Beta** - Free for all users while we test and improve.

React + TypeScript web interface for the HåfaGPT Chamorro language learning platform.

> 📚 **New to the team?** Start with the **[Developer Setup Guide](https://github.com/Shimizu-Technology/HafaGPT/blob/main/api/documentation/SETUP_GUIDE.md)** in the backend repo for complete onboarding instructions.

**Live:** [hafagpt.com](https://hafagpt.com) | **Repository:** [Shimizu-Technology/HafaGPT](https://github.com/Shimizu-Technology/HafaGPT)

---

## 🚀 Quick Start

```bash
# 1. Clone the monorepo
git clone https://github.com/Shimizu-Technology/HafaGPT.git
cd HafaGPT
cd web

# 2. Install dependencies
npm ci

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your Clerk key (get from team lead or Clerk dashboard)

# 4. Run dev server
npm run dev
```

Open http://localhost:5173

> **Note:** The backend in `../api` must be running on port 8000.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| React Query | Data Fetching |
| Clerk | Authentication |
| Lucide | Icons |

---

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── Chat.tsx          # Main chat interface
│   ├── HomePage.tsx      # Landing page
│   ├── Games.tsx         # Game hub
│   ├── admin/            # Admin dashboard
│   └── ...
├── hooks/                # Custom React hooks
│   ├── useChatbot.ts     # Chat API
│   ├── useSubscription.ts # Freemium limits
│   └── ...
├── App.tsx               # Routes
└── main.tsx              # Entry point
```

---

## 🔧 Environment Variables

```env
# Required
VITE_API_URL=http://localhost:8000          # Backend URL
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...      # Clerk auth

# Optional
VITE_PUBLIC_POSTHOG_KEY=phc_...             # Analytics
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

## 📜 Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview build
npm run lint     # Run linter
npm run test     # Run component and unit tests
npm run test:e2e # Run desktop and mobile critical browser flows
```

### Browser tests

Install Chromium once, then build and run the browser suite:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

The default suite uses mocked public API responses and never sends chat
messages or changes learner data. It covers the public home, translation
intent, dictionary search, stories, protected-route behavior, console errors,
and horizontal overflow at desktop and mobile sizes.

An authenticated settings smoke test is available when all three variables
below are supplied for a dedicated Clerk development test user. The generated
session file stays under the ignored `playwright/.clerk/` directory.

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
E2E_CLERK_USER_EMAIL=test-user@example.com
```

---

## 🚢 Deployment

Auto-deploys to Netlify on push to `main`.

**Netlify Settings:**
- Base directory: `web`
- Build command: `npm run build`
- Publish directory: `dist`
- Set env vars in Netlify dashboard

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check backend is running on correct port |
| Auth not working | Verify Clerk key matches backend |
| Blank page | Check browser console for errors |

---

## 📚 Full Documentation

See **[api/documentation/](https://github.com/Shimizu-Technology/HafaGPT/tree/main/api/documentation)** for:
- Setup Guide (employee onboarding)
- How Auth Works (Clerk vs bcrypt/JWT)
- How Migrations Work (Alembic vs Rails)
- Billing & Subscriptions
- Games Feature
- Roadmap

---

**Håfa Adai!** 🌺
