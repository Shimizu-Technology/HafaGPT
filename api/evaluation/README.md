# 🧪 HafaGPT Evaluation Suite

Automated testing framework to measure and track HafaGPT's performance over time.

## Files

- `test_queries.json` - 60 comprehensive test queries across 5 categories
- `test_evaluation.py` - Automated evaluation script
- `eval_results_*.json` - Full evaluation results (generated)
- `eval_report_*.txt` - Human-readable reports (generated)

## Quick Start

### 1. Start your backend server

```bash
cd /Users/leonshimizu/Desktop/ShimizuTechnology/HafaGPT/HafaGPT-API
python -m uvicorn api.main:app --reload
```

### 2. Run evaluation

```bash
# Full evaluation (all 60 queries)
python evaluation/test_evaluation.py

# Quick test (first 10 queries)
python evaluation/test_evaluation.py --limit 10

# Test specific mode
python evaluation/test_evaluation.py --mode chamorro

# Use production API
python evaluation/test_evaluation.py --api-url https://your-api.onrender.com
```

## Output

The script generates two files:

1. **`eval_results_TIMESTAMP.json`** - Full machine-readable results
   - All query/response pairs
   - Keyword matching details
   - Response times
   - Category statistics

2. **`eval_report_TIMESTAMP.txt`** - Human-readable summary
   - Overall accuracy percentage
   - Category breakdown
   - List of failed queries
   - Performance metrics

## Example Output

```
📊 EVALUATION SUMMARY
================================================================================

Overall Accuracy: 72.5% (43/60)
Average Score: 68.3%
Average Response Time: 2.31s

Category Breakdown:
  Translation: 85.0% (21/25)
  Grammar: 45.5% (5/12)  ⚠️ PRIORITY
  Cultural: 80.0% (8/10)
  Phrases: 78.6% (7/8)
  Edge cases: 40.0% (2/5)

⚠️  17 queries failed. See report for details.
```

## Test Categories

| Category | Count | Description |
|----------|-------|-------------|
| **Translation** | 25 | Word/phrase translations (EN↔CH) |
| **Grammar** | 12 | Conjugation, plurals, pronouns |
| **Cultural** | 10 | History, traditions, cultural knowledge |
| **Phrases** | 8 | Common phrases and expressions |
| **Edge Cases** | 5 | Modern words, complex sentences |

## Key Test Cases

- **Test #2** - "What is 'listen' in Chamorro?" (The failure case from research)
- **Test #31** - "What's the difference between 'hungok' and 'ekungok'?" (Nuance)
- **Test #27** - "What is the plural of 'guma''?" (Grammar rules)

## Scoring System

- **100%** - All expected keywords found
- **80%** - At least one keyword found
- **50%** - Partial match
- **0%** - No match

## Command Line Options

```
--mode      Chat mode (english/chamorro/learn). Default: english
--limit     Number of queries to test. Default: all 60
--api-url   API endpoint. Default: http://localhost:8000
--output    Output directory. Default: ./evaluation
```

## Workflow

### After Making Changes

1. Make your improvement (add data, fix retrieval, etc.)
2. Run evaluation: `python evaluation/test_evaluation.py`
3. Compare new results to baseline
4. Document improvements in `BASELINE_METRICS.md`

### Establishing Baseline (First Run)

```bash
# Run full evaluation
python evaluation/test_evaluation.py

# Review results
cat evaluation/eval_report_*.txt

# Document baseline in BASELINE_METRICS.md
# Set improvement goals
```

### Tracking Progress

```bash
# Week 1 - Baseline
python evaluation/test_evaluation.py
# Result: 72% accuracy

# Week 3 - After adding examples
python evaluation/test_evaluation.py
# Result: 78% accuracy (+6%)

# Week 5 - After hybrid search
python evaluation/test_evaluation.py
# Result: 85% accuracy (+7%)
```

## Next Steps (Phase 1)

- ✅ Test suite created (60 queries)
- ✅ Evaluation script created
- ⏳ Run baseline evaluation
- ⏳ Add user feedback mechanism (thumbs up/down)
- ⏳ Set up PostHog tracking
- ⏳ Document baseline metrics

## Troubleshooting

**Error: Could not connect to API**
```bash
# Make sure backend is running
cd /Users/leonshimizu/Desktop/ShimizuTechnology/HafaGPT/HafaGPT-API
python -m uvicorn api.main:app --reload
```

**Script runs but all tests fail**
```bash
# Check API is responding
curl http://localhost:8000/api/health

# Try with verbose output
python evaluation/test_evaluation.py --limit 1
```

**Want to add more tests?**
Edit `test_queries.json` and add entries following the same format.

---

**Created:** November 22, 2025  
**Part of:** Phase 1 - Evaluation Framework  
**Goal:** Measure → Improve → Measure → Repeat

