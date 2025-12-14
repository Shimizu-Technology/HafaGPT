# 🌺 HåfaGPT - Development Roadmap

> **Current Status:** Production-ready Chamorro language learning platform with freemium model
> **Last Updated:** December 13, 2025

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
- 🎮 Learning Games (Memory Match, Word Scramble, Falling Words, Word Catch, Chamorro Wordle, Hangman, Cultural Trivia)
- 💳 Freemium Model (Clerk Billing + Stripe)
- 📊 Progress Dashboard
- 🔐 Authentication (Clerk)
- 📱 Mobile-optimized responsive design
- 🔧 **Admin Dashboard** (User management, analytics, whitelist, ban, settings)
- 🎄 **Seasonal Themes** (Christmas, New Year, Chamorro, Default)
- 🎉 **Promo Management** (Admin-controlled promo periods with theme-aware banners)

---

## 🎯 Active Roadmap

### **Priority 1: Admin Dashboard** 🔧 ✅ PHASE 1, 2 & 2.5 COMPLETE

> **Goal:** Web interface to manage users, subscriptions, and content without touching code.

| Phase | Features | Effort | Status |
|-------|----------|--------|--------|
| Phase 1 | User Management + Whitelist | 2-3 sessions | ✅ Complete |
| Phase 1.5 | User Detail + Ban/Actions | 1 session | ✅ Complete |
| Phase 2 | Analytics Dashboard | 1-2 sessions | ✅ Complete |
| Phase 2.5 | Site Settings (Promo + Themes) | 1 session | ✅ Complete |
| Phase 3 | Knowledge Base Management (RAG Upload) | 2-3 sessions | 📋 Next |
| Phase 4 | Content Management | 2-3 sessions | ⏸️ Deferred |

#### **Phase 1 + 1.5: User Management** ✅

**Routes:**
```
/admin                → Dashboard overview (stats, quick actions)
/admin/users          → User list with search/filter
/admin/users/:id      → User detail page with all actions
```

**Completed Features:**
- [x] Admin role check (via `publicMetadata.role`)
- [x] Dashboard stats cards (total users, premium, free, whitelisted, active today)
- [x] Platform activity stats (conversations, messages, quizzes, games)
- [x] User list table with pagination and search
- [x] Mobile-responsive (cards on mobile, table on desktop)
- [x] Click user row to view details
- [x] **User Detail Page** with full profile, stats, actions
- [x] Grant/revoke premium access
- [x] Whitelist users (Friends & Family - permanent free premium)
- [x] **Ban/unban users**
- [x] View user usage stats (all-time + today)
- [x] Admin link in UserButton dropdown (only visible to admins)

**Backend Endpoints:**
```python
GET  /api/admin/stats           # Dashboard overview stats
GET  /api/admin/users           # List users (paginated, searchable)
GET  /api/admin/users/:id       # Get user details + today's usage
PATCH /api/admin/users/:id      # Update user (premium, whitelist, ban, role)
```

**Access Control:**
1. Set admin role in Clerk Dashboard: `{"role": "admin"}`
2. Frontend `AdminRoute` wrapper checks role
3. Backend `verify_admin()` function verifies admin on `/api/admin/*` routes

**To Set Yourself as Admin:**
1. Go to Clerk Dashboard → Users → Your User
2. Edit **Public metadata** to:
   ```json
   {"role": "admin", "is_premium": true, "is_whitelisted": true}
   ```
3. Refresh your app - you'll see "Admin Dashboard" in the user menu

#### **Phase 2: Analytics Dashboard** ✅

**Route:** `/admin/analytics`

**Completed Features:**
- [x] Usage trends chart (7d/30d/90d) - chat, games, quizzes per day
- [x] User growth chart - new users per day
- [x] Feature popularity - pie charts for games + quizzes
- [x] Period selector (7 days, 30 days, 90 days)
- [x] Responsive design (stacked on mobile, grid on desktop)

**Not Implemented (future):**
- [ ] Revenue tracking (MRR, subscriptions) - needs Stripe integration
- [ ] Churn tracking - needs subscription history

#### **Phase 2.5: Site Settings (Promo + Themes)** ✅

**Route:** `/admin/settings`

**Completed Features:**
- [x] `site_settings` database table (key-value store)
- [x] Holiday Promo Management
  - [x] Enable/disable promo toggle
  - [x] Set promo end date
  - [x] Customize banner title
  - [x] Live banner preview
- [x] Theme Switching (Default, Christmas, New Year, Chamorro)
- [x] Theme-aware promo banners (different colors/emojis per theme)
- [x] Christmas snowfall effect (CSS animations)
- [x] Theme-aware logos across app (🌺 ↔ 🎄)
- [x] Settings caching (60s TTL for performance)

**Backend Endpoints:**
```python
GET  /api/admin/settings       # Get all site settings
PATCH /api/admin/settings      # Update settings (key-value pairs)
GET  /api/promo/status         # Public: Check promo + theme
```

**Database Table:** `site_settings`
```sql
key: 'promo_enabled'     → 'true' | 'false'
key: 'promo_end_date'    → '2026-01-06'
key: 'promo_title'       → 'Felis Påsgua! ...'
key: 'theme'             → 'default' | 'christmas' | 'newyear' | 'chamorro'
```

#### **Phase 3: Knowledge Base Management** 📚 (NEW PRIORITY)

> **Goal:** Allow admins to upload documents (PDFs, DOCX, TXT) to expand the RAG knowledge base without touching code. Perfect for school partnerships (e.g., Hurao Chamorro school).

**Route:** `/admin/knowledge-base`

**Planned Features:**
- [ ] Drag & drop file upload (PDF, DOCX, TXT)
- [ ] Background processing with status updates (30s-2min per file)
- [ ] Set source priority (educational, dictionary, archival)
- [ ] List indexed documents with stats
- [ ] View processing status/history
- [ ] Delete documents from RAG (optional)

**Backend Endpoints:**
```python
POST   /api/admin/knowledge-base/upload     # Upload + queue for processing
GET    /api/admin/knowledge-base/status/:id # Check processing status
GET    /api/admin/knowledge-base/documents  # List indexed documents
GET    /api/admin/knowledge-base/stats      # RAG stats (chunks, docs, etc.)
DELETE /api/admin/knowledge-base/:id        # Remove document (optional)
```

**Technical Notes:**
- Leverages existing `RAGDatabaseManager` class
- Docling for PDF processing (handles tables!)
- Token-aware chunking (~350 tokens/chunk)
- OpenAI embeddings for vector storage
- Background task queue for processing

**School Use Case:**
- Teachers upload curriculum PDFs → instantly searchable
- Import vocabulary lists and lesson handouts
- Preserve historical Chamorro documents

**Effort:** ~10-14 hours (including background processing)

---

#### **Phase 4: Content Management** (Deferred)

> **Note:** Deferred until there's a clear need. Current curated content is working well and can be edited via git.

**Would require full database migration:**
- [ ] Quiz question CRUD (add/edit/delete questions)
- [ ] Flashcard deck management
- [ ] Story management
- [ ] Game word lists

**Current state:** Content hardcoded in frontend TypeScript files. Works fine for now.

---

### **Priority 2: Chat UX Improvements** 💬

| Feature | Effort | Status |
|---------|--------|--------|
| Cancel Message | ✅ | Done |
| Response Streaming | ✅ | Done |
| Multi-file Upload | ✅ | Done |
| Optimistic UI | ✅ | Done |
| Smooth Transitions | ✅ | Done |
| Auto-focus Input | ✅ | Done |
| Haptic Feedback | ✅ | Done |
| Sidebar Auto-close | ✅ | Done |
| Background Processing | ✅ | Done |
| Edit & Regenerate | ✅ | Done |
| Parallel Streams | 3-4 hours | 📋 Future |

#### **Recently Completed (Dec 2025):**
- **Optimistic UI**: Messages appear instantly, conversation created in background
- **Smooth Transitions**: Loading states when switching conversations
- **Auto-focus**: Input auto-focuses on desktop (not mobile to avoid keyboard)
- **Haptic Feedback**: Vibration on send (mobile devices)
- **Sidebar Auto-close**: Closes when selecting/creating conversations
- **Mobile Input Polish**: Smaller placeholder, compact buttons on mobile
- **Background Processing**: Refetch messages on window focus and page load to catch responses that completed while user was away
- **Edit & Regenerate**: Edit user messages with inline textarea, delete subsequent messages, regenerate AI response with full conversation context

#### **Parallel Streams** (Future)
- Allow multiple conversations to stream responses simultaneously
- Currently: switching conversations cancels in-progress stream
- Future: let streams continue in background, see completed response when returning
- Requires: per-conversation stream tracking, conditional UI updates

---

### **Priority 3: Learning Enhancements** 📚

| Feature | Effort | Status |
|---------|--------|--------|
| Flashcard Spaced Repetition | 2-3 days | 📋 Planned |
| Onboarding Flow | 1-2 days | ✅ Done |
| User Preferences | 1 day | ✅ Done |
| Learning Streaks | 2-3 days | ✅ Done |
| Expand Story Content | 1-2 days | 📋 Planned |

#### **Onboarding Flow** ✅
- [x] Skill level selection (Beginner/Intermediate/Advanced)
- [x] Learning goal selection (Conversation, Culture, Family, Travel, Everything)
- [x] Modal appears on first sign-in
- [x] Preferences saved to Clerk `unsafeMetadata`
- [x] AI responses personalized based on skill level

#### **User Preferences Page** ✅ (`/settings`)
- [x] Update skill level and learning goal
- [x] Dark/light mode toggle (syncs across devices)
- [x] Theme preference saved to Clerk profile
- [x] Accessible from user dropdown menu

#### **Admin Preference Management** ✅
- [x] View user's skill level, learning goal, onboarding status
- [x] Edit user preferences directly
- [x] Reset onboarding (user sees modal again on next login)
- [x] New endpoints: `POST /api/admin/users/:id/reset-onboarding`, `PATCH /api/admin/users/:id/preferences`

#### **Learning Goal Personalization** (Future)
Users select a learning goal during onboarding (conversation, culture, family, travel, or "everything"). Currently this is stored in Clerk's `unsafeMetadata` but **intentionally NOT applied to chat prompts**. 

**Why not use it in chat?** After testing, we found that filtering all responses through a learning goal lens (e.g., always mentioning travel vocabulary) made responses feel forced and could reduce quality when users ask about unrelated topics. The chat should respond naturally to what users actually ask.

**Better uses for learning goals (future):**
- [ ] Personalized homepage recommendations ("Based on your travel goal...")
- [ ] Daily word filtering (show travel vocabulary for travel goal)
- [ ] Suggest relevant flashcard categories
- [ ] Prioritize stories that match the user's goal
- [ ] Adjust conversation practice scenario recommendations
- [ ] Show goal-specific tips and resources

**Note:** The `LEARNING_GOAL_MODIFIERS` dict is defined in `chatbot_service.py` for future reference but is not currently applied.

#### **Flashcard Spaced Repetition (Phase 2)**
- Database tracking for card progress
- Confidence ratings (Hard/Good/Easy)
- "Due for review" scheduling
- Progress indicators

#### **Learning Streaks** ✅
- [x] Daily streak counter (`/api/streaks/me` endpoint)
- [x] Streak widget on HomePage and Dashboard
- [x] Personal best tracking
- [x] Today's activity breakdown (chat, games, quizzes)
- [x] Guam timezone for day boundaries
- [ ] XP system for activities (future)
- [ ] Achievements/badges (future)
- [ ] Activity calendar (future)

#### **Expand Story Content**
- Add more Lengguahi-ta stories
- Blog content extraction
- Target: 50+ stories

---

### **Priority 4: Performance & Scalability** ⚡

> **Goal:** Reduce response latency and prepare for 100+ concurrent users.

#### **Current Infrastructure** ✅

| Component | Configuration | Status |
|-----------|--------------|--------|
| **Render Plan** | Standard ($25/month) | ✅ 2GB RAM |
| **Gunicorn Workers** | 3 workers | ✅ Parallel requests |
| **Neon Connection Pooling** | PgBouncer via `-pooler` endpoint | ✅ Handles 100+ connections |
| **Cloud Embeddings** | OpenAI (not local) | ✅ Saves 500MB RAM |

**Render Start Command:**
```bash
gunicorn api.main:app -w 3 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
```

**Why 3 workers?**
- Each worker uses ~300-400MB RAM
- 3 workers on 2GB RAM = safe headroom (~1.2GB used)
- More workers = more parallel requests, but diminishing returns

**Neon Connection Pooling:**
- Enabled via Neon dashboard (PgBouncer)
- `DATABASE_URL` uses `-pooler` suffix: `ep-xxx-pooler.us-east-2.aws.neon.tech`
- Handles connection reuse automatically - no app-side pooling needed

**How Gunicorn Workers Differ from Uvicorn:**

| Aspect | Uvicorn (default) | Gunicorn + Uvicorn Workers |
|--------|-------------------|----------------------------|
| **Processes** | 1 process | Multiple processes (we use 2) |
| **Parallelism** | Async I/O only (one thread) | True parallelism (separate CPUs) |
| **Memory** | Shared | Each worker has own memory |
| **Crash Recovery** | App crashes = downtime | One worker crashes, others continue |

**What's shared between workers:**
- ✅ Database (PostgreSQL) - all workers query same DB
- ✅ Freemium limits (`user_daily_usage` table) - stored in DB, works perfectly
- ✅ External APIs (OpenAI, DeepSeek) - stateless calls

**What's NOT shared (in-memory state):**
- ⚠️ IP rate limiting (`rate_limit_storage`) - each worker counts separately
  - Effect: 60 req/min limit becomes ~120 req/min with 2 workers
  - Impact: Minor - still prevents abuse, just less strict
- ⚠️ Message cancellation (`_cancelled_messages` set) - may not cancel if different worker
  - Effect: Rare edge case where cancel doesn't work
  - Impact: Minimal - response still completes, just not cancelled

**Bottom line:** Freemium limits (5 chats/day, etc.) work perfectly. Only anti-abuse rate limiting is slightly relaxed.

---

#### **Remaining Scalability Work**

| Strategy | Effort | Impact | Status |
|----------|--------|--------|--------|
| **Response Caching (Redis)** | 4-6 hrs | High | 📋 Priority |
| **Shorter Prompts** | 1-2 hrs | Medium | 📋 Planned |
| **Queue System** | 8-12 hrs | Medium | ⏸️ Future |
| **Model Auto-Switching** | 2-3 hrs | Medium | ⏸️ Future |

#### **Response Caching (Redis)** 📋 (HIGH PRIORITY)

Cache responses for common translation queries. Same question = instant response.

**How it works:**
1. Hash the query + mode + skill_level to create a cache key
2. Check Redis/database for cached response before calling LLM
3. Store new responses with TTL (e.g., 24 hours)
4. Cache invalidation when RAG knowledge base updates

**Best candidates for caching:**
- Simple translations: "How do you say 'hello'?" → always returns "Håfa Adai"
- Common phrases: "What is 'thank you' in Chamorro?" → always returns "Si Yu'os Ma'åse'"
- Word of the day queries (already cached separately)

**Not cacheable:**
- Conversations with history context
- Document/image analysis
- Personalized responses (different skill levels may need different caching)

**Effort:** 4-6 hours
**Impact:** 50-70% of translation queries could be instant

#### **Shorter System Prompts** 📋

Current system prompt is ~800 tokens. Trimming examples and redundant instructions could:
- Reduce latency by 1-2 seconds
- Lower API costs by 20-30%

**Approach:**
1. Audit current prompts for redundancy
2. Move detailed examples to few-shot format
3. A/B test shortened prompts against quality metrics

#### **Queue System** ⏸️ (Future)

For high traffic periods, queue requests instead of failing:
- Redis-based job queue (Bull, Celery)
- "Thinking..." status while queued
- Priority queue for premium users

#### **Model Auto-Switching** ⏸️ (Future)

Automatically switch to faster model during high load:
- DeepSeek V3 (default) → GPT-4o-mini (faster, slightly less accurate)
- Based on queue depth or response time metrics

---

### **Future Enhancements** 🔮

| Feature | Status | Notes |
|---------|--------|-------|
| Voice Input | 📋 Next | Web Speech API for voice-to-text input |
| Share Conversations | 📋 Next | Copy conversation to clipboard, shareable links |
| New Learning Games (Phase 1) | ✅ Done | Hangman, Cultural Trivia |
| New Learning Games (Phase 2-4) | 📋 Planned | Phrase Builder, Speed Challenge, Picture Match, Word Search, Boss Battles, more |
| Admin Settings Polish | ✅ Done | Last Active tracking, Settings quick action, toggle styling |
| Audio Features (Chamorro TTS) | ⏸️ Deferred | Waiting for quality TTS |
| Full Offline/Local Mode | ⏸️ Deferred | Needs local LLM setup |
| ElevenLabs Voice Cloning | 📋 Future | Better pronunciation |
| PostHog + Stripe Analytics | 📋 Future | Revenue correlation |

#### **Voice Input** (Next)
- Add microphone button to chat input
- Use Web Speech API for speech-to-text
- Works on Chrome, Edge, Safari (iOS)
- Fallback message for unsupported browsers
- **Effort:** 2-3 hours

#### **Share Conversations** (Next)
- "Copy to clipboard" button on conversations
- Format: Q&A text with Chamorro words
- Future: Generate shareable public link
- **Effort:** 2-4 hours

#### **New Learning Games**

**Phase 1 Complete (Dec 2025):**
- ✅ **Hangman** - Classic word guessing with Chamorro alphabet (Å, Ñ, ') support
- ✅ **Cultural Trivia** - 30+ questions about Guam culture, history, language, food, and geography

**Phase 2 (Planned - Grammar & Speed):**
| Game | Concept | Learning Value | Effort |
|------|---------|----------------|--------|
| Phrase Builder | Arrange jumbled Chamorro words into correct sentence order | Grammar/word order | 4-5 hrs |
| Speed Challenge | Type translations as fast as possible (60-second race) | Quick recall, typing | 3-4 hrs |

**Phase 3 (Planned - Visual & Relaxing):**
| Game | Concept | Learning Value | Effort |
|------|---------|----------------|--------|
| Picture Match | Match Chamorro words to images | Visual learners, beginners | 6-8 hrs |
| Word Search | Find hidden Chamorro words in a letter grid | Relaxing, word recognition | 6-8 hrs |
| Crossword | Interactive crossword with Chamorro answers | Brain-teaser, spelling | 8-12 hrs |

**Phase 4 (Future - Big Engagement Features):**
| Game | Concept | Learning Value | Effort |
|------|---------|----------------|--------|
| Boss Battles | RPG-style - answer correctly to attack bosses, level up | Gamification, progression | 12-15 hrs |
| Adventure Quest | Story-driven adventure exploring Guam, choose-your-own-path | Narrative, immersion | 15-20 hrs |
| Island Builder | Earn resources by learning, build virtual Guam | Long-term retention | 20+ hrs |
| Multiplayer Showdown | Real-time 1v1 translation battles | Competition, social | 15-20 hrs |

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
| **Render Standard** | $25 |
| Neon PostgreSQL | FREE |
| Clerk (Dev) | FREE |
| DeepSeek V3 | $0.50-2 |
| Gemini 2.5 Flash | $0.05-0.20 |
| OpenAI Embeddings | $0.30 |
| OpenAI TTS HD | $0.50-2 |
| AWS S3 | $0.02-0.10 |
| **Total** | **~$26-30/month** |

> **Note:** Upgraded from Render Starter ($7) to Standard ($25) for 1GB RAM and 2 Gunicorn workers. Database moved from Render PostgreSQL to Neon (free tier with connection pooling).

---

## 🎯 Next Steps

1. ✅ ~~Set yourself as admin~~ - Done!
2. ✅ ~~Test Admin Dashboard~~ - Done!
3. ✅ ~~Phase 2: Analytics Dashboard~~ - Done!
4. ✅ ~~Phase 2.5: Site Settings~~ - Done!
5. ✅ ~~Chat UX Improvements~~ - Done!
6. ✅ ~~Edit & Regenerate~~ - Done!
7. ✅ ~~Onboarding Flow~~ - Done!
8. ✅ ~~User Preferences~~ - Done!
9. ✅ ~~Learning Streaks~~ - Done!
10. ✅ ~~Onboarding Feature Overview~~ - Done!
11. ✅ ~~Chat Sidebar Cleanup~~ - Done!
12. ✅ ~~New Games: Hangman + Cultural Trivia~~ - Done!
13. ✅ ~~Admin Settings Polish~~ - Done! (Last Active tracking, Settings quick action, toggle styling)
14. **Voice Input** - Web Speech API for voice-to-text
15. **Share Conversations** - Copy/share chat transcripts
16. **New Games Phase 2** - Phrase Builder, Speed Challenge
17. **New Games Phase 3** - Picture Match, Word Search, Crossword

---

## 📊 Current Free Tier Limits

| Feature | Free | Premium |
|---------|------|---------|
| Chat messages | 5/day | Unlimited |
| Games | 10/day | Unlimited |
| Quizzes | 5/day | Unlimited |
| Vocabulary | Unlimited | Unlimited |
| Stories | Unlimited | Unlimited |

---

**Admin Dashboard Phase 1, 2 & 2.5 Complete! 🎄**

User management + analytics + site settings all working!

---

## 🐛 Recent Bug Fixes & Improvements

### December 13, 2025
| Change | Description |
|--------|-------------|
| **User Settings Page** | New `/settings` page to update skill level, learning goal, and theme |
| **Onboarding Modal** | First-time users select skill level and learning goal |
| **AI Personalization** | Responses adapt based on user's skill level (beginner/intermediate/advanced) |
| **Theme Sync** | Dark/light mode preference syncs across devices via Clerk |
| **Admin Preference Management** | View/edit user preferences, reset onboarding from admin panel |
| **Admin Settings** | New page for promo and theme management (`/admin/settings`) |
| **Christmas Theme** | Snowfall animation, festive logos, theme-aware banners |
| **Promo Management** | Admin-controlled promo periods (no more env vars needed) |
| **Chat UX Polish** | Optimistic UI, smooth transitions, haptic feedback |
| **Mobile Input** | Compact placeholder, responsive buttons |
| **Background Processing** | Messages refetch on window focus/page load to catch background completions |
| **Stream Cancellation** | Switching conversations cleanly cancels in-progress streams |
| **Edit & Regenerate** | Edit user messages inline, regenerate AI response with full history context |

### December 10, 2025
| Fix | Description |
|-----|-------------|
| **Word of the Day filtering** | Added safe category filtering + blocklist to ensure family-friendly vocabulary (no inappropriate words) |
| **RAG connection stability** | Added retry logic for database connections to handle Neon serverless cold starts and SSL drops |
| **Icon centering** | Fixed off-centered icons for theme toggles and speak buttons across all pages |

