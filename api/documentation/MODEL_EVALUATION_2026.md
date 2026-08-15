# HåfaGPT Model Evaluation — 2026

> **Corpus prerequisite (August 7, 2026):** Model quality cannot be separated from
> source quality. The current RAG collection is duplicate-heavy, lacks required
> rights/provenance metadata, and uses several sources outside their appropriate
> authority role. Complete the clean-corpus gates in
> [LANGUAGE_RESOURCE_AUDIT_2026-08-07.md](LANGUAGE_RESOURCE_AUDIT_2026-08-07.md)
> before treating an integrated model result as production evidence.

**Status:** corrected 23-model integrated landscape screen complete; blind native review and 100-case promotion suite pending
**Last updated:** August 8, 2026 (Guam)

## Decision statement

There is not yet a legitimate production winner. The August 8 decision ledger now
contains 744 comparable integrated/provider/treatment calls across 23 current
model IDs: the original 336 calls plus a 336-call frontier/open-weight expansion,
a 24-call Qwen Plus run, and a 48-call Qwen budget treatment. A separate 14-call
smoke proved availability/adapters and is not counted as decision evidence.

The expanded review order is GPT-5.6 Luna for fast practice; Terra, Luna, Claude
Sonnet 5, Grok 4.5, GLM 5.2, Llama 4 Maverick, and the current control for the core
tutor; and Gemini Flash, Gemini Pro Preview, and Kimi K3 for a separate vision
suite. The versioned recommendation remains explicitly non-production in
`evaluation/model_routing_recommendation_2026-08-08.json`.

The old reported accuracy percentages remain insufficient evidence because the
comparison prompt differed from the application, scoring was permissive keyword
matching, and no blind native-speaker review was required. The new automated score
is also a regression signal—not a Chamorro accuracy claim.

The evidence-supported working hypothesis—not yet a production recommendation—is a routed system:

- a low-cost model for frequent grounded drills and simple vocabulary;
- a balanced model for the main tutor and explanations;
- a vision-capable model for images/documents;
- an expensive high-reasoning model only for difficult cases or offline content work.

Whether routing beats one model must be established by the process below.

## Candidate set

The original catalog was checked on August 5. On August 8 it was expanded and all
23 IDs were confirmed against OpenRouter's public model endpoint. The table below
preserves the original comparison; the 15 added candidates, official-source
research, prices, results, and selection rationale are documented in
[FRONTIER_MODEL_RESEARCH_2026-08-08.md](FRONTIER_MODEL_RESEARCH_2026-08-08.md).

| Alias | Model ID | Evaluation role | Catalog input/output per 1M tokens |
|---|---|---|---:|
| current-deepseek-v3 | `deepseek/deepseek-chat` | current control | $0.14 / $0.28 |
| deepseek-v4-flash | `deepseek/deepseek-v4-flash-0731` | lowest-cost tutor candidate | $0.09 / $0.18 |
| deepseek-v4-pro | `deepseek/deepseek-v4-pro` | stronger DeepSeek candidate | $0.435 / $0.87 |
| gemini-3.6-flash | `google/gemini-3.6-flash` | fast multimodal candidate | $1.50 / $7.50 |
| gpt-5.6-luna | `openai/gpt-5.6-luna` | high-volume candidate | $0.10 / $0.60 |
| gpt-5.6-terra | `openai/gpt-5.6-terra` | balanced tutor candidate | $1.00 / $6.00 |
| claude-sonnet-5 | `anthropic/claude-sonnet-5` | premium explanation candidate | $2.00 / $10.00 |
| gpt-5.6-sol | `openai/gpt-5.6-sol` | quality ceiling/escalation candidate | $5.00 / $30.00 |

Prices are a frozen comparison input, not a billing guarantee. The runner also records OpenRouter-reported usage/cost when returned.

## Why the original models remain in the comparison

- **Control:** a change must beat or complement the model currently deployed.
- **DeepSeek V4 Flash/Pro:** direct successors in the same provider family, with favorable cost for high-volume use.
- **Gemini 3.6 Flash:** a fast multimodal candidate that may replace the separate vision fallback if quality is adequate.
- **GPT-5.6 Luna/Terra/Sol:** current OpenAI role tiers. Official guidance recommends preserving the existing role, testing the same prompts/settings first, and then testing one lower reasoning effort rather than blindly replacing a model string.
- **Claude Sonnet 5:** a premium candidate for explanations, nuance, and hard teaching interactions.

The benchmark does not assume a larger or newer model is automatically better at Chamorro. Grounding adherence and willingness to say “not in the source” may matter more than general benchmark strength.

## Evaluation layers

### Layer 1 — source-grounded deterministic benchmark

The new runner uses:

- `evaluation/model_catalog_2026.json` — frozen model IDs, capabilities, roles, and prices;
- `evaluation/model_benchmark_cases.json` — 24 cases across translation, reverse translation, misconception correction, variants, structured output, and uncertainty;
- `language_content/canonical_vocabulary.json` — the only language authority injected into each case;
- `evaluation/model_benchmark.py` — full-response capture, tokens, timing, cost, scoring, and blind-review generation.

Automated checks keep these dimensions separate:

- normalized lexical match;
- exact teaching orthography;
- source citation;
- required source-backed variants;
- JSON validity/schema keys;
- explicit uncertainty when no reference is supplied.

An automated score is only a regression signal. It does not score grammatical naturalness, cultural appropriateness, pronunciation, or unlisted hallucinations reliably.

### Layer 2 — blinded human review

Every run produces `blind_human_review.csv`, with randomized response labels and no model names. At least two qualified reviewers should independently rate:

1. factual/language accuracy;
2. grammar and naturalness;
3. orthography;
4. cultural appropriateness;
5. teaching usefulness;
6. uncertainty and source faithfulness;
7. presence of a critical error.

Disagreements of two or more points or any critical-error disagreement require adjudication. The hidden key is revealed only after ratings are locked.

### Layer 3 — integrated staging RAG evaluation

Direct-model tests answer “can the model follow a clean source?” They do not test HåfaGPT's retrieval, prompt truncation, history, web-search behavior, or citations.

Run the established app evaluation against a protected staging environment after adding a model override restricted to administrators/evaluation tokens. The test set must include:

- exact dictionary lookups with and without diacritics;
- ambiguous and missing words;
- multi-turn corrections;
- beginner/intermediate/advanced styles;
- immersion-mode language leakage;
- source conflict/variant handling;
- long RAG context and truncation;
- uploaded image/document flows;
- prompt injection inside retrieved/uploaded content;
- cancellation, timeout, and provider failure behavior.

Record retrieval IDs and scores, assembled-prompt version/hash, returned provider/model, latency, token use, cost, citations, and the complete answer in a private evaluation artifact.

### Layer 4 — shadow and canary production validation

After offline approval:

- shadow a sample of eligible, consent-compatible requests without showing alternate answers;
- redact or exclude personal conversations;
- compare latency, refusal, source use, cost, and reviewer feedback;
- canary to a small percentage behind a feature flag;
- maintain one-click rollback to the control model.

## Running the benchmark

Never paste a key into documentation, shell history intended for sharing, or source control. Put `OPENROUTER_API_KEY` in ignored `api/.env` or export it in the local shell.

```bash
cd api

# Offline schema/data validation
.venv/bin/python evaluation/model_benchmark.py --validate-only

# Confirm all catalog IDs are still offered by OpenRouter
.venv/bin/python evaluation/model_benchmark.py --validate-only --check-catalog

# Three-case smoke run across the current catalog
.venv/bin/python evaluation/model_benchmark.py --limit 3 --check-catalog

# Full 24-case integrated run across the current catalog
.venv/bin/python evaluation/model_benchmark.py \
  --rag-collection hafagpt_eval_canonical_v1 --check-catalog

# Separate GPT-5.6 lower-reasoning treatment; do not mix with baseline artifacts
.venv/bin/python evaluation/model_benchmark.py \
  --models gpt-5.6-luna,gpt-5.6-terra,gpt-5.6-sol \
  --reasoning-effort low \
  --rag-collection hafagpt_eval_canonical_v1

# Compare the GPT provider path directly (uses OPENAI_API_KEY)
.venv/bin/python evaluation/model_benchmark.py \
  --transport openai \
  --models gpt-5.6-luna,gpt-5.6-terra,gpt-5.6-sol \
  --rag-collection hafagpt_eval_canonical_v1
```

Select models by alias when diagnosing failures:

```bash
.venv/bin/python evaluation/model_benchmark.py \
  --models current-deepseek-v3,gpt-5.6-terra,claude-sonnet-5 \
  --limit 5
```

Generated artifacts live under ignored `evaluation/tmp/model_benchmark_<timestamp>/`:

- `results.json` — full answers, automated checks, returned model/provider, latency, tokens, cost, input hashes;
- `blind_human_review.csv` — reviewer worksheet;
- `blind_review_key.json` — response-label-to-model mapping.

Full responses may contain model errors or sensitive test material and must not be committed automatically.

## Promotion gates

A candidate can be considered for a role only if:

- 100% of calls complete in the full source-grounded suite after one controlled retry run;
- there are zero critical language/cultural errors in adjudicated review;
- uncertainty/source-faithfulness median is at least 4/5;
- accuracy and orthography medians are at least 4/5;
- it does not regress its target workload versus the control beyond a predeclared margin;
- p95 latency meets the product budget for that role;
- projected monthly cost fits a declared usage scenario;
- structured output, timeout, and fallback behavior are proven in staging;
- privacy/data-processing terms are acceptable for the intended content.

For the default tutor, require reviewer preference or non-inferiority across at least 100 representative staging cases. For a specialist route, evaluate only that role and prove the router does not send incompatible inputs.

## Workload decision matrix

| Workload | Primary metric | Likely candidates to test first | Escalation condition |
|---|---|---|---|
| Grounded word/drill | source fidelity, cost, latency | DeepSeek V4 Flash, GPT-5.6 Luna | low confidence or source conflict |
| Main tutor | reviewed accuracy, teaching usefulness | GPT-5.6 Terra, DeepSeek V4 Pro, Claude Sonnet 5 | critical ambiguity or advanced explanation |
| Image/document | transcription and source fidelity | Gemini 3.6 Flash, then vision-capable premium candidate | unreadable/complex document |
| Hard offline content/review aid | accuracy, uncertainty | GPT-5.6 Sol, Claude Sonnet 5 | never auto-publish; human approval required |

This table is a test order, not a routing decision.

## Current result status

| Check | Result |
|---|---|
| Benchmark case/catalog validation | Passed: 24 cases, 23 models |
| Live OpenRouter catalog availability | Passed: all 23 IDs present on August 8 |
| Original model API calls | Passed: 192/192 integrated OpenRouter, 72/72 direct-OpenAI, and 72/72 GPT-5.6 low-effort calls; one Gemini completion hit the length contract after providing the scored answer |
| Frontier/open-weight expansion | Completed: 336 common-budget calls across 14 additions, 24 Qwen Plus calls, and 48 higher-budget Qwen treatment calls |
| Expanded common-budget leaders | 100 automated signal and zero contract failures for Llama 4 Maverick, Grok 4.5, GLM 5.2, MiniMax M3, Gemini 3.1 Pro Preview, Claude Opus 5, Claude Fable 5, and Kimi K3; automated signal is not language accuracy |
| Qwen compatibility finding | Max scored 100 but had one length contract failure; Plus had 11; Flash/3.6 required a separate 4,000-token treatment to eliminate empty length-finished answers |
| Local RAG infrastructure | 44,865 chunks; ordinary retrieval passed after pgvector repair |
| Source-aware RAG policy | Deterministic policy/retrieval tests pass; Guampedia and Swarthmore blocked, historical intent separated, PDN/Visit Guam role-limited |
| Live semantic RAG gate | Passed August 8: database connectivity, ordinary semantic retrieval, and the PDN-specific source lane; all five returned references for the explicit PDN question were PDN sources |
| August 8 expanded provider smoke | Passed: 1/1 grounded case on all 14 initial additions; availability/adapter evidence only |
| Clean evaluation corpus | Passed: 101 source-backed entries, 101 unique hashes, evaluation-only purpose lock |
| Integrated per-model RAG comparison | Passed calibration: 192/192 OpenRouter calls, 72/72 direct-OpenAI calls, and 72/72 low-effort calls |
| Blind native review | Packet generated; two-reviewer scoring pending |
| Production model decision | Pending |

The measured shortlist is documented, but it would still be misleading to call the
highest automated signal the most accurate Chamorro model before signed-off review.
