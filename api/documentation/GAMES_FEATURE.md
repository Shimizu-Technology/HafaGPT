# 🎮 Chamorro Learning Games

> **Goal:** Fun, engaging games to learn Chamorro for kids, teens, and adults.

## 📊 Status Overview

| Phase | Status | Games |
|-------|--------|-------|
| Phase 1 | 🚧 In Progress | Memory Match |
| Phase 2 | 📋 Planned | Word Scramble, Speed Round |
| Phase 3 | 📋 Future | Daily Challenges, Leaderboards, More Games |

---

## 🎯 Phase 1: Memory Match (MVP)

**Status:** 🚧 In Progress  
**Estimated Effort:** 3-5 days  
**Target:** Kids-friendly, all ages can enjoy

### Game Description
- Grid of face-down cards
- Flip 2 cards to find matching pairs (Chamorro ↔ English)
- Win by matching all pairs

### Features Checklist

**Core Game:**
- [ ] Game hub page (`/games`)
- [ ] Memory Match page (`/games/memory`)
- [ ] Card grid layout (responsive)
- [ ] Card flip animation
- [ ] Match detection logic
- [ ] Win condition & celebration

**Category Selection:**
- [ ] Category picker (Family, Food, Colors, Numbers, Animals, etc.)
- [ ] Pull words from existing dictionary API
- [ ] Random word selection per game

**Difficulty Levels:**
- [ ] Easy: 4 pairs (8 cards) - 2x4 grid
- [ ] Medium: 6 pairs (12 cards) - 3x4 grid
- [ ] Hard: 8 pairs (16 cards) - 4x4 grid

**Scoring:**
- [ ] Move counter
- [ ] Timer (optional display)
- [ ] Score calculation (fewer moves = better)
- [ ] "Play Again" button

**Polish:**
- [ ] Mobile-responsive (works on phones)
- [ ] Touch-friendly (big cards)
- [ ] Visual feedback (correct match = green, wrong = red shake)
- [ ] Encouraging messages ("Great job!", "Keep going!")

**Auth (Match App Pattern):**
- [ ] Works without sign-in (anonymous play)
- [ ] High scores saved to localStorage (MVP)
- [ ] Future: Save to database when signed in

### Technical Notes

**No Backend Changes Needed!**
- Uses existing `/api/vocabulary/category/{id}` endpoint
- Words already have: `chamorro`, `english`, `category`

**Frontend Routes:**
```
/games              → Game hub (list all games)
/games/memory       → Memory Match game
```

**Key Components:**
```
src/pages/Games.tsx           # Game hub
src/pages/MemoryMatch.tsx     # Memory game page
src/components/games/
  MemoryCard.tsx              # Flip card component
  CategorySelect.tsx          # Category dropdown
  DifficultySelect.tsx        # Easy/Medium/Hard
  GameScore.tsx               # Score display
```

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
- [ ] High score tracking per game
- [ ] Share score feature

---

## 🚀 Phase 3: Engagement & Social

**Status:** 📋 Future  
**Target:** After games are popular

### Features
- [ ] Daily Challenge (one game per day)
- [ ] Leaderboards (global/friends)
- [ ] Achievements & Badges
- [ ] Learning streaks
- [ ] Database score persistence (requires auth)

---

## 🎨 Design Principles

1. **Mobile-First** - Most users play on phones
2. **Big Touch Targets** - Easy for kids to tap
3. **Encouraging** - "Great job!" not "Wrong!"
4. **No Friction** - Play immediately, no sign-up required
5. **Chamorro Immersion** - Include Chamorro UI text where appropriate

---

## 📁 File Structure (Planned)

```
HafaGPT-frontend/src/
├── pages/
│   ├── Games.tsx                 # Game hub
│   ├── MemoryMatch.tsx           # Memory game
│   ├── WordScramble.tsx          # Scramble game (Phase 2)
│   └── SpeedRound.tsx            # Speed game (Phase 2)
├── components/games/
│   ├── MemoryCard.tsx            # Flip card
│   ├── CategorySelect.tsx        # Category picker
│   ├── DifficultySelect.tsx      # Difficulty picker
│   ├── GameScore.tsx             # Score display
│   ├── GameTimer.tsx             # Timer component
│   └── GameComplete.tsx          # Win/complete modal
├── hooks/
│   └── useGameScore.ts           # Score management hook
└── data/
    └── gameCategories.ts         # Category definitions
```

---

## 📝 Development Log

### Dec 6, 2025
- Created GAMES_FEATURE.md planning document
- Defined Phase 1 scope (Memory Match)
- Identified existing APIs to use (no backend changes needed)

---

## 🔗 Related Resources

- **Dictionary API:** `/api/vocabulary/category/{id}` - Source for game words
- **Existing Categories:** greetings, family, numbers, colors, food, animals, body, nature, places, time, verbs, phrases
- **Auth Pattern:** Clerk (same as rest of app)

