# 📊 HåfaGPT Evaluation Results & Progress Tracking

---

## 📈 Progress Over Time

| Date | Test Suite | Accuracy | Avg Score | Avg Time | Key Changes |
|------|-----------|----------|-----------|----------|-------------|
| Nov 22, 2025 | v1 (60 queries) | **76.7%** | 60.2% | 6.36s | Initial baseline |
| Dec 5, 2025 | v3 (150 queries) | **98.0%** | 85.4% | 8.40s | DeepSeek V3 + RAG improvements |
| Dec 14, 2025 | v3 (150 × 12 runs) | **98.7%** avg | - | ~7s | Skill level personalization verified |
| Dec 14, 2025 | v4 (50 queries) | **100%** | 87.0% | 7.88s | IKNM/KAM, Orthographies PDF, Finder List |
| Dec 14, 2025 | v5 (40 queries) | **97.5%** | 80.8% | 11.71s | Guampedia, PDN, Lengguahi-ta, Blog |
| Dec 14, 2025 | **Comprehensive (240)** | - | - | - | Combined V3+V4+V5 for full coverage |
| Dec 16, 2025 | **Context Tests (6)** | **100%** | - | - | Conversation isolation bug fix |

### 🚀 Total Improvement: +22.0% accuracy from initial baseline!

---

## 🎯 Skill Level Comparison (December 14, 2025)

**Test:** 150 queries × 3 runs per skill level = 1,800 total API calls  
**Duration:** ~3 hours  
**API:** Production (hafagpt-api.onrender.com)

| Skill Level | Run 1 | Run 2 | Run 3 | **Average** | Std Dev |
|-------------|-------|-------|-------|-------------|---------|
| Baseline | 97.3% | 98.0% | 98.0% | **97.8%** | ±0.3% |
| Beginner | 98.0% | 98.0% | 100.0% | **98.7%** | ±0.9% |
| Intermediate | 99.3% | 100.0% | 98.7% | **99.3%** | ±0.5% |
| Advanced | 98.0% | 100.0% | 99.3% | **99.1%** | ±0.8% |

### Key Insights:
- 🏆 **Best:** Intermediate (99.3% avg)
- 📈 **Personalization helps:** All skill levels outperform baseline by 0.9-1.5%
- 🎯 **3 perfect scores:** Beginner Run 3, Intermediate Run 2, Advanced Run 2
- ✅ **Very consistent:** Std dev only ±0.3% to ±0.9%

---

## 🎯 Latest Results (December 5, 2025)

**Test Suite:** v3.0 (150 comprehensive queries)  
**Model:** DeepSeek V3 via OpenRouter  
**Mode:** English  

| Metric | Result |
|--------|--------|
| **Overall Accuracy** | **98.0%** (147/150 passed) |
| **Average Score** | 85.4% |
| **Average Response Time** | 8.40s |

### Category Breakdown

| Category | Accuracy | Status |
|----------|----------|--------|
| Confusables | 100% (5/5) | ✅ Perfect |
| Conversational | 100% (6/6) | ✅ Perfect |
| Cultural | 100% (14/14) | ✅ Perfect |
| Edge Cases | 100% (10/10) | ✅ Perfect |
| Grammar | 100% (18/18) | ✅ Perfect |
| Phrases | 100% (14/14) | ✅ Perfect |
| Pronunciation | 80% (4/5) | ✅ Strong |
| Translation (Cham→Eng) | 100% (25/25) | ✅ Perfect |
| Translation (Eng→Cham) | 96.2% (51/53) | ✅ Excellent |

### Only 3 Failures:
1. **ID 22**: "red" → Expected `agaga'` (apostrophe matching issue)
2. **ID 88**: "å pronunciation" → Expected `ah, vowel, open`
3. **ID 144**: "brother" → Expected `che'lu` (apostrophe matching issue)

---

## 📊 Original Baseline (November 22, 2025)

**Test Suite:** v1 (60 queries)  
**Model:** GPT-4o  
**Mode:** English  

| Metric | Result |
|--------|--------|
| **Overall Accuracy** | **76.7%** (46/60 passed) |
| **Average Score** | 60.2% |
| **Average Response Time** | 6.36s |

---

## 🔧 What We Fixed (Nov-Dec 2025)

### 1. ✅ Switched to DeepSeek V3 (via OpenRouter)
- Better accuracy for Chamorro language tasks
- Lower cost than GPT-4o
- Easy model switching via `CHAT_MODEL` env variable

### 2. ✅ Fixed RAG Retrieval for English→Chamorro
- Added SQL-based keyword search for dictionary lookups
- Improved query type detection ('lookup' vs 'educational')
- Better target word extraction from queries
- Prioritized direct translations over compound phrases

### 3. ✅ Expanded Test Suite (60 → 150 queries)
- Added body parts, emotions, nature vocabulary
- Added conversational scenarios
- Added pronunciation tests
- Better coverage of real-world usage

### 4. ✅ Fixed Test Expectations
- Added apostrophe variants (straight `'` vs curly `'`)
- Added diacritic variants (å, ñ, etc.)
- Verified all expected keywords against dictionary

---

## 📝 Remaining Issues (3 failures)

| ID | Query | Issue | Fix Needed |
|----|-------|-------|------------|
| 22 | "red" in Chamorro | Response uses `agaga'` with curly apostrophe | Add apostrophe variant to test |
| 88 | "å" pronunciation | Response format doesn't match expected | Review expected keywords |
| 144 | "brother" in Chamorro | Apostrophe encoding mismatch | Already has variants, may need more |

---

## 🗂️ Test Files

| File | Queries | Description |
|------|---------|-------------|
| `test_queries_comprehensive.json` | **240** | Full test suite (V3+V4+V5 combined) |
| `test_queries_v3.json` | 150 | Core tests (translations, grammar, cultural) |
| `test_queries_v4.json` | 50 | New resources (IKNM, Orthographies, Finder List) |
| `test_queries_v5.json` | 40 | Source coverage (Guampedia, PDN, Lengguahi-ta, Blog) |
| `eval_results_*.json` | - | Full results with actual responses |
| `eval_report_*.txt` | - | Human-readable summary |

### 📚 RAG Sources Tested

| Source | Chunks | Tested In |
|--------|--------|-----------|
| Dictionaries (Topping, Revised, Chamoru.info) | 29,089 | V3 (indirect) |
| Chamorro Grammar (Chung) | 1,492 | V3 |
| IKNM/KAM Dictionary (2025) | 35 | V4 |
| Two Orthographies PDF | 10 | V4 |
| English-Chamorro Finder List PDF | 173 | V4 |
| Guampedia | 11,144 | V3/V5 |
| Pacific Daily News | 188 | V5 |
| Lengguahi-ta | 248 | V5 |
| Fino'Chamoru Blog | 454 | V5 |

---

## 🚀 Running Tests

### Quick Single Run

```bash
# Against local server
cd api && source .venv/bin/activate
uvicorn api.main:app --host 0.0.0.0 --port 8000  # Terminal 1

# Run comprehensive tests (240 queries, ~30-40 min)
python -m evaluation.test_evaluation --test-file test_queries_comprehensive.json

# Or run individual test suites
python -m evaluation.test_evaluation --test-file test_queries_v3.json  # Core (150)
python -m evaluation.test_evaluation --test-file test_queries_v4.json  # New resources (50)
python -m evaluation.test_evaluation --test-file test_queries_v5.json  # Source coverage (40)

# With specific skill level
python -m evaluation.test_evaluation --test-file test_queries_v3.json --skill-level beginner
```

### Against Production (~15-20 min)

```bash
python -m evaluation.test_evaluation \
  --test-file test_queries_v3.json \
  --api-url https://hafagpt-api.onrender.com
```

### Full Comparison Suite (~3 hours)

Runs all 4 skill levels × 3 runs each = 12 test runs (1,800 API calls):

```bash
cd api && source .venv/bin/activate
PYTHONUNBUFFERED=1 nohup python -m evaluation.run_comparison > evaluation/tmp/comparison_output.txt 2>&1 &

# Monitor progress
tail -f evaluation/tmp/comparison_output.txt

# Or check quick status
grep -E "^✅.*Run.*:" evaluation/tmp/comparison_output.txt
```

Results saved to `evaluation/tmp/YYYY-MM-DD/comparison/`:
- `comparison_report.md` - Summary with averages
- `all_results.json` - Raw data
- `*_run*.txt` - Individual run logs

### Test Output Location

All test outputs go to `evaluation/tmp/` organized by date (gitignored):

```
evaluation/tmp/
└── 2025-12-14/
    ├── comparison/          ← Multi-run comparison results
    │   ├── comparison_report.md
    │   ├── all_results.json
    │   └── *_run*.txt
    └── single-runs/         ← Individual test runs (auto-generated)
        ├── eval_results_*.json
        └── eval_report_*.txt
```

**Tracked in git:**
- `test_queries_comprehensive.json` - Full test suite (240 queries)
- `test_queries_v3.json` - Core test suite (150 queries)
- `test_queries_v4.json` - New resources (50 queries)
- `test_queries_v5.json` - Source coverage (40 queries)
- `test_evaluation.py` - Single-run test script
- `run_comparison.py` - Multi-run comparison script
- `BASELINE_METRICS.md` - Progress tracking (this file)

---

---

## 🔄 Conversation Context Tests (December 16, 2025)

**Test Suite:** `test_conversation_context.py` (6 tests)  
**Result:** **100% pass rate (6/6)**

| Test | Description | Result |
|------|-------------|--------|
| Context Retention (5 msg) | Remembers topic after 5 messages | ✅ Pass |
| Context Retention (10 msg) | Remembers topic after 10 messages | ✅ Pass |
| Reference Resolution | "That word you mentioned" works | ✅ Pass |
| No Hallucination | Doesn't claim undiscussed topics | ✅ Pass |
| Cross-Conversation Isolation | No context bleed between convos | ✅ Pass |
| Multi-Turn Coherence | Logical conversation flow | ✅ Pass |

### Bug Fixed
**Issue:** Conversations were mixing context - the bot would reference topics from OTHER conversations.
**Root Cause:** Chat history was retrieved by `session_id` (browser session) instead of `conversation_id`.
**Fix:** Changed `get_conversation_history()` to use `conversation_id` for proper isolation.

### Running Context Tests
```bash
cd api && source .venv/bin/activate

# Run all tests
python -m evaluation.test_conversation_context

# Run specific test
python -m evaluation.test_conversation_context --test cross_conversation_isolation
```

---

## 🆕 V4 Results: New Resources (December 14, 2025)

**Test Suite:** v4.0 (50 queries targeting IKNM/KAM, Two Orthographies, Finder List)

| Category | Accuracy |
|----------|----------|
| Orthography (Two Orthographies PDF) | 100% (12/12) |
| Finder List Vocabulary | 100% (18/18) |
| IKNM Grammar | 100% (10/10) |
| Less Common Words | 100% (10/10) |
| **Overall** | **100% (50/50)** |

---

## 🆕 V5 Results: Source Coverage (December 14, 2025)

**Test Suite:** v5.0 (40 queries testing previously untested sources)

| Category | Accuracy |
|----------|----------|
| Guampedia Cultural | 100% (12/12) |
| Lengguahi-ta Grammar | 100% (10/10) |
| PDN Bilingual | 100% (8/8) |
| Fino'Chamoru Blog Vocabulary | 90% (9/10) |
| **Overall** | **97.5% (39/40)** |

---

**Bottom Line:** We went from 76.7% → 98.0%+ accuracy through model switching (DeepSeek V3) and RAG improvements. Added 45,000+ knowledge chunks from 9+ sources including IKNM/KAM Dictionary, orthography guides, and native speaker content. The chatbot now handles translations, grammar, cultural questions, orthography differences, and conversational scenarios with excellent accuracy across all major sources. 🎯

