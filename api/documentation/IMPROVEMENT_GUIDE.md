# 🌺 HåfaGPT - Development Roadmap

> **Current Status:** Production-ready Chamorro language learning platform with freemium model
> **Last Updated:** December 2025

---

## ✅ Completed Features

All completed features are documented in [`IMPROVEMENT_GUIDE_V1_ARCHIVE.md`](./IMPROVEMENT_GUIDE_V1_ARCHIVE.md).

**Summary of what's built:**
- 🤖 AI Chat with RAG (45,000+ chunks, DeepSeek V3)
- 💬 Conversation Practice (7 scenarios)
- 📖 Story Mode (24 stories with tap-to-translate)
- 🎴 Flashcards (curated + dictionary-based)
- 📝 Quizzes (curated + dictionary-based, database-tracked)
- 📚 Vocabulary Browser (10,350+ words)
- 📅 Daily Word
- 🎮 Learning Games (Memory Match, Word Scramble, Falling Words, Word Catch, Chamorro Wordle)
- 💳 Freemium Model (Clerk Billing + Stripe)
- 📊 Progress Dashboard
- 🔐 Authentication (Clerk)
- 📱 Mobile-optimized responsive design

---

## 🎯 Active Roadmap

### **Priority 1: Admin Dashboard** 🔧

> **Goal:** Web interface to manage users, subscriptions, and content without touching code.

| Phase | Features | Effort | Status |
|-------|----------|--------|--------|
| Phase 1 | User Management + Whitelist | 2-3 sessions | ✅ Complete |
| Phase 2 | Analytics Dashboard | 1-2 sessions | 📋 Planned |
| Phase 3 | Content Management | 2-3 sessions | 📋 Planned |

#### **Phase 1: User Management (MVP)** ✅

**Routes:**
```
/admin                → Dashboard overview
/admin/users          → User list with search/filter
```

**Completed Features:**
- [x] Admin role check (via `publicMetadata.role`)
- [x] Dashboard stats cards (total users, premium, free, whitelisted, active today)
- [x] Platform activity stats (conversations, messages, quizzes, games)
- [x] User list table with pagination and search
- [x] Mobile-responsive table (cards on mobile, table on desktop)
- [x] Grant/revoke premium access
- [x] Whitelist users (Friends & Family with free premium)
- [x] View user usage stats (messages, quizzes, games)
- [x] Admin link in UserButton dropdown (only visible to admins)

**Backend Endpoints:**
```python
GET  /api/admin/stats           # Dashboard overview stats
GET  /api/admin/users           # List users (paginated, searchable)
GET  /api/admin/users/:id       # Get user details
PATCH /api/admin/users/:id      # Update user (premium status, role, whitelist)
```

**Access Control:**
1. Set admin role in Clerk Dashboard: `{"role": "admin"}`
2. Frontend `AdminRoute` wrapper checks role
3. Backend `verify_admin()` function verifies admin on `/api/admin/*` routes

**To Set Yourself as Admin:**
1. Go to Clerk Dashboard → Users → Your User
2. Edit **Public metadata** to:
   ```json
   {"role": "admin", "is_premium": true}
   ```
3. Refresh your app - you'll see "Admin Dashboard" in the user menu

#### **Phase 2: Analytics Dashboard**

**Features:**
- [ ] Usage trends chart (daily/weekly/monthly)
- [ ] Revenue tracking (MRR, subscriptions)
- [ ] Feature popularity (games, quizzes, chat usage)
- [ ] User growth over time
- [ ] Churn tracking

#### **Phase 3: Content Management**

**Features:**
- [ ] Quiz question CRUD (add/edit/delete questions)
- [ ] Flashcard deck management
- [ ] Story management
- [ ] Game word lists

---

### **Priority 2: Chat UX Improvements** 💬

| Feature | Effort | Status |
|---------|--------|--------|
| Cancel Message | ✅ | Done |
| Response Streaming | ✅ | Done |
| Multi-file Upload | ✅ | Done |
| Background Processing | 1 hour | 📋 Planned |
| Edit & Regenerate | 4-6 hours | 📋 Planned |

#### **Background Processing**
- Handle gracefully when user leaves page during generation
- Check for pending response on return, fetch latest

#### **Edit & Regenerate**
- Edit button on user messages
- Delete messages after edited one
- Regenerate from edited message

---

### **Priority 3: Learning Enhancements** 📚

| Feature | Effort | Status |
|---------|--------|--------|
| Flashcard Spaced Repetition | 2-3 days | 📋 Planned |
| Onboarding Flow | 1-2 days | 📋 Planned |
| Learning Streaks | 2-3 days | 📋 Planned |
| Expand Story Content | 1-2 days | 📋 Planned |

#### **Flashcard Spaced Repetition (Phase 2)**
- Database tracking for card progress
- Confidence ratings (Hard/Good/Easy)
- "Due for review" scheduling
- Progress indicators

#### **Onboarding Flow**
- Skill level selection (Beginner/Intermediate/Advanced)
- Daily goal setting
- Feature tour
- Personalized recommendations

#### **Learning Streaks & Gamification**
- Daily streak counter
- XP system for activities
- Achievements/badges
- Activity calendar

#### **Expand Story Content**
- Add more Lengguahi-ta stories
- Blog content extraction
- Target: 50+ stories

---

### **Future Enhancements** 🔮

| Feature | Status | Notes |
|---------|--------|-------|
| Audio Features (Chamorro TTS) | ⏸️ Deferred | Waiting for quality TTS |
| Full Offline/Local Mode | ⏸️ Deferred | Needs local LLM setup |
| ElevenLabs Voice Cloning | 📋 Future | Better pronunciation |
| Share Conversations | 📋 Future | Export/share Q&A |
| PostHog + Stripe Analytics | 📋 Future | Revenue correlation |

---

## 📁 Key Documentation

| Document | Purpose |
|----------|---------|
| [`BILLING_AND_SUBSCRIPTIONS.md`](./BILLING_AND_SUBSCRIPTIONS.md) | Freemium model, Clerk Billing, testing |
| [`GAMES_FEATURE.md`](./GAMES_FEATURE.md) | Learning games documentation |
| [`HOW_RAG_WORKS.md`](./HOW_RAG_WORKS.md) | RAG system explanation |
| [`IMPROVEMENT_GUIDE_V1_ARCHIVE.md`](./IMPROVEMENT_GUIDE_V1_ARCHIVE.md) | Historical feature documentation |

---

## 💰 Current Costs

| Service | Cost/Month |
|---------|------------|
| Clerk (Dev) | FREE |
| PostgreSQL (Render) | $7 |
| DeepSeek V3 | $0.50-2 |
| Gemini 2.5 Flash | $0.05-0.20 |
| OpenAI Embeddings | $0.30 |
| OpenAI TTS HD | $0.50-2 |
| AWS S3 | $0.02-0.10 |
| **Total** | **~$8-12/month** |

---

## 🎯 Next Steps

1. **Set yourself as admin** in Clerk Dashboard:
   ```json
   {"role": "admin", "is_premium": true}
   ```

2. **Test the Admin Dashboard** at `/admin`

3. **Whitelist family/friends** via Admin Dashboard → Users → "Add to Whitelist"

4. **Phase 2: Analytics Dashboard** - charts and trends visualization

---

**Admin Dashboard is ready! 🌺**

