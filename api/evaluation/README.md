# HåfaGPT Evaluation Suite

> **2026 status:** The older API/keyword scripts below are retained as historical
> regression tools. Their percentages must not be used to select a model or claim
> Chamorro accuracy. Use `model_benchmark.py` and the blinded native-review process
> in `../documentation/MODEL_EVALUATION_2026.md` for current model decisions.

## Tutor quality regression suite (Phase 1)

`run_tutor_quality.py` measures routing, retrieval coverage and response behavior
through **the production `get_chatbot_response` function**. It does not inject an
answer key. `tutor_quality_v1.json` has 150 cases: 22 anonymized production
regressions, 40 dictionary lookups, 36 request variants, 12 verification
follow-ups, 16 school messages, 16 communicative goals, four absent-word cases,
and four grammar questions. Expected headwords are byte-exact local dictionary
keys or canonical ledger terms, with source paths. Alternatives count once per
concept. These attestations do not establish native correctness.

The product serves parents reading immersion-school messages and heritage
learners composing everyday replies. This suite follows the November 3 program
(PLAN Phase 1, REPORT, private production review, KB audit, and resource research
§3), alongside Brain Dump `work/shimizu-tech/hafa-gpt.md`. At baseline the target
was `origin/main` `93355d9`, Render API / Netlify web; deployment was reported by
the program and was not independently checked here. Acceptance is an offline
safety test pass, all-case production-path baselines, source-reference
validation, cost reporting and exportable native-review worksheets. No UI
behavior changes, production access or server are required.

The production report supplies short excerpts, not complete conversation
exports. Personal names are replaced with roles. Multi-turn fixtures retain the
relevant user/assistant sequence using source-copied terms; they do not invent
Chamorro sentences. Worksheet cases are **text surrogates**: image reading,
negation accuracy and cross-run photo consistency remain untested. GDOE-style
requests are original English requests inspired by the five communication,
culture and community domains, not copied indicators or a validated grade map.
`penguin` is absent locally. The mythical `unicorn` is absent as a translation;
several dictionary definitions mention unicorn **fish**, so those are not a
matching animal sense.

```bash
cd api
# Validate all source references, no DB or API calls.
.venv/bin/python evaluation/run_tutor_quality.py --validate-only --output /tmp/tq-validate

# Free routing + real retrieval + final prompt assembly. Cached embeddings only;
# first-run cache misses are explicitly blocked and return exit status 1.
.venv/bin/python evaluation/run_tutor_quality.py --retrieval-only \
  --output evaluation/results/local/before-free

# Optional: populate missing embeddings through the production retrieval path,
# with no chat-model calls. Cloud embedding charges are tiny and reported.
.venv/bin/python evaluation/run_tutor_quality.py --retrieval-only --allow-paid-embeddings \
  --output evaluation/results/local/before-embedding-warm

# One full baseline, default CHAT_MODEL from api/.env; serial, $4.50 chat budget.
.venv/bin/python evaluation/run_tutor_quality.py \
  --output evaluation/results/local/before-full

# Run on the candidate branch with the SAME JSON and embedding cache.
.venv/bin/python evaluation/run_tutor_quality.py --retrieval-only \
  --output evaluation/results/local/after-free
.venv/bin/python evaluation/run_tutor_quality.py --model gpt-5.6-luna \
  --budget-usd 4.50 --output evaluation/results/local/after-full

# Combine before/after responses into one randomized packet; keep key separate.
.venv/bin/python evaluation/run_tutor_quality.py --packet-from \
  evaluation/results/local/before-full/cases.jsonl \
  evaluation/results/local/after-full/cases.jsonl \
  --output evaluation/results/local/blind-comparison --seed 42
.venv/bin/python evaluation/validate_blind_reviews.py reviewer-one.csv reviewer-two.csv

# Optional English behavior judge. Additional cost within the same chat budget;
# advisory only, never a Chamorro correctness judge or promotion gate.
.venv/bin/python evaluation/run_tutor_quality.py --llm-judge \
  --output evaluation/results/local/advisory

# Retry only failed/missing cases from the SAME suite, model, mode and commit.
.venv/bin/python evaluation/run_tutor_quality.py \
  --resume-from evaluation/results/local/before-full/cases.jsonl \
  --output evaluation/results/local/before-recovered

# Recompute response heuristics without another paid run (e.g. checker changes).
.venv/bin/python evaluation/run_tutor_quality.py \
  --rescore-from evaluation/results/local/before-full/cases.jsonl \
  --output evaluation/results/local/before-rescored
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 .venv/bin/python -m pytest -q tests/test_tutor_quality.py
```

For another worktree, use its interpreter and `--env-file /path/to/api/.env`;
share the ignored cache with `--embedding-cache /absolute/path/embeddings.json`.
Keep the same suite SHA, collection/embedding contract and model for before/after
comparisons. Every summary records the source commit, harness/suite hashes,
model, corpus collection, prices, completion coverage and database audit. Do not
run two jobs against the same output/cache path. Freeze the JSON for v1; source
updates that invalidate a headword must be reviewed rather than normalized away.

Each run writes `cases.jsonl`, `summary.json`, and `summary.md`. Full runs also
export `blind_human_review.csv` and a separate `blind_review_key.json` using the
existing model benchmark exporter and validator. Two qualified reviewers rate
identical packets independently; native review is deferred, not passed. A
single-model packet randomizes case order; combining runs randomizes treatment
labels within cases. Keep the key from reviewers. Raw outputs/cache/packets are
ignored under `results/`; commit only safe aggregate summaries. Raw outputs
contain only the sanitized fixtures and generated replies, but generated replies
can still be wrong. Do not publish them as language-learning material.

Metric definitions and limits:

- Refusal rate: regex-positive responses / completed answerable responses
  (`answer` or `best_effort_draft`). `refuse_absent` and `clarify` are excluded.
  Missing completions and cache-blocked cases do not count as successes.
- Headword recall (overall and per category): matched expected concepts / expected concepts in completed
  cases, micro-averaged. A match must occur in retrieved reference text retained
  in the final system prompt, not in user/history/output. Matching preserves
  diacritics and apostrophes but ignores case. Text presence is a retrieval
  proxy, not proof of correct sense or source attribution. Production timeouts
  remain part of observed retrieval behavior and can lower recall.
- `must_not`: deterministic signals for sending in English, retracting prior
  evidence, unsupported verification claims, the reported scared/forgot error,
  monkey extraction noise, unresolved school abbreviations, and absent-word
  certainty. These checks can flag quoted corrections and miss paraphrases.
  Verification checks look for a citation on the same line; inspect the packet
  before treating a flag as a confirmed defect.
- Router: raw `classify_translation_request(user_message)` against the annotated
  expected class, plus the actual contextual retrieval-query class per case.
  Future history-aware routers may need a compatible adapter. Raw misses on
  conversational continuations are deliberate regression targets.
- Latency: nearest-rank p50/p95 end-to-end per completed case. Full includes
  retrieval and model time; free includes retrieval and prompt assembly only.
- Cost: OpenRouter-reported chat cost where returned, and a separate estimate
  from live catalog token prices (no assumed discount). Embeddings use cached
  real vectors in free mode; warming/full runs report new embedding tokens and
  an estimate at $0.02/M. The conservative chat/judge guard reserves maximum
  output cost before each request. Failed upstream calls may lack usage; errors
  and missing usage remain visible. `--limit` creates a subset, not a full gate.

Persistence safety: before connecting, the CLI prints **only host and dbname**
from the configured URL and rejects non-local/non-`chamorro_rag` databases. All
psycopg and psycopg2 connections (including SQLAlchemy's) force and verify read-only
transactions. PGVector extension/table/collection creation is disabled before
its singleton import. A SQLAlchemy guard rejects non-SELECT/SHOW statements.
Fixture history is passed in memory; conversation history and logging are
stubbed, the conversation DB helper fails closed, and web search returns an unsuccessful stub (no external calls). Suppression is
recorded per case; the resulting production fallback behavior is measured.
No user IDs are supplied. Existing collection-contract checks still execute;
there are no migrations, seed calls or DB startup/reset commands. Missing DB or
RAG initialization fails before recording a degraded baseline. Unit tests execute
the real production function body with fake provider/retrieval boundaries and
prove that logging/history never touch a DB.

## Current model-selection workflow

```bash
cd api
.venv/bin/python evaluation/model_benchmark.py --validate-only --check-catalog

# Requires OPENROUTER_API_KEY in ignored api/.env or the local environment
.venv/bin/python evaluation/model_benchmark.py --limit 3 --check-catalog
.venv/bin/python evaluation/model_benchmark.py \
  --rag-collection hafagpt_eval_canonical_v1 --check-catalog

# Controlled GPT-5.6 lower-effort treatment; keep separate from the baseline
.venv/bin/python evaluation/model_benchmark.py \
  --models gpt-5.6-luna,gpt-5.6-terra,gpt-5.6-sol \
  --reasoning-effort low \
  --rag-collection hafagpt_eval_canonical_v1

# Provider-path parity for the GPT tiers (uses OPENAI_API_KEY)
.venv/bin/python evaluation/model_benchmark.py \
  --transport openai \
  --models gpt-5.6-luna,gpt-5.6-terra,gpt-5.6-sol \
  --rag-collection hafagpt_eval_canonical_v1
```

The runner captures complete responses, returned model/provider, timing, tokens,
cost, source/orthography/format checks, retrieval traces and hashes, provider path,
and a blinded review packet. The private evaluation collection is purpose-locked
and cannot be selected by the production runtime.
Automated scores are regression signals only; native-speaker/educator review is a
required release gate.

## Governed source-routing release gate

`source_routing_cases.json` is the fast, deterministic pre-deploy benchmark for
the production evidence router. It verifies query-role classification, approved
knowledge-card selection, false-positive avoidance, regional spelling variants,
and separation of modern guidance from historical questions. It performs no
model calls, does not connect to the production database, and contains no user
data.

```bash
cd api
PYTHONPATH=. .venv/bin/python scripts/run_source_routing_benchmark.py
```

The repository-wide `scripts/check.sh` command runs this benchmark automatically.
Production retrieval also emits a privacy-safe `RAG_SELECTION` JSON log with the
route, query type, governed source IDs, evidence kinds, card IDs, and truncation
status. It deliberately excludes the user message, retrieved text, source names,
URLs, and private paths.

## Legacy evaluation suite

Automated testing framework to measure and track HafaGPT's performance over time.

## Files

- `test_queries.json` - 60 comprehensive test queries across 5 categories
- `test_evaluation.py` - Automated evaluation script
- `eval_results_*.json` - Full evaluation results (generated)
- `eval_report_*.txt` - Human-readable reports (generated)

## Quick Start

### 1. Start your backend server

```bash
cd /Users/leonshimizu/Desktop/ShimizuTechnology/HafaGPT/api
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
cd /Users/leonshimizu/Desktop/ShimizuTechnology/HafaGPT/api
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
