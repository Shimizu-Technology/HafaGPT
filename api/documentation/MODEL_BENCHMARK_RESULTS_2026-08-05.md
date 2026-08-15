# HåfaGPT Model Benchmark Results — August 5, 2026

> **Superseded for model selection:** this direct-reference run remains useful as
> historical evidence, but the corrected integrated retrieval and provider-path
> results are in
> [PHASE_1_2_EXECUTION_2026-08-08.md](PHASE_1_2_EXECUTION_2026-08-08.md).
> Production selection still requires two independent qualified reviews.

## Decision summary

The 192-call source-grounded matrix completed successfully: 24 cases across eight
current OpenRouter models, with no request errors. This run supports a **provisional
engineering shortlist**, not a production language-quality decision:

1. **GPT-5.6 Terra** is the strongest practical default-tutor candidate. It met
   every automated response contract, was much faster and cheaper than the premium
   candidates, and showed no automated advantage for GPT-5.6 Sol.
2. **GPT-5.6 Luna** is the strongest high-volume/drill candidate. It was the
   fastest and cheapest model tested while meeting every response contract. Its one
   notable deterministic miss used the canonical accented pink form instead of the
   app's separately defined teaching display.
3. **Claude Sonnet 5** should remain in the blinded review as a premium explanation
   candidate. It produced the best deterministic score, largely because it cited
   sources more consistently, but cost about 4.9 times Terra for this batch and had
   a 12.6-second p95.
4. **Gemini 3.6 Flash** remains a vision/document candidate only. One structured
   answer was truncated because hidden reasoning consumed most of the 1,200-token
   completion budget. Its batch cost was the highest of all candidates.
5. **DeepSeek V4 Pro, DeepSeek V4 Flash, and GPT-5.6 Sol showed no engineering
   reason to promote them for the tested text workloads.** The control remains in
   place until human review and integrated RAG testing authorize a change.

No production switch should occur until two qualified Chamorro reviewers complete
the blinded packet and the finalists pass the real HåfaGPT RAG/application suite.

The August 7 language-resource audit adds a prerequisite: rebuild or isolate a
deduplicated, rights-cleared, role-aware RAG corpus before the integrated finalist
run. The current 44,865-row collection contains 30,010 redundant exact rows and is
90.3% Chamoru.info. The benchmark remains a valid engineering comparison, but its
24 references come from a 104-entry canonical layer with zero human-verified entries
and dependent dictionary sources. See
[LANGUAGE_RESOURCE_AUDIT_2026-08-07.md](LANGUAGE_RESOURCE_AUDIT_2026-08-07.md).

This role split also matches OpenAI's current migration guidance: Terra is the
balanced/mini-like tier, Luna the high-volume/nano-like tier, and Sol the flagship
tier; routers should map by role rather than replace every usage with Sol. The guide
also says to preserve prompts/settings for the baseline and test one lower reasoning
effort before prompt tuning. ([OpenAI GPT-5.6 upgrade guide](https://developers.openai.com/api/docs/guides/upgrading-to-gpt-5p6-sol.md))

## Test design

- 24 source-grounded cases: 10 grounded translations, four reverse translations,
  three misconception corrections, two variant explanations, three structured
  outputs, and two uncertainty/hallucination traps.
- Each request received only the matching entry from
  `language_content/canonical_vocabulary.json`.
- Every model received the same system prompt and case question.
- The runner captured the returned model/provider, full response, finish reason,
  latency, token usage, hidden reasoning tokens, provider-reported cost, and
  deterministic checks.
- `max_tokens` was 1,200. Temperature was zero only for models whose current API
  contract accepts it.
- Automated checks cover lexical presence, exact teaching display, requested
  citations/variants, JSON structure, and explicit uncertainty. They cannot judge
  native fluency, grammar, cultural fit, teaching quality, or subtle fabrication.

The uncertainty detector initially mishandled curly/apostrophized contractions
such as “can’t verify.” The bug was fixed, tested, and all preserved responses were
rescored without making new API calls. This changed false failures for Luna and
Claude; it did not change any model output.

## Quantitative results

| Model | Auto signal | Contracts | p50 | p95 | Reasoning tokens | Reported batch cost |
|---|---:|---:|---:|---:|---:|---:|
| Claude Sonnet 5 | 96.18 | 24/24 | 4.913 s | 12.568 s | 80 | $0.067062 |
| GPT-5.6 Terra | 92.71 | 24/24 | 1.668 s | 4.689 s | 0 | $0.013805 |
| GPT-5.6 Sol | 92.71 | 24/24 | 2.201 s | 6.465 s | 0 | $0.068995 |
| Gemini 3.6 Flash | 91.67 | 23/24 | 4.228 s | 6.451 s | 13,914 | $0.129708 |
| GPT-5.6 Luna | 91.33 | 24/24 | 1.681 s | 2.807 s | 40 | $0.001334 |
| current DeepSeek V3 | 91.33 | 24/24 | 3.688 s | 7.359 s | 0 | $0.003950 |
| DeepSeek V4 Pro | 91.33 | 24/24 | 6.686 s | 23.319 s | 4,111 | $0.019986 |
| DeepSeek V4 Flash | 90.98 | 24/24 | 3.381 s | 7.925 s | 2,823 | $0.002222 |

“Contracts” means a successful call ending normally, valid required structure, and
explicit uncertainty where required. “Auto signal” is deliberately not labeled
accuracy. Costs are the sums OpenRouter reported for these short benchmark prompts;
they are not projections for HåfaGPT's much longer production RAG prompts.

### Workload signals

- All models scored 100 on reverse translation and uncertainty after the evaluator
  fix.
- Claude was the only model to score 100 on both variant-explanation cases and had
  the strongest misconception-correction citation behavior.
- Terra and Sol had identical automated workload scores. Sol was slower and five
  times as expensive for the batch.
- Luna matched the control's overall automated signal at roughly one-third of the
  control's measured cost and less than half its median latency.
- Gemini scored 100 on the two variant cases but failed one of three structured
  outputs. It used 13,914 hidden reasoning tokens across the run—62% of its total
  tokens—and returned `finish_reason=length` for the failed case.
- The frequent 66.7/75 scores were usually citation-contract misses, not wrong
  vocabulary. Native review must judge whether the answers are actually better or
  worse for learners.

## Routing and cost evidence

OpenRouter routed the three OpenAI models to OpenAI and Claude to Amazon Bedrock
consistently. DeepSeek routing varied substantially:

- current DeepSeek V3 used DeepInfra, Novita, and StreamLake;
- V4 Flash used 11 different providers;
- V4 Pro used 10 different providers.

Provider-reported cost exceeded the frozen catalog calculation by 2.91× for the
control, 1.50× for V4 Flash, and 2.56× for V4 Pro. The OpenAI, Anthropic, and Google
reported totals matched the frozen calculation. Production experiments therefore
need returned-provider logging, provider-routing policy, and provider-reported cost;
catalog multiplication alone is not reliable enough.

## Controlled GPT-5.6 reasoning-effort experiment

Following the official migration sequence, the same 24 cases and prompt were run
again for Luna, Terra, and Sol with Chat Completions `reasoning_effort=low`. This
added 72 successful calls; no prompts or score rules changed.

| Model | Baseline signal / p50 / p95 / cost | Low signal / p50 / p95 / cost | Interpretation |
|---|---|---|---|
| Luna | 91.33 / 1.681 s / 2.807 s / $0.001334 | 90.63 / 2.129 s / 5.657 s / $0.001278 | low saved almost nothing, was slower in this small sample, and used generic `source_backed` instead of citations in two JSON cases |
| Terra | 92.71 / 1.668 s / 4.689 s / $0.013805 | 93.75 / 1.688 s / 7.351 s / $0.013745 | one variant citation improved; median/cost were effectively unchanged, while tail latency was noisier |
| Sol | 92.71 / 2.201 s / 6.465 s / $0.068995 | 92.71 / 2.631 s / 3.749 s / $0.068875 | no deterministic quality or cost gain over its baseline and still no benefit over Terra |

This single repeat is too small to call latency differences statistically stable.
It does show that “lower reasoning” is not automatically faster or better through
the current OpenRouter route. Keep both treatments blinded for review, then repeat
finalists over the larger integrated suite. OpenAI's prompt guidance recommends
surgical changes only after representative traces identify a failure; do not rewrite
HåfaGPT's tutor prompt during the baseline comparison. ([OpenAI GPT-5.6 prompting guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6.md))

HåfaGPT currently uses Chat Completions and always sends `temperature=0.7` at
runtime, while the benchmark deliberately omitted temperature for GPT-5.6. Before a
GPT-5.6 alias enters `MODEL_CONFIG`, add per-model request parameters and prove both
streaming/non-streaming paths. Do not make a model-string-only change.

Netlify AI Gateway was reviewed but is not the right migration surface for this
decision: HåfaGPT's AI/RAG boundary is the independently deployed Render API, and
the gateway's supported-model set is narrower/dynamic. Moving calls into Netlify
Functions would create an architecture migration rather than a controlled model
comparison. Revisit it only as a separate hosting decision.

## Local RAG integration result

The recovered local database contains 44,865 RAG chunks. After restoring the
matching pgvector 0.8.1 library for PostgreSQL 16:

- database/chunk check: passed;
- ordinary `Håfa Adai` context retrieval: passed;
- PDN-specific source retrieval: failed.

The failing query asks, “Who writes Chamorro language content in the Pacific Daily
News?” The top five returned sources were Guampedia, even though 188 PDN chunks are
present and the reranker describes PDN as highest priority. The likely design issue
is that source boosting occurs only after vector search selects its initial 50
candidates; a highly boosted source cannot be reranked if it never enters that
candidate pool. Confirm with retrieval traces, then add hybrid/source-aware
candidate generation rather than merely increasing a numeric boost.

## Preserved evidence

Private, gitignored artifacts:

- `evaluation/tmp/model_benchmark_20260805T093109Z/results.json`
- `evaluation/tmp/model_benchmark_20260805T093109Z/results_rescored.json`
- `evaluation/tmp/model_benchmark_20260805T093109Z/blind_human_review.csv`
- `evaluation/tmp/model_benchmark_20260805T093109Z/blind_review_key.json`
- `evaluation/tmp/model_benchmark_20260805T100048Z/results.json` (GPT-5.6 low effort)
- `evaluation/tmp/model_benchmark_20260805T100048Z/blind_human_review.csv`
- `evaluation/tmp/model_benchmark_20260805T100048Z/blind_review_key.json`

SHA-256:

```text
original results   1c7a38f7c4c934f9dc93a7d0266ed36face2889202fc3a7a7a43d980942bd407
rescored results   4fa8cdca1a001ec1abb788fd2575e427deb894401c63dbb6dea508c5897ad654
blind worksheet    64b726e140effa408256e9945b449e353e4e4353d978fd7ca22c79cae323f180
blind key          68ccdc95c634d0e1c2695391fb6f231e7f8a7bd9524ae33e015fd9c54437ab2b
low-effort results 707b2721f6ccd70263982e2004ec9a5d08b5985539b2f887562256278a6a87a7
low-effort review  eb1d28a8f6620d6b2a328520e5fb5a1477c2208deae056602fcda2a52cab3975
low-effort key     aa37b8e306d5cc4757a49993dd43a12b27e918078598ca4dad6773476e25cd1f
```

The key must remain hidden from reviewers until their ratings are locked.

## Required next decision gate

1. Two qualified reviewers independently score the blinded worksheet.
2. Adjudicate every critical-error flag and any two-point rating disagreement.
3. Advance Terra, Luna, Claude, and the current control to an integrated RAG suite;
   advance Gemini separately to a real image/document suite with an explicit
   reasoning/output budget.
4. Repair and trace source-aware retrieval before interpreting app-level model
   differences.
5. Run at least 100 representative app cases, including multi-turn teaching,
   diacritics, conflicting sources, missing evidence, uploads, prompt injection,
   timeout/fallback, and long context.
6. Shadow and canary behind a feature flag with a tested rollback.

Only then record a production model/routing decision.
