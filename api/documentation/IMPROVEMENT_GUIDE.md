# 🌺 HåfaGPT - Development Roadmap

> **Current Status:** Production-ready Chamorro language learning platform with freemium model
> **Last Updated:** December 18, 2025

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
gunicorn api.main:app -w 3 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 300
```

**Command Breakdown:**

| Flag | Value | Purpose |
|------|-------|---------|
| `api.main:app` | - | Path to FastAPI app (`api/main.py`, variable `app`) |
| `-w` | `3` | Number of worker processes (3 parallel request handlers) |
| `-k` | `uvicorn.workers.UvicornWorker` | Worker class - uses async uvicorn under the hood |
| `--bind` | `0.0.0.0:$PORT` | Listen on all interfaces, Render provides `$PORT` |
| `--timeout` | `120` | Kill worker if request takes >2 min (prevents freezes) |
| `--keep-alive` | `300` | Keep idle connections open for 5 min (for streaming responses) |

**Why 3 workers?**
- Each worker uses ~300-400MB RAM
- 3 workers on 2GB RAM = safe headroom (~1.2GB used)
- More workers = more parallel requests, but diminishing returns
- Rule of thumb: `2 * CPU cores + 1`, but RAM is our constraint

**Neon Connection Pooling:**
- Enabled via Neon dashboard (PgBouncer)
- `DATABASE_URL` uses `-pooler` suffix: `ep-xxx-pooler.us-east-2.aws.neon.tech`
- Handles connection reuse automatically - no app-side pooling needed

**How Gunicorn Workers Differ from Uvicorn:**

| Aspect | Uvicorn (default) | Gunicorn + Uvicorn Workers |
|--------|-------------------|----------------------------|
| **Processes** | 1 process | Multiple processes (we use 3) |
| **Parallelism** | Async I/O only (one thread) | True parallelism (separate CPUs) |
| **Memory** | Shared | Each worker has own memory |
| **Crash Recovery** | App crashes = downtime | One worker crashes, others continue |

**What's shared between workers:**
- ✅ Database (PostgreSQL) - all workers query same DB
- ✅ Freemium limits (`user_daily_usage` table) - stored in DB, works perfectly
- ✅ External APIs (OpenAI, DeepSeek) - stateless calls

**What's NOT shared (in-memory state):**
- ⚠️ IP rate limiting (`rate_limit_storage`) - each worker counts separately
  - Effect: 60 req/min limit becomes ~180 req/min with 3 workers
  - Impact: Minor - still prevents abuse, just less strict
- ⚠️ Message cancellation (`_cancelled_messages` set) - may not cancel if different worker
  - Effect: Rare edge case where cancel doesn't work
  - Impact: Minimal - response still completes, just not cancelled

**Bottom line:** Freemium limits (5 chats/day, etc.) work perfectly. Only anti-abuse rate limiting is slightly relaxed.

---

#### **Remaining Scalability Work**

| Strategy | Effort | Impact | Status |
|----------|--------|--------|--------|
| **Token Tracking (Logging)** | 2-3 hrs | Medium | 📋 Planned |
| **Token Warnings** | 1-2 hrs | Low | 📋 Planned |
| **Conversation Context Tests** | 3-4 hrs | High | 📋 Priority |
| **Response Caching (Redis)** | 4-6 hrs | High | ⏸️ Deferred |
| **Shorter Prompts** | 1-2 hrs | Medium | 📋 Planned |
| **Queue System** | 8-12 hrs | Medium | ⏸️ Future |
| **Model Auto-Switching** | 2-3 hrs | Medium | ⏸️ Future |

#### **Token Tracking (Logging)** 📋 PLANNED

> **Goal:** Log token usage per conversation for cost monitoring and debugging.

**What it does:**
- Track `prompt_tokens`, `completion_tokens`, `total_tokens` per message
- Store in `conversation_logs` table (new columns)
- Dashboard showing daily/weekly token usage
- Cost estimation based on model pricing

**Why it matters:**
- DeepSeek V3: $0.14/M input, $0.28/M output tokens
- GPT-4o: $2.50/M input, $10.00/M output tokens
- Gemini 2.5 Flash: $0.15/M input, $0.60/M output tokens
- Helps optimize prompts and identify expensive queries

**Implementation:**
```python
# OpenAI/OpenRouter responses include usage
response = client.chat.completions.create(...)
usage = response.usage  # CompletionUsage object
# usage.prompt_tokens, usage.completion_tokens, usage.total_tokens

# Add to conversation_logs table
ALTER TABLE conversation_logs ADD COLUMN prompt_tokens INTEGER;
ALTER TABLE conversation_logs ADD COLUMN completion_tokens INTEGER;
ALTER TABLE conversation_logs ADD COLUMN total_tokens INTEGER;
```

**Effort:** 2-3 hours

#### **Token Warnings** 📋 PLANNED (Low Priority)

> **Goal:** Warn when approaching context window limits (128K for DeepSeek V3).

**What it does:**
- Count tokens before sending to LLM
- Warn if approaching 80% of context limit (~100K tokens)
- Optionally truncate old messages to fit
- Log warnings for monitoring

**Why it's low priority:**
- 128K tokens = ~300 pages of text
- Average conversation uses ~5,000-20,000 tokens
- Very few users will ever hit this limit
- Current 10-message history limit keeps us well under

**Implementation (if needed):**
```python
# Use tiktoken for accurate counting
import tiktoken
enc = tiktoken.encoding_for_model("gpt-4")  # Works for most models
token_count = len(enc.encode(full_prompt))

if token_count > 100_000:  # 80% of 128K
    logger.warning(f"Approaching context limit: {token_count} tokens")
    # Optionally truncate oldest messages
```

**Effort:** 1-2 hours

#### **Conversation Context Tests** 📋 PRIORITY

> **Goal:** Automated tests to verify the bot maintains context correctly across long conversations.

**What it tests:**
- ✅ Context retention at 5, 10, 20 message depths
- ✅ Reference resolution ("What was that word you mentioned?")
- ✅ No hallucination of past messages
- ✅ Conversation coherence
- ✅ Cross-conversation isolation (no context bleed)

**Test approach:**
```python
# Example test case
conversation_flow = [
    {"user": "How do you say 'hello' in Chamorro?", "check": None},
    {"user": "And how about 'thank you'?", "check": None},
    {"user": "What was the first word I asked about?", "check": ["hello", "håfa"]},
    {"user": "Use both words in a sentence", "check": ["håfa", "ma'åse"]},
]
```

**What we caught with these tests:**
- 🐛 **FIXED (Dec 2025):** Context was pulling from ALL conversations via `session_id` instead of just the current conversation via `conversation_id`. This caused responses to reference unrelated past conversations!

**File:** `evaluation/test_conversation_context.py`

**Effort:** 3-4 hours

#### **Response Caching (Redis)** ⏸️ DEFERRED

Cache responses for common translation queries. Same question = instant response.

**⚠️ Why Deferred (Dec 2025):**
Caching is best for **mature systems** with stable knowledge bases. We're still:
- Adding new RAG sources (IKNM dictionary, PDFs, etc.)
- Tuning retrieval and prompts
- Improving response quality

**Risks of caching now:**
- ❌ Bad response gets cached → served to many users repeatedly
- ❌ RAG improvements don't reflect in cached responses
- ❌ Model upgrades → stale cached responses

**When to revisit:**
- Test suite consistently at 95%+ accuracy
- RAG sources are mostly stable (no major additions planned)
- User feedback system in place to catch bad responses

**How it would work (when ready):**
1. Hash the query + mode + skill_level to create a cache key
2. Check Redis/database for cached response before calling LLM
3. Store new responses with short TTL (4-24 hours)
4. Cache invalidation when RAG knowledge base updates
5. Admin cache viewer to manually clear bad responses

**Best candidates for caching:**
- Simple translations: "How do you say 'hello'?" → always returns "Håfa Adai"
- Common phrases: "What is 'thank you' in Chamorro?" → always returns "Si Yu'os Ma'åse'"
- Word of the day queries (already cached separately)

**Not cacheable:**
- Conversations with history context
- Document/image analysis
- Personalized responses (different skill levels may need different caching)

**Effort:** 4-6 hours
**Impact:** 50-70% of translation queries could be instant (when system is mature)

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

### **Priority 5: Homepage & UX Professionalization** 🎨 📋 NEXT

> **Goal:** Make HåfaGPT feel as polished and professional as Duolingo/Drops while maintaining our unique value.

**Comparison Notes (Dec 2025):**
- Analyzed Duolingo, LearningChamoru.com, and Drops for best practices
- HåfaGPT has great features but homepage needs clearer hierarchy
- Professional sites have: single clear CTA, minimal cognitive load, mobile-first

#### **Quick Wins (1-2 hours each)**

| Task | Current | Improvement | Status |
|------|---------|-------------|--------|
| **Simplify Hero Section** | Dual "Explore Free / Free Account" panel | Single clear value prop + one CTA | 📋 Next |
| **Reduce CTA Clutter** | Multiple "Sign In" buttons, "Account" badges | One primary action per section | 📋 Planned |
| **Move "Our Story" to Footer** | Takes header real estate | Free up header for nav | 📋 Planned |
| **Cleaner Feature Cards** | Many small cards with red badges | Fewer, larger cards with clearer hierarchy | 📋 Planned |

#### **Medium Effort (3-5 hours each)**

| Task | Description | Status |
|------|-------------|--------|
| **Mobile Bottom Nav** | Tab bar (Home, Chat, Games, Learn, Menu) like Duolingo | 📋 Planned |
| **Redesign Homepage Cards** | Fewer, larger feature cards with better visual hierarchy | 📋 Planned |
| **Progressive Disclosure** | Don't show all features at once, guide users | 📋 Future |

#### **Reference Sites:**
- **Duolingo** — Gold standard for gamified learning (minimal CTAs, clear value prop)
- **Drops** — Beautiful visual design, mobile-first, bold colors
- **LearningChamoru.com** — Structured lessons, dictionary front-and-center

---

### **Future Enhancements** 🔮

| Feature | Status | Notes |
|---------|--------|-------|
| Quiz TTS (Audio) | 🔨 In Progress | Read questions and options aloud for accessibility |
| Voice Input | 📋 Next | Web Speech API for voice-to-text input |
| Share Conversations | ✅ Done | Shareable public links for conversations |
| Pre-Reader Games | 🔨 In Progress | Sound Match + Picture Pairs done |
| Homepage Polish | 📋 Next | Simplify hero, reduce CTAs, mobile nav |
| LearningChamoru Partnership | ⏳ Phase 1 Done | Dictionary sources added, collaboration later |
| New Learning Games (Phase 1) | ✅ Done | Hangman, Cultural Trivia |
| New Learning Games (Phase 2-4) | 📋 Planned | Phrase Builder, Speed Challenge, Picture Match, Word Search, Boss Battles, more |
| Admin Settings Polish | ✅ Done | Last Active tracking, Settings quick action, toggle styling |
| Full Offline/Local Mode | ⏸️ Deferred | Needs local LLM setup |
| ElevenLabs Voice Cloning | 📋 Future | Better pronunciation |
| PostHog + Stripe Analytics | 📋 Future | Revenue correlation |

#### **Voice Input** (Next)
- Add microphone button to chat input
- Use Web Speech API for speech-to-text
- Works on Chrome, Edge, Safari (iOS)
- Fallback message for unsupported browsers
- **Effort:** 2-3 hours

#### **Share Conversations** ✅ COMPLETE
> **Goal:** Generate public shareable links so users can share conversations with friends/family.

**What it does:**
- Click "Share" → generates a public link (e.g., `hafagpt.com/share/abc123`)
- Anyone with link can view the conversation (read-only, no auth required)
- Beautiful read-only view with "Try HåfaGPT" CTA for new users

**Backend:**
```python
# New table
shared_conversations (
  id, share_id (uuid), conversation_id, 
  user_id, created_at, expires_at, view_count
)

# New endpoints
POST /api/conversations/:id/share → creates share, returns share_id
GET /api/share/:share_id → returns conversation (public, no auth)
DELETE /api/share/:share_id → revoke share (owner only)
```

**Frontend:**
- New public route: `/share/:shareId` (read-only conversation view)
- Share button in chat header/sidebar
- Copy link modal with success toast
- Optional: expiration settings (24h, 7d, never)

**Effort:** 6-8 hours

#### **Quiz TTS (Audio)** 🔨 IN PROGRESS

> **Goal:** Add text-to-speech to quizzes for accessibility and young learners.

**What it does:**
- 🔊 Speaker button reads the question aloud
- 🔊 Optional: read answer options (for multiple choice)
- 🔊 Uses existing `useSpeech` hook (OpenAI TTS → browser fallback)
- Great for kids who can't read yet, visual impairments, or audio learners

**Implementation:**
- Add `useSpeech` hook to `QuizViewer.tsx`
- Speaker icon next to question text
- Auto-play option in settings (optional future)

**Effort:** 2-3 hours

#### **Pre-Reader Learning Games** 🔨 IN PROGRESS

> **Goal:** Games that don't require reading, perfect for young children at Hurao Academy.

**Completed:**
- ✅ **Sound Match** — Hear word, tap matching emoji. Categories: Animals, Colors, Food, Nature, Numbers.

**Design Principles:**
1. **Audio-first** — All instructions spoken, not written
2. **Big touch targets** — Large, colorful buttons
3. **Immediate feedback** — Sounds/animations for correct/wrong
4. **No text required** — Pictures and audio only
5. **Positive reinforcement** — Stars, celebrations, no harsh "wrong" sounds

**Planned Games:**

| Game | How It Works | Skills | Status |
|------|--------------|--------|--------|
| **🎵 Sound Match** | Hear a Chamorro word, tap the matching emoji | Listening, vocabulary | ✅ Done |
| **🖼️ Picture Pairs** | Memory match with emoji pairs (audio on match) | Visual memory, vocabulary | ✅ Done |
| **🎨 Color Touch** | "Tap the BLUE one" (Chamorro audio) | Colors, listening | 📋 Planned |
| **🔢 Number Tap** | "Tap 3 coconuts" (Chamorro audio) | Numbers, counting | 📋 Planned |
| **👆 Simon Says** | "Touch your nose" (Chamorro audio) | Body parts, commands | 📋 Planned |

**Next:** Voice Input — add speech-to-text for chat.

#### **LearningChamoru.com — Learn & Build First (Option A)** 📋 IN PROGRESS

> **Strategy:** Learn from their approach quietly, build traction, then explore collaboration later with more leverage.

**About LearningChamoru:**
- Free Chamorro learning platform, 36,000+ registered learners
- Native speaker audio recordings (huge asset!)
- Partnership with University of Guam and CHamoru Language Commission
- 25 structured lessons based on Topping's textbook
- Older web design — HåfaGPT's modern UX is a differentiator

**Why We're Complements, Not Competitors:**
| LearningChamoru | HåfaGPT |
|-----------------|---------|
| Structured lessons (25 progressive) | AI chat (ask anything) |
| Native speaker audio | TTS approximation |
| Self-paced modules | Interactive games, quizzes |
| Established (36,000 users) | New, innovative |

**Phase 1: Learn Quietly (Current)** ✅ MOSTLY COMPLETE
- [x] Create account and explore their platform
- [x] Analyze their 25-lesson structure and progression (see `LEARNING_PATH_RESEARCH.md`)
- [ ] Note UX patterns worth adopting (skill levels, community features)
- [x] Check our RAG for Topping's Dictionary/textbook content
- [x] Add LearningChamoru as a resource link in our app (goodwill gesture)
- [x] **Discovered IKNM/KAM Revised Dictionary (2025)** — same source they use!

**Phase 1.5: Dictionary Exploration** ✅ COMPLETE (December 2024)
- [x] Found CNMI Revised Dictionary at natibunmarianas.org
- [x] Created custom crawler: `crawlers/iknm_kam_dictionary.py`
- [x] Added 35 chunks (priority 105 - high authority)
- [x] Added Two Chamorro Orthographies PDF (10 chunks)
- [x] Added English-Chamorro Finder List PDF (173 chunks)
- [x] Updated About page with IKNM/KAM credit
- [x] Created `crawlers/SOURCES.md` for tracking

**Phase 2: Build Traction**
- [ ] Get more users (schools like Hurao Academy)
- [ ] Collect testimonials and success stories
- [ ] Establish HåfaGPT as a credible Chamorro learning tool

**Phase 3: Explore Collaboration (Future)**
- [ ] Reach out to Dr. Gerhard Schwab or team
- [ ] Position as complementary (AI chat + their structured lessons)
- [ ] Explore audio licensing, cross-promotion, or integration

**Public Resources We Can Use (With Attribution):**
- ✅ Topping's Dictionary (published reference work)
- ✅ IKNM/KAM Revised Dictionary 2025 (public website)
- ✅ Two Chamorro Orthographies (Dr. Sandra Chung - public PDF)
- ✅ English-Chamorro Finder List 2024 (public PDF)
- ✅ Lesson structure concepts (25-lesson progression is public knowledge)
- ✅ Grammar rules and concepts (not copyrightable)
- ❌ Their specific text/audio (need permission)

**Note:** Do NOT scrape their content. Respect their intellectual property. Build relationship before asking for anything.

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
| [`LEARNINGCHAMORU_ANALYSIS.md`](./LEARNINGCHAMORU_ANALYSIS.md) | LearningChamoru.com research & strategy |
| [`LEARNING_PATH_RESEARCH.md`](./LEARNING_PATH_RESEARCH.md) | Topping's lesson structure analysis |
| [`../crawlers/SOURCES.md`](../crawlers/SOURCES.md) | RAG knowledge base source tracking |
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
15. ✅ ~~**Share Conversations**~~ - Done! Public shareable links
16. **New Games Phase 2** - Phrase Builder, Speed Challenge
17. **New Games Phase 3** - Picture Match, Word Search, Crossword

---

## 📊 Current Free Tier Limits

| Feature | Free | Premium |
|---------|------|---------|
| Chat messages | 8/day | Unlimited |
| Games | 10/day | Unlimited |
| Quizzes | 5/day | Unlimited |
| Vocabulary | Unlimited | Unlimited |
| Stories | Unlimited | Unlimited |

---

**Admin Dashboard Phase 1, 2 & 2.5 Complete! 🎄**

User management + analytics + site settings all working!

---

## 🐛 Recent Bug Fixes & Improvements

### December 16, 2025
| Fix | Description |
|-----|-------------|
| **🚨 Conversation Context Bleed** | **CRITICAL FIX:** Chat history was using `session_id` (browser-based) instead of `conversation_id`, causing responses to reference unrelated past conversations. Now each conversation has isolated context. |

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

