# 🎮 Chamorro Learning Games

> **Goal:** Fun, engaging games to learn Chamorro for kids, teens, and adults.

## 📊 Status Overview

| Phase | Status | Games |
|-------|--------|-------|
| Phase 1 | ✅ Completed | Memory Match |
| Phase 2 | 📋 Planned | Word Scramble, Speed Round |
| Phase 3 | 📋 Future | Daily Challenges, Leaderboards, More Games |

---

## 🎯 Phase 1: Memory Match (MVP)

**Status:** ✅ Completed (Dec 7, 2025)  
**Effort:** 2 sessions  
**Target:** Kids-friendly, all ages can enjoy

### Game Description
- Grid of face-down cards with hibiscus flower pattern
- Flip 2 cards to find matching pairs (Chamorro ↔ English)
- Win by matching all pairs
- Star rating based on efficiency (1-3 stars)

### Features Checklist

**Core Game:**
- [x] Game hub page (`/games`)
- [x] Memory Match page (`/games/memory`)
- [x] Card grid layout (responsive, 4 columns)
- [x] Card flip animation (CSS 3D transform)
- [x] Match detection logic
- [x] Win condition & celebration (with stars!)

**Game Modes:**
- [x] Beginner Mode: Curated flashcard data (common phrases)
- [x] Challenge Mode: Full dictionary API (advanced vocabulary)
- [x] Mode selector on setup screen

**Category Selection:**
- [x] Category picker (varies by mode)
- [x] Beginner: 9 curated categories from `defaultFlashcards.ts`
- [x] Challenge: All dictionary categories from API
- [x] Display names for all categories (no truncation)
- [x] Random word selection per game

**Difficulty Levels:**
- [x] Easy: 4 pairs (8 cards) - 2x4 grid
- [x] Medium: 6 pairs (12 cards) - 3x4 grid
- [x] Hard: 8 pairs (16 cards) - 4x4 grid
- [x] Disable difficulty options if not enough cards in category

**Scoring:**
- [x] Move counter
- [x] Timer display
- [x] Score calculation (fewer moves = better)
- [x] Star rating (1-3 stars based on efficiency)
- [x] "Play Again" button

**Polish:**
- [x] Mobile-responsive (square cards on mobile, taller on desktop)
- [x] Touch-friendly (big cards)
- [x] Visual feedback (correct match = green)
- [x] Encouraging messages & star ratings
- [x] `beforeunload` warning when game in progress

**Auth & Progress Tracking:**
- [x] Requires sign-in to play (ProtectedRoute)
- [x] Full database tracking for game results
- [x] Save score, moves, time, stars, category, difficulty
- [x] Game stats on Dashboard (total games, avg stars)
- [x] Recent games shown on Dashboard

**App Integration:**
- [x] Games link on Homepage (both mobile & desktop)
- [x] "Account Required" badge for non-signed-in users
- [x] Games stats in Homepage quick stats (desktop)
- [x] "Play Games" link in Dashboard "Continue Learning"
- [x] Games count & avg stars in Dashboard stats grid

### Technical Notes

**Backend Changes:**
- New `game_results` table (Alembic migration)
- API endpoints:
  - `POST /api/games/results` - Save game result
  - `GET /api/games/stats` - Get user's game stats
  - `GET /api/games/history` - Get recent game history

**Frontend Routes:**
```
/games              → Game hub (list all games)
/games/memory       → Memory Match game
```

**Key Components:**
```
src/components/Games.tsx              # Game hub
src/components/MemoryMatch.tsx        # Memory game page
src/components/games/MemoryCard.tsx   # Flip card component
src/hooks/useGamesQuery.ts            # Game API hooks
```

**Data Sources:**
- **Beginner Mode:** `src/data/defaultFlashcards.ts`
- **Challenge Mode:** `/api/vocabulary/flashcards/{id}` endpoint

---

## 📋 Phase 2: More Games

**Status:** 📋 Planned  
**Target:** After Phase 1 is solid

### Word Scramble 🔤
- Unscramble letters to form Chamorro word
- Example: "I A D A F Å H A" → "HÅFA ADAI"
- Hint: Show English meaning or first letter
- Best for: Spelling practice, teens/adults

### Speed Round ⚡
- 60-second timer
- Translate as many words as possible
- Multiple choice (4 options)
- Streak bonus for consecutive correct
- Best for: Quick practice, vocabulary drilling

### Phase 2 Features
- [ ] Word Scramble game
- [ ] Speed Round game
- [ ] Sound effects (correct/wrong dings)
- [ ] Share score feature

---

## 🚀 Phase 3: Engagement & Social

**Status:** 📋 Future  
**Target:** After games are popular

### Features
- [ ] Daily Challenge (one game per day)
- [ ] Leaderboards (global/friends)
- [ ] Achievements & Badges
- [ ] Learning streaks integration

---

## 🎨 Design Principles

1. **Mobile-First** - Most users play on phones
2. **Big Touch Targets** - Easy for kids to tap
3. **Encouraging** - "Great job!" not "Wrong!"
4. **Consistent Auth** - Requires sign-in (like quizzes/flashcards)
5. **Chamorro Immersion** - Include Chamorro UI text where appropriate

---

## 📁 File Structure

```
HafaGPT-frontend/src/
├── components/
│   ├── Games.tsx                     # Game hub
│   ├── MemoryMatch.tsx               # Memory game page
│   └── games/
│       └── MemoryCard.tsx            # Flip card component
├── hooks/
│   └── useGamesQuery.ts              # Game API hooks (save, stats, history)
└── data/
    └── defaultFlashcards.ts          # Curated flashcard data (beginner mode)

HafaGPT-API/
├── api/
│   ├── main.py                       # Game result endpoints
│   └── models.py                     # GameResultCreate, GameStatsResponse
└── alembic/versions/
    └── a1b2c3d4e5f6_add_game_results_table.py
```

---

## 📝 Development Log

### Dec 6, 2025
- Created GAMES_FEATURE.md planning document
- Defined Phase 1 scope (Memory Match)
- ✅ Implemented Memory Match game with full gameplay mechanics
- ✅ Added dual modes (Beginner/Challenge)
- ✅ Added Games link to homepage

### Dec 7, 2025
- ✅ Fixed card rendering issues (overflow, sizing)
- ✅ Added proper category display names (no truncation)
- ✅ Implemented full database tracking for game results:
  - Created `game_results` table with Alembic migration
  - Added API endpoints: POST results, GET stats, GET history
  - Frontend hooks: useSaveGameResult, useGameStats, useGameHistory
- ✅ Integrated with Dashboard:
  - Games count & avg stars in stats grid
  - Recent games section with star display
  - "Play Games" link in Continue Learning
- ✅ Integrated with Homepage:
  - Games stat in quick stats (desktop)
  - Progress card in desktop grid (when signed in)
- ✅ Added ProtectedRoute for games (requires sign-in)
- ✅ Added "Account Required" badges on homepage for non-signed-in users
- ✅ Added "Explore Free / Free Account" welcome section for visitors

---

## 🔗 Related Resources

- **Dictionary API:** `/api/vocabulary/category/{id}` - Source for game words
- **Existing Categories:** greetings, family, numbers, colors, food, animals, body, nature, places, time, verbs, phrases
- **Auth Pattern:** Clerk (same as rest of app, requires sign-in)
