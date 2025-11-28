# 🌺 HåfaGPT - Chamorro Language Learning Platform

> **HåfaGPT has evolved from a chatbot into a comprehensive Chamorro language learning application!**

## 🎯 **What is HåfaGPT?**

HåfaGPT is a **complete Chamorro language learning platform** that combines:
- 🤖 **AI Chat Tutor** - Ask questions, practice conversations, get translations
- 📖 **Story Mode** - Read 17 Chamorro stories with tap-to-translate
- 🎴 **Flashcards** - Study vocabulary with curated decks or AI-generated cards
- 📝 **Quizzes** - Test your knowledge with multiple question types
- 📚 **Vocabulary Browser** - Explore 10,350+ dictionary words by category
- 📅 **Daily Word** - Learn a new Chamorro word every day
- 📊 **Progress Dashboard** - Track your learning journey

**The app is designed for both self-study and teaching children Chamorro!**

---

## ✨ **Current Features**

### **Core Learning Tools**
- ✅ **AI Chat Tutor** - 3 modes: English, Chamorro immersion, Learning mode
- ✅ **Story Mode** - 17 stories (6 curated + 11 Lengguahi-ta) with tap-to-translate
- ✅ **Flashcards** - 6 curated decks + dictionary-based cards (10,350+ words)
- ✅ **Quizzes** - 6 categories with curated + dictionary-generated questions
- ✅ **Vocabulary Browser** - Browse, search, and learn from full dictionary
- ✅ **Daily Word/Phrase** - 76 curated words + API-powered daily rotation
- ✅ **Progress Dashboard** - Track conversations, quizzes, and scores
- ✅ **Quiz Review** - Review past quiz attempts with detailed answers

### **AI & RAG System**
- ✅ **54,303 chunks indexed** (dictionaries, Guampedia, Lengguahi-ta, academic books)
- ✅ **Hybrid RAG** - Smart detection for when to use knowledge base
- ✅ **Character normalization** - Handles accents, glottal stops, spelling variants
- ✅ **Smart Query Boosting** - Educational content prioritized over dictionary

### **User Experience**
- ✅ **Clerk Authentication** - Secure sign-in with progress tracking
- ✅ **Mobile-First Design** - Optimized for phones, tablets, and desktop
- ✅ **Speech-to-Text** - Voice input for questions
- ✅ **Text-to-Speech** - Hear Chamorro pronunciations (OpenAI TTS HD)
- ✅ **Image Upload** - Translate Chamorro text in photos
- ✅ **React Query** - Fast, cached data loading

**Performance:**
- Cloud (GPT-4o-mini): 2-8s responses, 99% accurate
- Dictionary API: Instant loading (10,350+ words in memory)

---

## ✅ **RECENTLY COMPLETED** - November 2025

### **Authentication & User Management** ✅
- **Clerk Integration** - Secure JWT authentication with JWKS verification
- **Optional Authentication** - Anonymous users supported (no login required)
- **User Tracking** - Conversations linked to `user_id` when authenticated
- **Database Migrations** - Alembic for schema version control
- **Sign-out Handling** - Proper state cleanup on user sign-out

### **Conversation Management** ✅
- **Create & Organize** - Multiple conversations with custom titles
- **Auto-naming** - Conversations titled from first 50 chars of first message
- **List & Switch** - View all conversations, switch between topics
- **Rename** - Update conversation titles (double-click or right-click)
- **Soft Delete** - Hide conversations while preserving data for training
- **Message History** - Full conversation history with automatic context
- **Persistence** - Active conversation maintained across refreshes
- **User Isolation** - Conversations filtered by `user_id`

### **Mobile UX Optimization** ✅
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Hamburger Menu** - Sidebar toggle for mobile
- **Touch-Friendly** - Right-click context menu for rename
- **Smooth Animations** - Fade transitions for sidebar
- **Centered Modals** - Clerk user menu properly centered on mobile

### **Tool Integration** ✅
- **Web Search** - Real-time information via Brave Search API
- **Current Events** - Answers questions about news, weather, events
- **Fills Knowledge Gaps** - Supplements RAG with latest information

### **Speech-to-Text Input** ✅
- **Browser-Native** - Uses Web Speech API (Chrome, Safari)
- **Hands-Free** - Speak your message instead of typing
- **Visual Feedback** - Red pulsing button when recording
- **Mobile Optimized** - Works great on mobile devices
- **Zero Cost** - No API fees, uses browser built-in

### **Text-to-Speech Pronunciation** ✅
- **OpenAI TTS HD** - High-quality audio pronunciation (tts-1-hd model)
- **Shimmer Voice** - Optimized for Spanish/Chamorro pronunciation
- **Automatic Fallback** - Uses browser TTS when offline
- **Language Hint** - Spanish phonetics for better Chamorro pronunciation
- **Listen Button** - Click to hear assistant messages spoken aloud
- **Mobile Optimized** - Works great on mobile devices
- **Cost-Effective** - ~$0.60 per 100 pronunciations (HD quality)

### **Image Upload (Phase 1)** ✅
- **GPT-4o-mini Vision** - Read and translate Chamorro text in images
- **Camera & Gallery** - Take photo or upload existing image
- **S3 Storage** - Images persisted to AWS S3 for history
- **Image Preview** - See image before and after sending
- **Clickable Lightbox** - Click uploaded images to view full-screen
- **Mobile Optimized** - Camera access on mobile devices
- **Cost-Effective** - ~$0.0000127 per image with low detail

### **Performance Optimizations** ✅
- **Backend Query Optimization** - Removed expensive COUNT + JOIN queries
  - Conversation list loading 5-10x faster
  - Scales efficiently with thousands of messages
  - message_count not displayed in UI, so safe to skip
- **Frontend State Management** - Removed unnecessary API refetches
  - No longer refetches all conversations after every message
  - Significantly snappier message sending experience
  - Reduces database load and network requests
- **Single Init Endpoint** - Combined conversations + messages into one API call
  - Eliminated waterfall effect (was: fetchConversations → then → fetchMessages)
  - New `/api/init` endpoint returns everything at once
  - ~27% faster initial load (1100ms → 800ms)
  - Loading skeleton provides better UX feedback
- **Impact**: App feels much faster for users with many conversations

**State Management:**
- **React Query (TanStack Query)** - Production-ready API data management ✅
  - Handles caching, refetching, invalidation automatically
  - Built-in optimistic updates and background sync
  - Perfect for API-heavy features (chat, flashcards, conversations)
  - ~$0 cost, modern standard for data fetching
  - **Migrated**: Replaced sessionStorage caching with React Query on Nov 16, 2025
  - **Benefits**: Instant navigation, automatic background refetch, cleaner code
  - Cache persists between route changes (instant flashcard ↔ chat navigation)
  - Automatic cache invalidation on user sign-out
- **Future Consideration: Zustand** - Optional, for complex client-side state
  - Lightweight (1KB) global state manager
  - Great for UI state (theme, sidebar, active mode)
  - Less boilerplate than Redux
  - **When to add**: If UI state becomes complex (multiple modals, complex forms)

**Other Future Performance Ideas** (when needed):
- **Parallel Clerk + Data Loading** - Don't wait for auth sequentially (~200ms savings)
- **Service Worker Caching** - PWA feature for instant loads on repeat visits (~400ms savings)
- **Response Streaming** - Stream conversations first, then messages (progressive loading)
- **Edge Caching** - Cache at CDN edge for global users (~250ms savings)

### **Smart Query Boosting (Option A+B)** ✅
- **Query Type Detection** - Identifies educational vs. lookup queries
  - "How do I form sentences?" → Educational
  - "What is the word for house?" → Lookup
- **Exponential Score Boosting** - 2x-3x multipliers for priority 100+ sources
  - Priority 115 (Lengguahi-ta lessons): 3x boost
  - Priority 100-109 (Educational content): 2x boost
  - Priority 50 (Dictionary): Normal ranking
- **Query-Based Filtering** - Adaptive ranking based on intent
  - Educational queries boost lessons 1.5x, penalize dictionary 0.5x
  - Lookup queries allow dictionary to rank naturally
- **Improved Source Naming** - Proper differentiation
  - "Chamoru.info: Language Lessons" vs. "Chamoru.info Dictionary"
  - "Lengguahi-ta: Beginner Lessons" vs. "Lengguahi-ta: Stories"
- **Impact**: Educational queries now return lessons with examples, not just definitions
  - BEFORE: "How to say hello?" → Dictionary, Dictionary, Dictionary
  - AFTER: "How to say hello?" → Lessons, Cultural Context, Examples
- **Your chatbot is now a TUTOR, not just a TRANSLATOR!** 🎓

**Future Optimizations** (only if needed):
- **Message Pagination**: Load messages in batches (50 at a time)
  - Implement when conversations regularly exceed 100+ messages
  - Would show "Load Earlier Messages" button at top of chat
  - 90% faster initial load for large conversations
- **Conversation Pagination**: Load conversations in batches
  - Implement when users have 100+ conversations
  - Infinite scroll or "Load More" button in sidebar

---

## 🎯 **ACTIVE ROADMAP** - Next Features to Implement

### **Phase 1: General File Upload** ✅ **COMPLETED (Nov 2025)**

**Status:** ✅ Complete  
**Complexity:** Medium  
**Effort:** 2-3 days  
**Cost:** Same as image storage (~$0.02-0.10/month)

**What's Implemented:**
- 📄 **PDF Upload** - Extract and analyze text from PDF documents
- 📝 **Word (.docx)** - Parse formatted Word documents  
- 📋 **Text (.txt)** - Analyze plain text files
- 🖼️ **Images** - (already supported) GPT-4o-mini Vision

**Features:**
- ✅ Backend: pypdf + python-docx for document parsing
- ✅ Frontend: File type detection and icons (PDF, Word, Text)
- ✅ Document preview: Shows file type icon + filename before sending
- ✅ Chat history: Document links in messages (clickable to download)
- ✅ S3 storage: All files persisted to AWS S3
- ✅ Large document handling: Truncates at 50,000 chars (~12k tokens)

**API Changes:**
- `/api/chat` now accepts `file` parameter (was `image`)
- Supports: `image/*`, `application/pdf`, `.docx`, `text/plain`
- Document text automatically appended to user message

---

### **Phase 3: Flashcards & Learning Tools** ✅ **COMPLETED (Phase 1)**

**Status:** ✅ Phase 1 Complete (Stateless MVP) | 🚧 Phase 2 Planned (User Progress)  
**Complexity:** Medium  
**Effort:** Phase 1: 1-2 days (✅ Done) | Phase 2: 2-3 days (📋 Planned)  
**Cost:** Minimal (uses existing GPT-4o-mini)

---

### **✅ Phase 1: Stateless MVP (COMPLETED - Nov 2025)**

**What We Built:**
- 🎴 **6 Default Card Decks** - Pre-made, high-quality cards
  - Greetings & Basics (10 cards)
  - Family Members (10 cards)
  - Food & Cooking (10 cards)
  - Numbers 1-20 (10 cards)
  - Common Verbs (10 cards)
  - Everyday Phrases (10 cards)
- 🤖 **Custom AI Generation** - Progressive loading (3 cards → 3 more → 3 more)
  - Uses RAG for context-aware, unique flashcards
  - Variety levels: `basic`, `conversational`, `advanced`
  - Auto-adds new cards to deck as they're generated
  - **Optimized:** 12-15s total (was 30s+) with duplicate prevention
  - **Quality:** Zero duplicates with 4-layer protection system
- 🎯 **Dual Mode Toggle** - Switch between Default and Custom AI on deck list
- 🎨 **Beautiful UI** - 3D flip animation, swipe gestures, keyboard navigation
- 📱 **Mobile Optimized** - Touch gestures, responsive design
- ⚡ **Instant Loading** - Default cards load instantly
- 🎨 **Consistent Styling** - Matches chat page (coral/ocean theme)
- 💾 **localStorage Persistence** - Custom cards survive page refresh (1 hour cache)
- 🔒 **Smart Save System** - Button shows "✓ Saved" after saving, prevents duplicate saves
- 🎯 **Rating Protection** - Can only rate cards after saving deck (prevents data loss)

**Performance Optimizations (Nov 2025):**
- ✅ **Speed:** 30-40% faster card generation (reduced RAG chunks, optimized tokens)
  - Batch generation: ~4-5s per batch (was ~6-7s)
  - Total time: 12-15s for 9 cards (was 18-21s)
- ✅ **Quality:** Zero duplicates with 4-layer protection:
  1. GPT prompt explicitly lists previous cards to avoid
  2. Backend pre-populates seen_fronts/seen_backs with ALL previous cards
  3. Backend deduplication removes exact matches (case-insensitive)
  4. Frontend safety net filters duplicates before adding to state
- ✅ **UX:** Rating buttons hidden until deck is saved (prevents rating unsaved cards)

**API Endpoint (Custom Cards):**
```python
POST /api/generate-flashcards
Form Data: {
    "topic": "greetings",        # Topic name
    "count": 3,                  # Number of cards to generate
    "variety": "basic"           # basic | conversational | advanced
}

Response: {
    "flashcards": [
        {
            "front": "Håfa Adai",
            "back": "Hello / How are you (standard Chamorro greeting)",
            "pronunciation": "HAH-fah ah-DYE"
        }
    ]
}
```

**Frontend Implementation:**
- **React Router** - `/flashcards` (deck list), `/flashcards/:topic` (viewer)
- **Default Cards** - Stored in `defaultFlashcards.ts` (no API needed)
- **Custom Cards** - Generated via API with RAG context
- **Progressive Loading** - Generate in batches, auto-add to deck
- **No Database** - Stateless for MVP validation

**Benefits:**
- ✅ Validates user interest in flashcards
- ✅ No database complexity
- ✅ Fast to implement and test
- ✅ Great UX with progressive loading

---

### **🚧 Phase 2: User Progress Tracking (IN PROGRESS - Nov 2025)**

**Status:** Database schema implemented, save/load functionality complete, rating system next!

**✅ Completed:**
- Database tables: `flashcard_decks`, `flashcards`, `user_flashcard_progress`
- API endpoints: Save deck, load user decks, load deck cards
- Frontend: "My Decks" page, save button with "✓ Saved" feedback
- UX protection: Rating buttons hidden until deck is saved

**🚧 Next Steps:**
- Wire rating buttons to `POST /api/flashcards/review` endpoint
- Implement spaced repetition algorithm (confidence-based scheduling)
- Add progress indicators (cards reviewed, cards due)
- Add "Review Due Cards" feature

**Why This Phase:**
- 📊 Track which cards users have mastered
- 🔁 Spaced repetition for better retention
- 🎯 Personalized learning paths
- 📈 Learning analytics and streaks
- 💾 Persist user's custom AI-generated cards

**Database Schema:**
```sql
-- Store user-generated or saved flashcard decks
CREATE TABLE flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,  -- true for pre-made decks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store individual flashcards (both default and user-generated)
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    pronunciation TEXT,
    example TEXT,
    difficulty TEXT,  -- beginner | intermediate | advanced
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track user progress per card (spaced repetition)
CREATE TABLE user_flashcard_progress (
    user_id TEXT NOT NULL,
    flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE,
    times_reviewed INTEGER DEFAULT 0,
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,  -- When to show again (spaced repetition)
    confidence INTEGER,       -- 1-5 rating (1=hard, 5=easy)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, flashcard_id)
);

-- Track daily/weekly stats
CREATE TABLE user_flashcard_stats (
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    cards_reviewed INTEGER DEFAULT 0,
    cards_mastered INTEGER DEFAULT 0,
    study_time_seconds INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, date)
);

CREATE INDEX idx_flashcard_progress_user ON user_flashcard_progress(user_id);
CREATE INDEX idx_flashcard_progress_next_review ON user_flashcard_progress(next_review);
CREATE INDEX idx_flashcard_stats_user ON user_flashcard_stats(user_id);
```

**New API Endpoints:**
```python
# Save custom AI cards to user's deck
POST /api/flashcards/decks/{deck_id}/save
Body: { "flashcards": [...] }

# Get user's saved decks
GET /api/flashcards/decks?user_id=user-123

# Mark card as reviewed (updates spaced repetition)
POST /api/flashcards/progress
Body: {
    "flashcard_id": "uuid-...",
    "confidence": 4  # 1-5 rating
}

# Get next cards to review (due for spaced repetition)
GET /api/flashcards/review?user_id=user-123&limit=10

# Get user stats
GET /api/flashcards/stats?user_id=user-123&period=week
```

**Frontend Features:**
- 📊 **Progress Dashboard** - Cards reviewed today, streak, mastery %
- 🔁 **Spaced Repetition** - Cards appear based on confidence level
- 💾 **Save Custom Cards** - Save AI-generated cards to your deck
- 📈 **Learning Analytics** - Weekly/monthly review stats
- 🎯 **Due Cards Indicator** - Show how many cards need review
- ⭐ **Mastery Levels** - Visual indicators for card mastery

**Spaced Repetition Algorithm:**
- **Confidence 1 (Hard):** Review in 1 day
- **Confidence 2:** Review in 3 days
- **Confidence 3 (Good):** Review in 7 days
- **Confidence 4:** Review in 14 days
- **Confidence 5 (Easy):** Review in 30 days

**Implementation Priority:**
1. Database schema + migrations
2. Backend API endpoints
3. Save custom cards to user deck
4. Track review progress
5. Spaced repetition logic
6. Progress dashboard UI

**Why Wait for Phase 2:**
- ✅ Phase 1 validates user interest
- ✅ Can gather feedback on card quality/topics
- ✅ No premature optimization
- ✅ Users can test flashcards without commitment

---

## 🎓 **Learning Features Roadmap** - Teaching Chamorro

**Goal:** Make HåfaGPT a complete learning application for self-study and teaching children.

**Design Principles:**
- 📱 **Mobile-first** - Optimized for phone use, scales up to desktop
- 🎯 **Intuitive navigation** - Users should easily find Study, Quiz, Daily Word
- 👶 **Kid-friendly** - Large touch targets, clear feedback, encouraging UI
- ⚡ **Fast & responsive** - Instant loading, no waiting

**Note:** Audio/pronunciation features deferred until a quality Chamorro TTS model is available.

---

### **Phase 2A: Quiz Mode** 🎯 ✅ **COMPLETED (Nov 2025)**

**Status:** ✅ Complete (Stateless MVP)  
**Complexity:** Medium  
**Effort:** 1 day  
**Cost:** None (hardcoded data)

**What's Implemented:**
- 🎯 **6 Quiz Categories** - Greetings, Family, Numbers, Food, Common Phrases, Colors
- ❓ **48 Questions** - 8 questions per category
- 📝 **3 Question Types** - Multiple choice, Type answer, Fill in blank
- 💡 **Hints & Explanations** - Help users learn from mistakes
- 📊 **Score Tracking** - Results screen with review
- 📱 **Mobile Optimized** - Touch-friendly, responsive design
- 🔀 **Shuffled Questions** - Different order each time

**Architecture Decision: Frontend Hardcoded ✅**

Quiz data is stored in `quizData.ts` (frontend), NOT fetched from backend API.

*Why hardcoded?*
- ⚡ **Instant loading** - No API call needed
- 🔒 **Works offline** - No network dependency
- 🛠️ **Simple** - No database schema, no backend changes
- 💰 **Free** - No server costs for quiz data
- 📦 **Small footprint** - ~5KB for 48 questions

*When to move to backend?*
- When adding **score tracking** (need user_id → quiz_results table)
- When implementing **AI-generated quizzes** (use RAG to create questions)
- When question count exceeds **100+** and you want category-based loading

**Frontend Routes:**
- `/quiz` - Category selection page
- `/quiz/:categoryId` - Quiz viewer (questions, scoring, results)

**Future Enhancements (Phase 2):**

*More Content:*
- [ ] Add more categories: Animals, Body Parts, Days/Time, Weather
- [ ] Expand to 12-15 questions per category (currently 8)
- [ ] Add difficulty levels (Easy/Medium/Hard toggle)

*New Quiz Types:*
- [ ] Picture quiz (show image → pick word) - great for kids!
- [ ] Matching quiz (drag & drop pairs)
- [ ] Listening quiz (when Chamorro TTS available)

*Gamification & Tracking:*
- [ ] Database score tracking (`quiz_results` table)
- [ ] High score persistence per user
- [ ] Leaderboards and achievements
- [ ] Sound effects (ding for correct, buzz for incorrect)

*Advanced:*
- [ ] AI-generated quizzes from RAG
- [ ] Adaptive difficulty (harder questions after correct streaks)

**Why This Feature:**
- 🎯 Test knowledge retention (not just passive learning)
- 🎮 Gamified learning (fun for kids!)
- 📊 Track progress and identify weak areas
- 👨‍👩‍👧 Great for parent-child learning

**Quiz Types (All Text-Based):**
1. **Multiple Choice** - "What does 'hånom' mean?" → A) Water B) Fire C) Food
2. **Type Answer** - "How do you say 'thank you'?" → User types answer
3. **Matching** - Match Chamorro words to English meanings (drag & drop)
4. **Fill in Blank** - "Håfa ___!" (Adai)
5. **Picture Quiz** - Show image → Pick the Chamorro word (great for kids!)

**Implementation:**
```typescript
// Quiz question structure
interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'type_answer' | 'matching' | 'fill_blank' | 'picture';
  question: string;
  options?: string[];        // For multiple choice
  correctAnswer: string;
  imageUrl?: string;         // For picture quiz
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;          // greetings, family, numbers, etc.
}

// Quiz result tracking
interface QuizResult {
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  wrongAnswers: string[];    // For review
  completedAt: Date;
}
```

**Features:**
- [ ] Multiple quiz types (MC, type, matching, fill-blank, picture)
- [ ] Difficulty levels (easy/medium/hard)
- [ ] Category selection (family, food, greetings, etc.)
- [ ] Score tracking and streaks
- [ ] Review wrong answers
- [ ] Kid-friendly mode (more pictures, simpler words)

**Database:**
```sql
CREATE TABLE quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    quiz_type TEXT NOT NULL,
    category TEXT,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    time_spent_seconds INTEGER,
    wrong_answers JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **Phase 2B: Daily Word/Phrase** 📅 ✅ **COMPLETED (Nov 2025)**

**Status:** ✅ Complete  
**Complexity:** Low  
**Effort:** 1 day  
**Cost:** None (frontend only)

**What's Implemented:**
- 🌟 **76 words/phrases** across 7 categories
- 📊 **Difficulty mix:** Beginner (70%), Intermediate (26%), Advanced (4%)
- 🔊 **TTS pronunciation** button
- 📝 **Example sentences** (expandable)
- 🏷️ **Difficulty badges** and category labels
- 🌙 **Dark mode support** with shadow/depth effects
- 📱 **Mobile optimized** - collapsible mode explanations

**Categories:**
- Greetings, Family, Food & Drink, Numbers, Colors, Common Phrases, Culture, Verbs

**How It Works:**
- Rotates daily based on day of year
- Everyone sees the same word on the same day
- Cycles through all 76 words, then repeats
- Changes at midnight (user's local time)

**Architecture:** Frontend-only (`dailyWords.ts`)
- No backend/database needed
- Instant loading
- Works offline

**Future Enhancements:**
- [ ] "Add to Flashcards" integration
- [ ] Streak tracking (days in a row)
- [ ] Past words calendar/history
- [ ] User can mark as "learned"

---

### **Phase 2C: Progress Dashboard** 📊 ✅ **COMPLETED (Nov 2025)**

**Status:** ✅ Phase 1 Complete (Simple Stats)  
**Complexity:** Medium  
**Effort:** 1 day (Phase 1), 2-3 days (Phase 2)  
**Cost:** None

**What's Implemented (Phase 1 - Simple Stats):**
- ✅ **Conversations Count** - Total chats with HåfaGPT
- ✅ **Quizzes Taken** - Number of quizzes completed (database-tracked)
- ✅ **Quiz Average** - Average score across all quizzes
- ✅ **Best Category** - Your strongest quiz category
- ✅ **Recent Quiz History** - Last 5 quiz attempts with scores
- ✅ **Quick Actions** - Links to Chat, Quiz, Flashcards
- ✅ **Member Since** - Account creation date
- ✅ **Responsive Design** - Optimized for mobile and desktop
- ✅ **Database Quiz Tracking** - Quiz results saved to PostgreSQL via API

**Architecture:**
- Quiz results stored in `quiz_results` PostgreSQL table
- API endpoints: `POST /api/quiz/results`, `GET /api/quiz/stats`
- React Query for data fetching with automatic cache invalidation
- Conversation stats from existing database

**Phase 2 - Future Enhancements:**
- 🔥 **Learning Streaks** - Days in a row (requires database)
- 🏆 **Achievements/Badges** - Milestones (10 words, 50 words, 7-day streak)
- 📚 **Flashcard Progress** - Cards mastered, due for review
- ⏱️ **Time Spent** - Total learning time tracking
- 📊 **Progress Charts** - Visual graphs over time

**For Kids (Phase 2):**
- Star chart (fill up stars!)
- Fun badges with icons
- Progress bar to next level
- Celebratory animations

---

### **Phase 2D: Vocabulary Browser** 📝 ✅ **COMPLETED (Nov 2025)**

**Status:** ✅ Complete  
**Complexity:** Medium  
**Effort:** 2 days  
**Cost:** None

**What's Implemented:**
- ✅ **10,350+ Dictionary Words** - Full dictionary loaded via API
- ✅ **12 Categories** - Greetings, Family, Numbers, Colors, Food, Animals, Body, Nature, Places, Time, Verbs, Phrases
- ✅ **Search with Diacritic Handling** - "hanom" finds "hånum", spelling variants supported
- ✅ **Pagination** - Load 50 words at a time with "Load More"
- ✅ **Word Details** - Definition, part of speech, examples
- ✅ **TTS Pronunciation** - Click to hear words spoken
- ✅ **Mobile Optimized** - Responsive design for all devices

**API Endpoints:**
- `GET /api/vocabulary/categories` - List all categories with word counts
- `GET /api/vocabulary/categories/{id}` - Get words in a category (paginated)
- `GET /api/vocabulary/search?q=` - Search across all words
- `GET /api/vocabulary/word/{word}` - Get single word details
- `GET /api/vocabulary/word-of-the-day` - Daily rotating word
- `GET /api/vocabulary/flashcards/{category}` - Dictionary-based flashcards
- `GET /api/vocabulary/quiz/{category}` - Dictionary-based quiz questions

**Technical Details:**
- Dictionary loaded into memory on server startup (~5MB)
- Smart category classification with context-aware matching
- Diacritic normalization (å→a, '→removed) + spelling variants (o↔u)
- Fuzzy matching for common Chamorro spelling variations

---

### **Phase 2E: Story Mode (Text-Only)** 📖 ✅ **COMPLETED (Nov 2025)**

**Status:** ✅ Complete  
**Complexity:** Medium  
**Effort:** 3 days  
**Cost:** None

**What's Implemented:**
- 📚 **17 Total Stories** - 6 curated + 11 pre-extracted from Lengguahi-ta
- 🔤 **Tap-to-Translate** - Click any word to see translation
- 🧠 **Chamorro Morphology** - Strips possessive suffixes (-ña, -hu, -mu) to find root words
- 📖 **Paragraph Navigation** - Progress through stories one paragraph at a time
- 🔊 **TTS Pronunciation** - Listen to Chamorro text
- ❓ **Comprehension Quizzes** - Test understanding after curated stories
- 📱 **Mobile Optimized** - Touch-friendly, responsive design

**Story Sources:**
- **Curated Stories (6)** - Hand-crafted with comprehension quizzes
  - Håfa Adai, Maria! (Beginner - Greetings)
  - I Familia-hu (Beginner - Family)
  - I Gima'-hu (Beginner - House)
  - I Taotao Mo'na (Intermediate - Spirits)
  - I Fiestas Chamorro (Intermediate - Culture)
  - I Haligi yan i Tasa (Advanced - History)
- **Lengguahi-ta Stories (11)** - Pre-extracted bilingual stories
  - The Sandpiper Girl (50 paragraphs)
  - The Women of Guam and Their Land (27 paragraphs)
  - The Canary and The White Tern (27 paragraphs)
  - And 8 more...

**Technical Implementation:**
- **Backend:**
  - `api/story_service.py` - Serves pre-extracted stories from JSON
  - `api/chamorro_morphology.py` - Root word extraction for tap-to-translate
  - `scripts/extract_stories.py` - Quality-validated story extraction
  - Enhanced `/api/vocabulary/word/{word}?enhanced=true` endpoint
- **Frontend:**
  - `StoryList.tsx` - Story library with Curated/Lengguahi-ta tabs
  - `StoryViewer.tsx` - Curated stories with quizzes
  - `LengguahitaStoryViewer.tsx` - Pre-extracted story viewer
  - `useStoryQuery.ts` - React Query hooks for story API

**Enhanced Word Lookup:**
- **Morphology Support** - "hagon-ña" → finds "hagon" (leaf) + note "form of hagon"
- **Contextual Fallback** - Shows English translation paragraph if word not found
- **Ask HåfaGPT Button** - Navigate to chat with pre-filled question

**Quality Control (Extraction Script):**
- Validates Chamorro field contains actual Chamorro text
- Rejects English-only articles (essays, analysis)
- Rejects articles with mixed-up sections (footnotes in wrong field)
- Removes duplicate stories (same URL with query parameters)

**Future Enhancements:**
- [ ] Add more stories from Guampedia legends
- [ ] Story completion tracking
- [ ] Bookmark/continue later
- [ ] Difficulty filtering

---

### **Phase 2F: Conversation Practice (Text)** 💬 **IMMERSIVE**

**Status:** 📋 Planned  
**Complexity:** Medium  
**Effort:** 2-3 days  
**Cost:** Uses existing GPT-4o

**Why This Feature:**
- 💬 Practice real conversations
- 🎭 Scenario-based learning (practical situations)
- 🤖 AI plays the other person
- 💡 Hints available if stuck

**Scenarios:**
- 👋 Meeting someone new
- 🍽️ Ordering food at a restaurant
- 🛒 Shopping at the market
- 👴 Talking to grandparents
- 📞 Phone conversation
- 🏠 At home with family

**Implementation:**
- Select scenario
- Bot starts conversation in Chamorro
- User responds (with hint button if stuck)
- Bot continues naturally
- Feedback on responses
- Track scenarios completed

---

### **Future: Audio Features** 🔊 **DEFERRED**

**Status:** ⏸️ Waiting for quality Chamorro TTS  
**Reason:** No good Chamorro pronunciation model exists yet

**When Available, Add:**
- 🎤 Pronunciation practice (record & compare)
- 👂 Listening quizzes (identify spoken word)
- 🔊 Story narration
- 🗣️ Conversation audio

**Potential Solutions (Future):**
- ElevenLabs voice cloning (clone a native speaker)
- Community Chamorro TTS model
- Partnership with Chamorro language organizations

---

### **Future: Full Offline/Local Mode** 🔌 **DEFERRED**

**Status:** ⏸️ Planned for future  
**Reason:** Currently requires internet for OpenAI API calls  
**Goal:** Run HåfaGPT 100% locally without internet

**Current State:**
- ❌ **LLM:** Requires OpenAI API (GPT-4o-mini) - needs internet
- ❌ **Embeddings:** Using `EMBEDDING_MODE=openai` - needs internet
- ❌ **TTS:** Using OpenAI TTS HD - needs internet
- ✅ **Database:** Can run PostgreSQL locally
- ✅ **Frontend:** Runs locally (Vite dev server)
- ✅ **Backend:** Runs locally (FastAPI/uvicorn)

**Why Local Embeddings Don't Work Currently:**
```bash
# These packages were REMOVED because they're too heavy for Render (512MB RAM):
# - langchain_huggingface (~50MB but pulls in torch)
# - torch (~900MB)
# - transformers (~400MB)
# - sentence-transformers (~500MB)

# Total: ~1.8GB+ just for local embeddings!
```

**To Enable Full Offline Mode (Future):**

1. **Local LLM** - Replace OpenAI with local model
   - Options: Ollama (Llama 3, Mistral), LM Studio, llama.cpp
   - Would need ~8GB RAM for decent quality
   - Add `LLM_MODE=local` environment variable

2. **Local Embeddings** - Re-enable HuggingFace embeddings
   - Create separate `requirements-dev.txt` with heavy packages
   - Use `EMBEDDING_MODE=local` for offline development
   - Keep production lean with `EMBEDDING_MODE=openai`

3. **Local TTS** - Replace OpenAI TTS
   - Options: Coqui TTS, pyttsx3 (basic), espeak
   - Quality won't be as good as OpenAI TTS HD
   - Browser TTS fallback already exists

4. **Local Database** - Already supported
   - Just change `DATABASE_URL` to local PostgreSQL
   - Run: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres`

**Implementation Plan:**

```bash
# .env for OFFLINE mode (future)
LLM_MODE=local              # Use Ollama/local model
EMBEDDING_MODE=local        # Use HuggingFace embeddings
TTS_MODE=local              # Use local TTS (Coqui/pyttsx3)
DATABASE_URL=postgresql://localhost:5432/hafagpt

# .env for PRODUCTION (current)
LLM_MODE=openai             # Use GPT-4o-mini
EMBEDDING_MODE=openai       # Use OpenAI embeddings
TTS_MODE=openai             # Use OpenAI TTS HD
DATABASE_URL=postgresql://neon.tech/...
```

**Effort Estimate:**
- Local LLM integration: 2-3 days
- Local embeddings setup: 1 day (just dependency management)
- Local TTS: 1 day
- Testing & documentation: 1 day
- **Total: ~5-6 days**

**When to Implement:**
- When offline usage becomes a priority
- When local hardware can handle it (8GB+ RAM recommended)
- After core learning features are complete

---

## 💰 **Cost Estimate**

**Current Production Costs:**
- Clerk Development: **FREE** (10,000 MAU)
- PostgreSQL (Neon): **FREE** (500MB)
- GPT-4o-mini text: **$2-5/month**
- OpenAI TTS HD: **~$0.50-2/month** (typical usage: 50-200 pronunciations)
- Brave Search API: **FREE** (2,000 queries/month)
- GPT-4o-mini images: **$0.10-0.50/month**
- AWS S3 (image storage): **$0.02-0.10/month**
- **Total: $2.62-8.60/month** 🎉

---

## 📋 **Updated Implementation Timeline**

| Phase | Feature | Time | Status |
|-------|---------|------|--------|
| **Phase 1** | ✅ Authentication (Clerk) | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ Conversation Management | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ Mobile UX Optimization | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ Web Search Tool | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ Speech-to-Text | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ Audio Pronunciation (OpenAI TTS HD) | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ Image Upload + S3 Storage | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ Performance Optimizations (React Query) | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ Flashcards (Stateless MVP) | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ User Feedback System (Thumbs Up/Down) | - | ✅ **COMPLETED** |
| **Phase 1** | ✅ File Upload (PDF/Word/Text) | - | ✅ **COMPLETED** |
| **Phase 2A** | ✅ Quiz Mode (Curated + Dictionary) | - | ✅ **COMPLETED** |
| **Phase 2B** | ✅ Daily Word/Phrase (API-powered) | - | ✅ **COMPLETED** |
| **Phase 2C** | ✅ Progress Dashboard + Quiz Review | - | ✅ **COMPLETED** |
| **Phase 2D** | ✅ Vocabulary Browser (10,350+ words) | - | ✅ **COMPLETED** |
| **Phase 2E** | ✅ Story Mode (17 stories + tap-to-translate) | - | ✅ **COMPLETED** |
| **Phase 2F** | Conversation Practice | 2-3 days | 📋 Planned |
| **Phase 3** | Flashcards (User Progress Tracking) | 2-3 days | 🚧 In Progress |
| **Future** | Audio Features (Chamorro TTS) | TBD | ⏸️ Waiting for TTS |
| **Future** | Full Offline/Local Mode | 5-6 days | ⏸️ Planned |
| **Total** | Learning Features | **~5-8 days remaining** | 🎉 90% Complete! |

---

## 🎯 **Next Steps - Priority Order**

**✅ Recently Completed:**

1. ~~**Quiz Mode**~~ ✅ **COMPLETED**
   - 6 curated categories + dictionary-based quizzes (10,350+ words)
   - Quiz review with detailed answers
   - "I don't know" button, browser warning on exit

2. ~~**Daily Word/Phrase**~~ ✅ **COMPLETED**
   - API-powered from dictionary (deterministic daily rotation)
   - TTS pronunciation, examples, category labels

3. ~~**Progress Dashboard**~~ ✅ **COMPLETED**
   - Database-tracked quiz scores with detailed answers
   - Clickable quiz history to review past attempts
   - Responsive design for mobile/desktop

4. ~~**Vocabulary Browser**~~ ✅ **COMPLETED**
   - 10,350+ words from dictionary API
   - Search with diacritic handling and spelling variants
   - Pagination, categories, TTS pronunciation

5. ~~**Story Mode**~~ ✅ **COMPLETED**
   - 17 stories (6 curated + 11 Lengguahi-ta)
   - Tap-to-translate with Chamorro morphology
   - Comprehension quizzes for curated stories
   - Enhanced word lookup (root word extraction)

**📋 Next Up:**

6. **Conversation Practice** - 2-3 days
   - Immersive scenarios
   - Practical application

7. **Flashcard User Progress** - 2-3 days
   - Database tracking for spaced repetition
   - Rating system (Hard/Good/Easy)

---

## 📊 **User Feedback System** ✅ **COMPLETED (Nov 2025)**

### **What's Implemented:**
- ✅ **Thumbs Up/Down Buttons** - On every assistant message
- ✅ **Database Storage** - `message_feedback` table stores all ratings
- ✅ **PostHog Events** - `message_feedback` event tracked with metadata
- ✅ **Anonymous Support** - Both logged-in and anonymous users can rate

### **Current Usage: Manual SQL Queries**

Query the database to analyze feedback:

```sql
-- Overall satisfaction rate
SELECT 
  feedback_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM message_feedback
GROUP BY feedback_type;

-- Most downvoted responses (find problem areas)
SELECT user_query, LEFT(bot_response, 100) as response_preview, created_at
FROM message_feedback
WHERE feedback_type = 'down'
ORDER BY created_at DESC
LIMIT 10;

-- Feedback trend by day
SELECT 
  DATE(created_at) as date,
  SUM(CASE WHEN feedback_type = 'up' THEN 1 ELSE 0 END) as thumbs_up,
  SUM(CASE WHEN feedback_type = 'down' THEN 1 ELSE 0 END) as thumbs_down
FROM message_feedback
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### **Future Enhancement: PostHog Dashboard** 🔜

When you have enough feedback data (50+ ratings), create a visual dashboard:

**Dashboard Components:**
- 📈 **Satisfaction Trend** - Line chart of thumbs up % over time
- 🔢 **Total Ratings** - Count of up/down ratings
- 👎 **Problem Queries** - Table of most downvoted responses
- ⏱️ **Response Time Correlation** - Does slower = more downvotes?
- 🎯 **By Mode** - Satisfaction breakdown by English/Chamorro/Learn mode

**How to Create:**
1. Go to PostHog Dashboard
2. Create new Insight → Filter by `message_feedback` event
3. Breakdown by `feedback_type` property
4. Add to dashboard

**When to Build:** After collecting 50-100 feedback ratings

---

## 📚 **Additional Feature Ideas** (Lower Priority)

### **1. PostHog + Stripe Analytics Integration** 📊 **FUTURE ENHANCEMENT**
**Status:** Frontend analytics already integrated (Nov 2025)  
**Future:** Connect Stripe payment data when monetization is added

**Current Setup:**
- ✅ PostHog frontend tracking (user behavior, session replay, events)
- ✅ Auto-capture clicks, page views, feature usage
- ✅ Session recordings with privacy masking
- ✅ User identification via Clerk

**Future Integration (When Adding Payments):**
- 🔜 **Stripe + PostHog Link** - Track revenue alongside user behavior
  - Free vs. paid user segmentation
  - Conversion funnel analysis (signup → feature usage → upgrade)
  - Revenue per user tracking
  - Churn prediction and analysis
- 🔜 **Clerk + PostHog Identity** - Link user profiles across systems
- 🔜 **Feature → Revenue Correlation** - Which features drive conversions?

**How to Add Later:**
1. PostHog Dashboard → Settings → Integrations → Link Data
2. Connect Stripe account
3. Configure revenue tracking
4. Build conversion dashboards

**Cost:** $0 additional (PostHog Starter plan includes Stripe integration)

---

### **2. Enhanced Audio Pronunciation (ElevenLabs)** 🔊 **FUTURE UPGRADE**
**Current:** OpenAI TTS HD with Spanish hints (acceptable quality)
**Future Upgrade:** ElevenLabs for significantly better pronunciation
- **Why ElevenLabs:**
  - Professional-grade voice quality (best in industry)
  - Voice cloning capability (can clone a real Chamorro speaker)
  - Better handling of non-English phonetics
  - More natural intonation and rhythm
- **Cost:** ~$11/month (Starter plan, 30K characters/month)
- **Use Case:** If pronunciation quality becomes a priority for users
- **Implementation:** Simple API swap, keep OpenAI TTS as fallback
- **Decision Point:** Wait for user feedback - current TTS HD may be sufficient

### **2. Progress Dashboard** 📊
- Learning streak tracking
- Words mastered counter
- Daily/weekly goals
- Conversation statistics

### **4. Share Conversations** 🔗
- Export conversation as PDF
- Share specific Q&A pairs
- Create shareable flashcard decks

### **5. Dark Mode** 🌙
- Already implemented in frontend!
- Automatic based on system preference

---

## 🔧 **Technical Notes**

### **Current Architecture:**
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python 3.12+
- **Database**: PostgreSQL + PGVector (Neon)
- **Authentication**: Clerk (Development instance for now)
- **Deployment**: 
  - Frontend: Netlify (auto-deploy on push)
  - Backend: Render (auto-deploy on push)

### **API Endpoints:**
```
POST   /api/chat                    # Send message to chatbot
POST   /api/conversations           # Create new conversation
GET    /api/conversations           # List user's conversations
GET    /api/conversations/{id}      # Get conversation details
GET    /api/conversations/{id}/messages  # Get conversation messages
PATCH  /api/conversations/{id}      # Update conversation title
DELETE /api/conversations/{id}      # Soft delete conversation
```

### **Database Tables:**
```
conversations          # User-facing conversations (soft delete)
conversation_logs      # Complete message history (never deleted)
langchain_pg_embedding # RAG vector embeddings
langchain_pg_collection # RAG collection metadata
```

---

## 📖 **Related Documentation**

- `HafaGPT-API/README.md` - Backend setup and API reference
- `HafaGPT-API/api/README.md` - Detailed API documentation
- `HafaGPT-frontend/README.md` - Frontend setup and usage
- `CLERK_AUTH_STATUS.md` - Authentication implementation details
- `CONVERSATION_ANALYTICS.md` - Conversation tracking and analytics
- `RAG_MANAGEMENT_GUIDE.md` - Database management
- `MODEL_SWITCHING_GUIDE.md` - Local vs cloud models

---

## 🎉 **Success Metrics**

### **What's Working Well:**
- ✅ Fast responses (2-8s on cloud mode)
- ✅ High accuracy (99% with GPT-4o-mini)
- ✅ Smooth conversation management
- ✅ Great mobile experience
- ✅ Reliable authentication
- ✅ Cost-effective ($2-6/month)

### **Areas for Improvement:**
- 📸 Add image upload for homework help
- 📚 Implement flashcards for structured learning
- 🔊 Add audio pronunciation
- 📊 Build progress tracking dashboard

---

**Ready to build the next feature? Let me know which one to start with!** 🌺
