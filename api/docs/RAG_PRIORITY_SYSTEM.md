# 📊 HåfaGPT RAG Priority System

## Current Priority Rankings (Higher = More Preferred)

```
┌─────────────────────────────────────────────────────────┐
│  TIER 1: BILINGUAL EDUCATIONAL CONTENT (110-115) 🌟   │
│  ✅ Lengguahi-ta grammar lessons (115)                 │
│     - Bilingual structured language instruction         │
│     - Audio transcriptions by native speakers           │
│     - Modern pedagogical content (2020-2025)            │
│  ✅ Lengguahi-ta stories/legends (110)                 │
│     - Bilingual narratives with translations            │
│     - Cultural context + language notes                 │
│  ✅ Pacific Daily News Chamorro columns (110)          │
│     - Modern, conversational Chamorro                   │
│     - Bilingual with English translations               │
│     - Current usage and expressions                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  TIER 2: LANGUAGE LEARNING RESOURCES (100-105)         │
│  ✅ Lengguahi-ta songs (105)                           │
│     - Bilingual lyrics with translations                │
│     - Colloquial, conversational language               │
│  ✅ Guampedia bilingual language/folktales (105)       │
│     - Chamorro + English content                        │
│     - Language teaching + cultural context              │
│  ✅ Chamoru.info language lessons (100)                │
│  ✅ Guampedia - Language pages (100)                   │
│     - Orthography, vocabulary, lexicon                  │
│  ✅ Lengguahi-ta general educational (100)             │
│     - English-only lessons and content                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  TIER 3: CULTURAL CONTEXT (90-95)                      │
│  ✅ Guampedia - Bilingual cultural (95)                │
│     - Folktales, traditions with Chamorro text          │
│  ✅ Visit Guam (95)                                    │
│  ✅ Guampedia - English-only cultural (90)             │
│     - Folktales, traditions, nobenas                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  TIER 4: MODERN REFERENCE MATERIALS (50-85)            │
│  ✅ Guampedia - Historical content (85)                │
│     - History, biographies, WWII era                    │
│  ✅ Modern dictionaries (50)                           │
│     - Chamoru.info dictionary entries                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  TIER 5: CONTEMPORARY SCHOLARLY WORKS (5-15)           │
│  📚 Sandra Chung grammar (15)                          │
│  📚 Revised Chamorro Dictionary (5)                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  TIER 6: ARCHIVAL/HISTORICAL (-50 to -40)             │
│  📜 Rosetta Project (-40)                              │
│  📜 1865 historical documents (-50)                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🌺 Lengguahi-ta Smart Prioritization

Lengguahi-ta receives **HIGHEST PRIORITY (110-115)** because:
- ✅ Bilingual by design (Chamorro + English)
- ✅ Educational/pedagogical structure
- ✅ Audio-backed transcriptions
- ✅ Modern (2020-2025)
- ✅ Community-created learning resource

### 🎯 Priority Assignments:

| Content Type | Bilingual | English-only |
|-------------|-----------|--------------|
| Grammar Lessons | **115** | 110 |
| Stories/Legends | **110** | 105 |
| Songs | **105** | 100 |
| General Content | **100** | 95 |

---

## 🌺 Guampedia Smart Prioritization with Bilingual Detection

The crawler now **automatically detects Chamorro text** and boosts priority:

### 🎯 Bilingual Language/Folktale Pages (Priority: 105)
```
✅ /chamorro-folktales/ (with Chamorro text)
✅ /chamorro-orthography/ (with Chamorro examples)
✅ /chamorro-vocabulary/ (with Chamorro words)
```
**Detection:** Page URL + contains Chamorro words (høfa adai, si yu'os ma'åse, etc.)  
**Why:** Bilingual content = highest value (close to PDN priority)

---

### 📖 Language-Focused Pages (Priority: 100)
```
✅ /chamorro-orthography/ (English-only)
✅ /chamorro-vs-chamoru/
✅ /chamorro-seafaring-lexicon/
✅ /language/
```
**Why:** Direct language teaching - same priority as language lessons

---

### 🌺 Bilingual Cultural Pages (Priority: 95)
```
✅ /culture/ (with Chamorro text)
✅ /traditional-practices/ (with Chamorro terms)
✅ /nobena/ (with Chamorro prayers)
✅ /value-systems/ (with Chamorro concepts)
```
**Detection:** Cultural URL + contains Chamorro words  
**Why:** Cultural context WITH language examples = extra valuable

---

### 📚 Cultural Context Pages (Priority: 90)
```
✅ /chamorro-folktales/ (English-only)
✅ /chamorro-culture/
✅ /traditional-practices/
✅ /nobena/
✅ /value-systems/
```
**Why:** Essential cultural context for understanding language use

---

### 🏛️ Historical Context Pages (Priority: 85)
```
✅ /ancient-guam/
✅ /spanish-era/
✅ /wwii/
✅ /biography/
```
**Why:** Historical context - valuable but less directly applicable

---

### 🌐 General Guampedia Pages (Priority: 90)
```
✅ Homepage
✅ Categories
✅ Other pages
```
**Why:** Default high priority for authoritative Chamorro content

---

## 🔍 Bilingual Detection System

The crawler checks page content for common Chamorro words:

```python
has_chamorro = any(word in content for word in [
    'chamoru', 'chamorro', 'hafa adai', 'si yu\'os ma\'åse', 
    'guåhan', 'påle\'', 'taotao', 'famalåo\'an', 'familia',
    'inafa\'maolek', 'respetu', 'guma\'', 'che\'lu'
])
```

**If detected:** +5-15 priority boost!  
**You'll see:** `🌺 Detected bilingual content (priority: 105)` in logs

---

## 🎯 Priority Decision Tree

```
Is it Guampedia?
├─ YES
│  ├─ Language/Folktale URL + Has Chamorro text? → 105 ⭐
│  ├─ Language URL? → 100
│  ├─ Cultural URL + Has Chamorro text? → 95
│  ├─ Cultural URL? → 90
│  ├─ Historical URL? → 85
│  └─ Other? → 90
└─ NO
   ├─ PDN column? → 110 (highest!)
   ├─ Language lesson? → 100
   ├─ Dictionary? → 50
   └─ Other? → 85
```

---

## 🎯 Why This Matters for RAG

When a user asks: **"What does 'inafa'maolek' mean?"**

### With Bilingual Detection:
```
1. Guampedia page with Chamorro examples (priority: 105) ✨
2. PDN column using the word (priority: 110) ← Best!
3. English explanation (priority: 90)
4. Dictionary entry (priority: 50)
```

The chatbot sees **actual Chamorro usage** alongside English explanations!

---

## ✅ Benefits

1. **Bilingual content automatically boosted**
   - Folktales with Chamorro → 105 (nearly PDN level!)
   - English-only folktales → 90 (still high)

2. **Language pages prioritized**
   - Orthography, lexicons → 100
   - With Chamorro examples → 105

3. **Cultural context valued**
   - Bilingual cultural → 95
   - English-only cultural → 90

4. **Smart & Automatic**
   - No manual tagging needed
   - Logs show detection in real-time

---

## 📊 Example Output During Crawl

```
[1] Crawling: https://www.guampedia.com/sirena/
    ✅ Success (15234 chars)
    ✂️  Created 12 chunks
    🌺 Detected bilingual content (priority: 105)

[2] Crawling: https://www.guampedia.com/ancient-guam/
    ✅ Success (8765 chars)
    ✂️  Created 8 chunks
    📄 English-only content (priority: 85)
```

---

**Result:** Bilingual Guampedia pages get **near-PDN priority**, while English-only content still ranks high for cultural context! 🌺

