# 🔍 LearningChamoru.com Analysis

> **Purpose:** Document findings from exploring LearningChamoru.com to inform HåfaGPT development.
> **Last Updated:** December 2025
> **Status:** Phase 1 & 2 Complete (Research + Feature Analysis)

---

## 📖 About LearningChamoru.com

- **URL:** https://learningchamoru.com
- **Founded by:** Dr. Gerhard Schwab
- **Partners:** University of Guam, CHamoru Language Commission
- **Users:** 36,682+ registered learners
- **Cost:** Free (donation-supported)
- **Platform:** Web-based, mobile app (WebView wrapper)

---

## 🏗️ Their Core Features

| Feature | Details |
|---------|---------|
| **Lessons** | 25+ lessons based on Topping's "Spoken Chamorro" textbook |
| **Dictionary** | Search-based, clickable words in lessons |
| **Grammar** | Dedicated grammar section with topical lessons |
| **Dialogues** | Themed conversation practice with scenarios |
| **Media** | Audio/video content library |
| **Skill Tests** | Per-lesson assessments |
| **Word of the Day** | Daily vocabulary with archives |
| **Audio Practice** | Record yourself and compare |
| **Community** | "Visible Learners" social feature |

---

## 📚 Lesson Structure Deep Dive

### How Their Lessons Work

Each lesson contains:
1. **Title + Conversational Hook** — e.g., "Greetings and Simple Response: How are you?"
2. **Scenario** — "At Home", "At School", etc.
3. **Dialogue with Characters** — Si Maria, Si Jane, etc.
4. **Clickable Words** — Every word links to dictionary definition
5. **Audio Buttons** — Native speaker recordings per line
6. **Grammar Notes** — Inline explanations
7. **Skill Test** — Assessment at end of lesson

### Example from Lesson 1 (Greetings):

```
Scenario: "At Home"

Si Maria: "Buena diha." 
  → Audio: [Play] 
  → Note: "Formal greeting. Spanish origin."

Si Jane: "Buena diha."
  → Audio: [Play]

Si Maria: "Håfa tatátmanu hao?"
  → Audio: [Play]
  → Note: "Learn as idiomatic expression. Do not attempt grammatical analysis."

Si Jane: "Todu maolek, ya hågu?"
  → Audio: [Play]
```

### Their 25 Lesson Titles (From Browser Exploration):

1. **Lesson 1:** Greetings and Simple Response - How are you?
2. **Lesson 2:** Simple Who-Questions in Singular Form - What Is Your Name?
3. **Lesson 3:** Simple Questions and Answers in Singular Form - Are You CHamoru?
4. **Lesson 4:** Yu'-type Pronouns in Dual Form - How Are You Two?
5. **Lesson 5:** Intransitive Sentences and Reduplication - Where Are You Two Living?
6. **Lesson 6:** Plural Forms with Yu'-type Pronoun - Mampos Embelikeru Hao! (You are Nosey!)
7. **Lesson 7:** Plural, Dual, and Singular - Lekion Siette
8. **Lesson 8:** Singular, Dual and Plural; Guaha and Tåya' - Lekion Ocho
9-25. (Additional lessons covering advanced grammar)

---

## 🆚 Feature Comparison: LearningChamoru vs. HåfaGPT

| Feature | LearningChamoru | HåfaGPT | Winner |
|---------|-----------------|---------|--------|
| **AI Chat** | ❌ None | ✅ RAG-powered, 45k+ chunks | 🏆 **HåfaGPT** |
| **Native Audio** | ✅ Human recordings | ❌ TTS only | 🏆 **LearningChamoru** |
| **Structured Lessons** | ✅ 25 lessons | ❌ None | 🏆 **LearningChamoru** |
| **Learning Games** | ❌ None | ✅ 7 games | 🏆 **HåfaGPT** |
| **Interactive Quizzes** | ✅ Skill tests | ✅ Multiple types + TTS | Tie |
| **Flashcards** | ❌ None | ✅ Category-based | 🏆 **HåfaGPT** |
| **Stories** | ❌ None | ✅ 24 stories + tap-to-translate | 🏆 **HåfaGPT** |
| **Modern UI/Mobile** | ❌ Desktop-focused, dated design | ✅ Mobile-first, modern | 🏆 **HåfaGPT** |
| **Community/Social** | ✅ Visible learners, profiles | ❌ None | 🏆 **LearningChamoru** |
| **Dictionary** | ✅ Integrated | ✅ 13,800+ words | Tie |
| **Word of the Day** | ✅ With archives | ✅ With examples | Tie |
| **Record Yourself** | ✅ Audio practice | ❌ None | 🏆 **LearningChamoru** |
| **Conversation Practice** | ✅ Dialogues | ✅ AI-powered scenarios | 🏆 **HåfaGPT** |
| **Progress Tracking** | ✅ Skill levels 0-10 | ✅ Streaks, dashboard | Tie |

---

## 💡 Key Insights

### What We Should Learn From Them

1. **Structured Progression**
   - Their 25-lesson path gives users a clear journey
   - Each lesson builds on the previous
   - Review lessons every few chapters

2. **Dialogue-Based Learning**
   - Characters (Si Maria, Si Jane) make it relatable
   - Scenarios (At Home, At School) provide context
   - This is more engaging than isolated vocabulary

3. **Clickable Words**
   - Every word in their content links to dictionary
   - We could add this to our stories and chat responses

4. **Audio Practice (Record Yourself)**
   - Users can record their pronunciation
   - Compare with native speaker recording
   - Great for speaking practice

5. **Community Feel**
   - "36,682 Visible Learners" creates social proof
   - Seeing others learning is motivating
   - We could add a leaderboard or similar

### What We're Already Better At

1. **AI Chat** — They don't have anything like this. Our RAG-powered chat is a major differentiator.

2. **Learning Games** — 7 interactive games vs. their 0. This is huge for engagement.

3. **Modern UX** — Their site looks like 2012. We're mobile-first with modern design.

4. **Accessibility** — We just added TTS to quizzes. They rely on pre-recorded audio only.

5. **Stories with Tap-to-Translate** — Unique feature they don't have.

---

## 🎯 Features to Consider Building

Based on this analysis, here are features we could add:

### High Priority (Would Close Gaps)

| Feature | What It Does | Effort |
|---------|--------------|--------|
| **Learning Paths** | Guided progression like their 25 lessons | 20-30 hrs |
| **Clickable Words** | Link words in stories/chat to dictionary | 4-6 hrs |
| **Record Yourself** | Audio practice with playback | 8-12 hrs |

### Medium Priority (Nice to Have)

| Feature | What It Does | Effort |
|---------|--------------|--------|
| **Visible Learners** | Show community stats, leaderboard | 6-8 hrs |
| **Granular Skill Levels** | 0-10 levels instead of 3 | 4-6 hrs |
| **Dialogue Mode** | Character-based scenarios in chat | 6-8 hrs |

### Already Ahead (Double Down)

| Feature | What It Does | 
|---------|--------------|
| **AI Chat** | Keep improving accuracy, add more features |
| **Games** | Add more games, especially pre-reader games |
| **Stories** | Add more stories, improve tap-to-translate |
| **Mobile UX** | Keep it modern and fast |

---

## 📊 Their Navigation Structure

From browser exploration, their main sections are:

```
Dashboard
├── Word of the Day (with Archives)
├── Learning Center
│   ├── Dictionary
│   ├── Lessons (25 lessons)
│   ├── Grammar
│   ├── Dialogues
│   └── Media
├── Tests
│   ├── Review Test Log
│   └── Skill Test Log
├── Commission on CHamoru Language
├── News
├── Support Learning CHamoru
└── Recommend
```

---

## 🤝 Partnership Opportunity

### Why Collaboration Makes Sense

| They Have | We Have |
|-----------|---------|
| Native speaker audio | AI chat technology |
| Established community (36k users) | Modern mobile-first platform |
| University backing | Innovative games and features |
| Structured curriculum | Flexible learning options |

### Potential Partnership Ideas

1. **Audio Integration** — Use their audio for our flashcards/vocabulary
2. **Cross-Promotion** — Link to each other's platforms
3. **AI Complement** — Position HåfaGPT as AI companion to their lessons
4. **Shared Resources** — Collaborate on dictionary/content

### Contact

- **Lead:** Dr. Gerhard Schwab
- **Email:** gerhard@learningchamoru.com

---

## 📁 Related Documentation

- [LEARNING_PATH_RESEARCH.md](./LEARNING_PATH_RESEARCH.md) — Topping's textbook structure
- [IMPROVEMENT_GUIDE.md](./IMPROVEMENT_GUIDE.md) — Development roadmap
- [CHAMORRO_RESOURCES_RESEARCH.md](./CHAMORRO_RESOURCES_RESEARCH.md) — Other resources

---

---

## 🆕 New Resources Discovered (December 2025)

### Resources Downloaded ✅

| Resource | Size | Location | Status |
|----------|------|----------|--------|
| **Two Chamorro Orthographies** (Sandra Chung) | 1.0 MB | `knowledge_base/pdfs/two_chamorro_orthographies_sandra_chung.pdf` | ✅ Downloaded |
| **English-Chamorro Finder List 2024** | 1.2 MB | `knowledge_base/pdfs/english_chamorro_finder_list_2024.pdf` | ✅ Downloaded |
| **IKNM/KAM Dictionary Crawler** | - | `crawlers/iknm_kam_dictionary.py` | ✅ Created |

### PDF Details

**Two Chamorro Orthographies (Sandra Chung, March 2019)**
- Explains differences between Guam and CNMI spelling systems
- 40 pages of orthography analysis
- Very useful for understanding spelling variations in our data

**English-Chamorro Finder List (December 2024)**
- 142 pages of English → Chamorro lookups
- Compiled by Sandra Chung
- Companion to the Revised Chamorro-English Dictionary

### IKNM/KAM Dictionary Crawler

Created `crawlers/iknm_kam_dictionary.py` to crawl the revised dictionary:

```bash
# Test mode - preview a specific letter
uv run python crawlers/iknm_kam_dictionary.py --letter M --test

# Crawl all dictionary letters
uv run python crawlers/iknm_kam_dictionary.py --all
```

**Features:**
- Crawls all 23 letter pages (A-Y including Ch, Ng, Ñ, glottal stop)
- Parses dictionary entries with definitions and examples
- High priority (105) since it's authoritative source
- Polite 1-second delay between requests

---

## 📖 Phase 3: Dictionary Comparison

### Their Dictionary Sources

From browser exploration, their "Publish Source" dropdown includes:

| Source | Year | Status in HåfaGPT |
|--------|------|-------------------|
| CHamoru-English Dictionary (Topping, Ogo, Dungca) | 1975 | ✅ We have this |
| CHamoru Reference Grammar (Topping, Dungca) | 1973 | ✅ We have this |
| Spoken CHamoru (Topping, Ogo) | 1969 | ⚠️ Textbook, not in RAG |
| The Official CHamoru-English Dictionary (Guam Gov) | 2009 | ❓ Check if we have |
| **CNMI Revised Chamorro-English Dictionary** | **2025** | ✅ **ADDED Dec 2024** (35 chunks via IKNM/KAM) |
| Die CHamoru Sprache (Costenoble) | 1940 | ❓ Historical German text |
| Fr. Eric Forbes OFM Cap. | - | ❓ Blog content |
| Michael Lujan Bevacqua PhD | - | ⚠️ Referenced in some RAG |
| Rosa Salas Palomo | - | ❓ Native speaker contributor |

### Key Discovery: CNMI 2025 Dictionary ✅ COMPLETED

They have access to the **CNMI Revised Chamorro-English Dictionary (2025)** — this is brand new!

**✅ RESOLUTION (December 2024):**
- Found at [natibunmarianas.org/chamorro-dictionary](https://natibunmarianas.org/chamorro-dictionary/)
- Created custom crawler: `crawlers/iknm_kam_dictionary.py`
- Added 35 chunks with priority 105 (high authority)
- Also added companion PDFs:
  - **Two Chamorro Orthographies** (Dr. Sandra Chung) — 10 chunks
  - **English-Chamorro Finder List 2024** — 173 chunks

### Their Dictionary Features

- **100+ lessons** linked to dictionary entries (more than the 25 core Topping lessons)
- **Word Type filtering** — Adjective, Adverb, Noun, Verb, Pronoun, etc.
- **Origin filtering** — Chamorro, Spanish, English, Japanese, etc.
- **Audio filtering** — "Show words with Audio only" checkbox
- **Pagination** — Multiple pages of results
- **Clickable entries** — Each word links to full definition

### Our Dictionary Comparison

| Metric | LearningChamoru | HåfaGPT |
|--------|-----------------|---------|
| Total entries | Unknown (paginated) | 13,800+ |
| Sources | 10+ | 3 main dictionaries |
| Audio | Native recordings | TTS |
| Word type tags | ✅ | ✅ |
| Etymology/Origin | ✅ | Partial |
| Example sentences | ✅ | ✅ |
| Linked to lessons | ✅ | ❌ (standalone) |

### Recommendations

1. ~~**Investigate CNMI 2025 Dictionary**~~ — ✅ Done! Added via IKNM/KAM crawler
2. **Check for 2009 Official Dictionary** — May be from Guam DOE
3. **Add Origin/Etymology to UI** — We have this data, could display it
4. **Link Dictionary to Content** — Like they do with lessons

---

## ✅ Completed Actions (December 2024)

| Action | Status | Details |
|--------|--------|---------|
| Add CNMI 2025 Dictionary | ✅ Complete | 35 chunks via crawler |
| Add Two Orthographies PDF | ✅ Complete | 10 chunks, Guam vs CNMI spelling |
| Add Finder List PDF | ✅ Complete | 173 chunks, English→Chamorro |
| Create IKNM crawler | ✅ Complete | `crawlers/iknm_kam_dictionary.py` |
| Update About page credits | ✅ Complete | Added IKNM/KAM link |
| Create SOURCES.md | ✅ Complete | Full source documentation |

---

**This analysis informs our product strategy. We're not competitors — we're complements.**
