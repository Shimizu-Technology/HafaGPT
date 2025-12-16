# 🧪 How HåfaGPT's Evaluation System Works

> A guide to running tests, understanding accuracy metrics, and tracking quality over time.

---

## 📖 What is the Evaluation System?

The evaluation system tests HåfaGPT's chatbot against a suite of predefined questions with expected answers. It helps us:

1. **Measure accuracy** - What % of questions does the chatbot answer correctly?
2. **Catch regressions** - Did a code change break something?
3. **Verify RAG sources** - Are new knowledge sources being used correctly?
4. **Track progress** - How has quality improved over time?

---

## 📁 Test Files

| File | Queries | Purpose |
|------|---------|---------|
| `test_queries_comprehensive.json` | **240** | Full test suite (V3+V4+V5 combined) |
| `test_queries_v3.json` | 150 | Core tests (translations, grammar, cultural) |
| `test_queries_v4.json` | 50 | New resources (IKNM/KAM, Orthographies, Finder List) |
| `test_queries_v5.json` | 40 | Source coverage (Guampedia, PDN, Lengguahi-ta, Blog) |

### Test Query Structure

```json
{
  "id": 1,
  "query": "How do I say hello in Chamorro?",
  "expected_keywords": ["Håfa Adai", "Hafa Adai"],
  "category": "translation_eng_to_cham",
  "difficulty": "easy",
  "notes": "Most basic greeting"
}
```

**Pass condition:** At least 50% of expected keywords found in the response.

---

## 🔄 How Testing Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: LOAD TEST QUERIES                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   test_evaluation.py loads test_queries_v3.json                         │
│   → 150 queries with expected keywords                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: CALL CHATBOT API                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   For each query:                                                       │
│   POST /api/chat                                                        │
│   Body: { "message": "How do I say hello?", "mode": "english" }        │
│                                                                         │
│   Response: { "response": "Hello in Chamorro is **Håfa Adai**..." }    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: KEYWORD MATCHING                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Expected: ["Håfa Adai", "Hafa Adai"]                                 │
│   Response: "Hello in Chamorro is **Håfa Adai**, which means..."       │
│                                                                         │
│   Check (case-insensitive):                                             │
│   ✅ "håfa adai" found in response                                     │
│   → Match: 1/2 = 50% → PASS                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: AGGREGATE RESULTS                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Overall Accuracy: 147/150 = 98.0%                                     │
│   Average Score: 85.4%                                                  │
│   Average Response Time: 8.4s                                           │
│                                                                         │
│   Category Breakdown:                                                   │
│   - Translation (Eng→Cham): 96.2%                                      │
│   - Grammar: 100%                                                       │
│   - Cultural: 100%                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Running Tests

### Prerequisites

1. **Local server running:**
   ```bash
   cd HafaGPT-API
   uv run uvicorn api.main:app --reload --port 8000
   ```

2. **Environment configured** (`.env` with API keys)

### Quick Single Run (~15-30 min)

```bash
cd HafaGPT-API
source .venv/bin/activate

# Full comprehensive test (240 queries)
python -m evaluation.test_evaluation --test-file test_queries_comprehensive.json

# Individual test suites
python -m evaluation.test_evaluation --test-file test_queries_v3.json  # Core (150)
python -m evaluation.test_evaluation --test-file test_queries_v4.json  # New resources (50)
python -m evaluation.test_evaluation --test-file test_queries_v5.json  # Source coverage (40)

# With specific skill level
python -m evaluation.test_evaluation --test-file test_queries_v3.json --skill-level beginner
```

### Against Production

```bash
python -m evaluation.test_evaluation \
  --test-file test_queries_v3.json \
  --api-url https://hafagpt-api.onrender.com
```

### Background Execution (Recommended for Long Tests)

```bash
cd HafaGPT-API && source .venv/bin/activate
PYTHONUNBUFFERED=1 python -m evaluation.test_evaluation \
  --test-file test_queries_comprehensive.json > evaluation/test_output.txt 2>&1 &

# Monitor progress
tail -f evaluation/test_output.txt
```

---

## 📊 Test Categories

### V3 - Core Tests (150 queries)

| Category | Count | Tests |
|----------|-------|-------|
| `translation_eng_to_cham` | 40 | "How do I say X in Chamorro?" |
| `translation_cham_to_eng` | 28 | "What does X mean?" |
| `grammar` | 18 | Verb conjugation, possessives, pronouns |
| `cultural` | 15 | Traditions, history, food |
| `phrases` | 20 | Common expressions |
| `pronunciation` | 7 | Glottal stops, å sound |
| `confusables` | 7 | Similar words with different meanings |
| `conversational` | 7 | Real-world scenarios |
| `edge_cases` | 8 | Typos, made-up words, off-topic |

### V4 - New Resources (50 queries)

| Category | Count | Target Source |
|----------|-------|---------------|
| `orthography` | 12 | Two Orthographies PDF |
| `finder_list_vocabulary` | 18 | English-Chamorro Finder List |
| `iknm_grammar` | 10 | IKNM/KAM Dictionary (2025) |
| `less_common_words` | 10 | Rare vocabulary |

### V5 - Source Coverage (40 queries)

| Category | Count | Target Source |
|----------|-------|---------------|
| `guampedia_cultural` | 12 | Guampedia articles |
| `lengguahita_grammar` | 10 | Lengguahi-ta lessons |
| `pdn_bilingual` | 8 | Pacific Daily News columns |
| `fino_blog_vocabulary` | 10 | Fino'Chamoru Blog |

---

## 📈 Understanding Results

### Output Files

Tests generate two files in `evaluation/tmp/YYYY-MM-DD/`:

1. **`eval_results_*.json`** - Full data including actual responses
2. **`eval_report_*.txt`** - Human-readable summary

### Sample Report

```
================================================================================
📊 EVALUATION SUMMARY
================================================================================

Overall Accuracy: 98.0% (147/150)
Average Score: 85.4%
Average Response Time: 8.40s

Category Breakdown:
  ✅ Confusables: 100.0% (5/5)
  ✅ Conversational: 100.0% (6/6)
  ✅ Cultural: 100.0% (14/14)
  ✅ Grammar: 100.0% (18/18)
  ⚠️ Translation (Eng→Cham): 96.2% (51/53)

Failed Queries:
  ID 22: "red" → Expected: agaga' (apostrophe variant issue)
  ID 88: "å pronunciation" → Expected: ah, vowel
  ID 144: "brother" → Expected: che'lu (encoding issue)

================================================================================
```

### Interpreting Scores

| Score | Meaning |
|-------|---------|
| **100%** | All expected keywords found |
| **80%** | 4 of 5 keywords found (good) |
| **50%** | Half found (minimum to pass) |
| **0%** | No keywords found (fail) |

---

## 🔧 Adding New Tests

### When to Add Tests

- After adding a new RAG source
- After fixing a bug
- After adding new features (e.g., cultural content)

### How to Add

1. **Edit the appropriate test file** (or create new V6):

```json
{
  "id": 151,
  "query": "What is the Chamorro word for 'ocean'?",
  "expected_keywords": ["tasi"],
  "category": "translation_eng_to_cham",
  "difficulty": "easy",
  "notes": "Basic vocabulary - should cite dictionary"
}
```

2. **Run the test** to verify it passes:

```bash
python -m evaluation.test_evaluation --test-file test_queries_v4.json --limit 5
```

3. **Update `test_queries_comprehensive.json`** if needed (or regenerate it).

---

## 📊 Tracking Progress

### BASELINE_METRICS.md

Historical accuracy is tracked in `evaluation/BASELINE_METRICS.md`:

| Date | Test Suite | Accuracy | Changes |
|------|-----------|----------|---------|
| Nov 22, 2025 | v1 (60) | 76.7% | Initial baseline |
| Dec 5, 2025 | v3 (150) | 98.0% | DeepSeek V3 + RAG improvements |
| Dec 14, 2025 | v4 (50) | 100% | IKNM/KAM, Orthographies, Finder List |
| Dec 14, 2025 | v5 (40) | 97.5% | Guampedia, PDN, Lengguahi-ta |

### When to Update

- After significant code changes
- After adding new RAG sources
- When accuracy changes by >1%

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `evaluation/test_evaluation.py` | Main test runner script |
| `evaluation/run_comparison.py` | Multi-run comparison (skill levels) |
| `evaluation/BASELINE_METRICS.md` | Historical accuracy tracking |
| `evaluation/test_queries_*.json` | Test query definitions |

---

## 💡 Tips

1. **Run in background** for long tests to avoid timeouts
2. **Use `--limit N`** for quick sanity checks
3. **Check actual responses** in `eval_results_*.json` when tests fail
4. **Update BASELINE_METRICS.md** after significant changes
5. **Add tests for new sources** to ensure they're being used

---

**Questions?** Check `evaluation/test_evaluation.py` for implementation details! 🌺
