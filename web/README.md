# 🌺 HåfaGPT Frontend

> **Currently in Beta** - Free for all users while we test and improve.

React + TypeScript web interface for the HåfaGPT Chamorro language learning platform.

> 📚 **New to the team?** Start with the **[Developer Setup Guide](https://github.com/Shimizu-Technology/HafaGPT-API/blob/main/documentation/SETUP_GUIDE.md)** in the backend repo for complete onboarding instructions.

**Live:** [hafagpt.com](https://hafagpt.com) | **Backend:** [HafaGPT-API](https://github.com/Shimizu-Technology/HafaGPT-API)

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Shimizu-Technology/chamorro-chatbot-frontend.git HafaGPT-frontend
cd HafaGPT-frontend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your Clerk key (get from team lead or Clerk dashboard)

# 4. Run dev server
npm run dev
```

Open http://localhost:5173

> **Note:** Backend must be running on port 8000. See [HafaGPT-API](https://github.com/Shimizu-Technology/HafaGPT-API) for setup.

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
```

---

## 🚢 Deployment

Auto-deploys to Netlify on push to `main`.

**Netlify Settings:**
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

See **[HafaGPT-API/documentation/](https://github.com/Shimizu-Technology/HafaGPT-API/tree/main/documentation)** for:
- Setup Guide (employee onboarding)
- Billing & Subscriptions
- Games Feature
- Roadmap

---

**Håfa Adai!** 🌺
