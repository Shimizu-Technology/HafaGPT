# 🎮 Chamorro Learning Games

> **Goal:** Fun, engaging games to learn Chamorro for kids, teens, and adults.
> **Philosophy:** The GAME should be fun first. Learning happens almost by accident.

## 📊 Status Overview

| Phase | Status | Games |
|-------|--------|-------|
| Phase 1 | ✅ Completed | Memory Match, Word Scramble, Falling Words |
| Phase 2 | 🚧 In Progress | Word Catch, Chamorro Wordle |
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
/games/scramble     → Word Scramble game
/games/falling      → Falling Words game
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

## ✅ Word Scramble (Completed)

**Status:** ✅ Completed (Dec 7, 2025)

Unscramble letters to spell the Chamorro word.

- See English meaning, arrange scrambled letters
- Tap letters to build answer
- Hint button (reveals first letter)
- Streak bonuses for consecutive correct
- Beginner Mode & Challenge Mode

---

## 🚧 Phase 2: Action Games (In Progress)

These games prioritize **fun gameplay** - learning happens naturally through play.

### Falling Words ⬇️
**Status:** ✅ Completed (Dec 7, 2025)  
**Inspired By:** Tetris  
**Best For:** Quick reflexes, vocabulary recognition

**Concept:**
- Chamorro words fall from the sky
- 4 answer buttons at the bottom (English translations)
- Tap the correct translation before the word hits bottom
- Speed increases as you progress (every 5 words)
- Lives system (3 hearts)

**Features:**
- [x] Falling word animation (smooth CSS/JS)
- [x] 4-option answer buttons
- [x] Speed progression (gets faster every 5 words)
- [x] Lives/hearts system
- [x] Score multiplier for streaks
- [x] Game over screen with stats & star rating
- [x] Beginner/Challenge modes
- [x] No duplicate words in single session
- [x] Consistent app theming (light/dark mode)

---

### Word Catch 🗡️
**Status:** 📋 Planned  
**Inspired By:** Fruit Ninja  
**Best For:** Fast-paced fun, pattern recognition

**Concept:**
- Word pairs fly across the screen
- Tap to "catch" CORRECT pairs (Chamorro = English)
- Avoid tapping WRONG pairs
- Combo multiplier for consecutive catches
- Speed increases over time

**Features:**
- [ ] Words flying across screen (various angles)
- [ ] Tap to catch
- [ ] Visual catch effect (satisfying!)
- [ ] Combo counter
- [ ] Wrong pairs to avoid
- [ ] Time limit or lives mode

---

### Chamorro Wordle 📝
**Status:** 📋 Planned  
**Inspired By:** Wordle  
**Best For:** Daily engagement, spelling mastery

**Concept:**
- Guess the Chamorro word in 6 tries
- Color hints: 🟩 correct position, 🟨 wrong position, ⬜ not in word
- Daily challenge (same word for everyone)
- Practice mode (unlimited plays)

**Features:**
- [ ] 6-row letter grid
- [ ] On-screen Chamorro keyboard (with å, ñ, etc.)
- [ ] Color-coded feedback
- [ ] Daily word (synced globally)
- [ ] Practice mode (random words)
- [ ] Share results (emoji grid)
- [ ] Streak tracking

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

1. **Fun First** - Games should be enjoyable even without the learning aspect
2. **Mobile-First** - Most users play on phones
3. **Big Touch Targets** - Easy for kids to tap
4. **Encouraging** - "Great job!" not "Wrong!"
5. **One More Try** - Easy restart, addictive gameplay loop
6. **Visual Feedback** - Satisfying animations and effects
7. **Consistent Auth** - Requires sign-in (like quizzes/flashcards)

---

## 📁 File Structure

```
HafaGPT-frontend/src/
├── components/
│   ├── Games.tsx                     # Game hub
│   ├── MemoryMatch.tsx               # Memory Match game
│   ├── WordScramble.tsx              # Word Scramble game
│   ├── FallingWords.tsx              # Falling Words game (NEW)
│   ├── WordCatch.tsx                 # Word Catch game (NEW)
│   ├── ChamorroWordle.tsx            # Chamorro Wordle game (NEW)
│   └── games/
│       ├── MemoryCard.tsx            # Flip card component
│       └── WordleKeyboard.tsx        # Chamorro keyboard (NEW)
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

### Dec 7, 2025 (Session 1)
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

### Dec 7, 2025 (Session 2)
- ✅ Implemented Word Scramble game
  - Tap letters to build answer
  - Hint, skip, reshuffle features
  - Streak bonuses and scoring
  - Beginner Mode & Challenge Mode
- ✅ Implemented Falling Words game
  - Tetris-style gameplay with words falling from top
  - 4 answer buttons, tap correct translation
  - Speed progression (faster every 5 words)
  - 3 lives system, streak bonuses
  - No duplicate words per session
  - Consistent light/dark mode theming
  - Adjusted star rating (10+=3★, 5+=2★)
- 📋 Updated roadmap: Word Catch & Chamorro Wordle next

---

## 🔗 Related Resources

- **Dictionary API:** `/api/vocabulary/category/{id}` - Source for game words
- **Existing Categories:** greetings, family, numbers, colors, food, animals, body, nature, places, time, verbs, phrases
- **Auth Pattern:** Clerk (same as rest of app, requires sign-in)
