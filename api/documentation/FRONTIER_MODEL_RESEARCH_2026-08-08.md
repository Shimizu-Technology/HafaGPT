# HåfaGPT Frontier and Open-Weight Model Review — August 8, 2026

**Decision status:** expanded engineering comparison in progress; no production
promotion before blind qualified review and the 100-case promotion suite

## Why the earlier shortlist was not enough

The first Phase 1–2 run was legitimate for the eight models it tested, but it was
not a complete review of the current market. In particular, it did not include
Kimi K3, current Qwen hosted and open-weight tiers, Anthropic's Opus/Fable ceiling,
Gemini Pro, Grok, GLM, MiniMax, Mistral, Nemotron, gpt-oss, or Llama. A green
provider call or a vendor benchmark is not evidence that any of these is better at
HåfaGPT's source-grounded Chamorro teaching workload.

The catalog now contains 23 live OpenRouter IDs: the original eight plus 15
additional frontier or representative open-weight candidates. `--check-catalog`
confirmed every ID against OpenRouter's public catalog on August 8. Prices below
are the frozen OpenRouter comparison inputs at that time, not billing guarantees.

## Expanded candidates

| Alias | OpenRouter ID | Class | Input / output per 1M | Why it belongs |
|---|---|---|---:|---|
| kimi-k3 | `moonshotai/kimi-k3` | open weights, custom license | $3.00 / $15.00 | current 1M-context multimodal frontier system |
| qwen-3.8-max | `qwen/qwen3.8-max` | hosted proprietary | $2.00 / $6.00 | current Qwen hosted quality ceiling |
| qwen-3.7-flash | `qwen/qwen3.7-flash` | hosted proprietary | $0.03 / $0.13 | unusually inexpensive current hosted tier |
| qwen-3.7-plus | `qwen/qwen3.7-plus` | hosted proprietary | $0.32 / $1.28 | balanced-cost Qwen tier that could outperform the endpoint tiers on value |
| qwen-3.6-35b-a3b | `qwen/qwen3.6-35b-a3b` | Apache-2 open weights | $0.14 / $1.00 | practical multilingual open model |
| claude-opus-5 | `anthropic/claude-opus-5` | hosted proprietary | $5.00 / $25.00 | premium Anthropic comparator |
| claude-fable-5 | `anthropic/claude-fable-5` | hosted proprietary | $10.00 / $50.00 | Anthropic maximum-capability ceiling; cost must be justified |
| gemini-3.1-pro-preview | `google/gemini-3.1-pro-preview` | hosted preview | $2.00 / $12.00 | Google Pro intelligence comparator; preview status is a deployment risk |
| grok-4.5 | `x-ai/grok-4.5` | hosted proprietary | $2.00 / $6.00 | current xAI frontier comparator |
| glm-5.2 | `z-ai/glm-5.2` | MIT open weights | $0.4046 / $1.2716 | 1M-context open frontier candidate |
| minimax-m3 | `minimax/minimax-m3` | open weights | $0.30 / $1.20 | efficient 1M-context multimodal candidate |
| mistral-small-4 | `mistralai/mistral-small-2603` | Apache-2 open weights | $0.15 / $0.60 | efficient multilingual 256k model |
| nemotron-3-ultra | `nvidia/nemotron-3-ultra-550b-a55b` | open weights | $0.60 / $3.60 | NVIDIA reasoning/open-model comparator |
| gpt-oss-120b | `openai/gpt-oss-120b` | Apache-2 open weights | $0.037 / $0.17 | low-cost deployable OpenAI open-model baseline |
| llama-4-maverick | `meta-llama/llama-4-maverick` | community-license open weights | $0.20 / $0.80 | widely deployable ecosystem baseline, despite its age |

“Open weights” does not mean the benchmark is self-hosted. These tests use
OpenRouter endpoints, so latency, privacy, cost, uptime, quantization, and returned
provider can differ from a controlled deployment. License terms also differ; the
catalog records the deployment class so product and legal review do not collapse
all open models into one category.

## What official research establishes

- OpenAI's current role guidance makes GPT-5.6 Sol the quality tier, Terra the
  balanced tier, and Luna the high-volume tier. It recommends workload testing
  instead of assuming the largest tier is best.
- DeepSeek temporarily mapped its direct `deepseek-chat`/`deepseek-reasoner`
  aliases to V4 Flash, then discontinued those aliases on July 24, 2026. HåfaGPT's
  `deepseek/deepseek-chat` is a separate OpenRouter legacy control, not proof of a
  current direct DeepSeek alias or model version.
- Kimi K3 is a native multimodal, long-context open-weight system with a custom
  license. It must be judged on the application workload and license, not only its
  large published parameter count.
- Qwen offers both hosted frontier tiers and practical Apache-2 weights. The
  current hosted IDs are verified from the live OpenRouter catalog; deployment
  decisions still require official model-card and license review.
- Google labels Gemini 3.1 Pro as Preview, while Gemini 3.6 Flash is the stable
  workhorse. A text benchmark does not decide the separate vision/document role.
- Mistral Small 4, GLM 5.2, MiniMax M3, Nemotron 3 Ultra, gpt-oss-120b, and Llama 4
  are credible open-weight comparisons, but none should be promoted merely to
  avoid a hosted frontier vendor. HåfaGPT must price the actual serving stack and
  prove Chamorro/source behavior.

## Comparable evaluation protocol

Every candidate receives the same 24 cases, system prompt, retrieval query,
purpose-locked `hafagpt_eval_canonical_v1` collection, 1,200-token budget, and
deterministic checks. The run captures complete answers, provider/model identity,
latency, token/cost data, finish reason, and a randomized blind-review packet.

The automated score checks lexical presence, exact teaching orthography, source
citation, required variants, JSON structure, and explicit abstention. It is not a
Chamorro fluency or cultural-quality score. Selection still requires two qualified
reviewers, adjudication, independently authored cases, and runtime canary evidence.

## Completed live evidence

The expanded work produced 408 comparable or diagnostic calls after the initial
smoke: 336 common-budget calls across 14 additions, 24 common-budget Qwen Plus
calls, and 48 higher-budget Qwen diagnostic calls. Combined with the prior 336
integrated/provider/reasoning calls, the current decision ledger contains 744 live
calls. The 14-call smoke is availability evidence and is not counted as decision
evidence.

### New candidates at the common 1,200-token contract

| Candidate | Calls | Auto signal | p50 / p95 | Reported cost | Contract failures |
|---|---:|---:|---:|---:|---:|
| Llama 4 Maverick | 24/24 | 100.00 | 2.912s / 6.883s | $0.006377 | 0 |
| GLM 5.2 | 24/24 | 100.00 | 2.106s / 9.354s | $0.014126 | 0 |
| Grok 4.5 | 24/24 | 100.00 | 4.345s / 5.965s | $0.087460 | 0 |
| MiniMax M3 | 24/24 | 100.00 | 5.426s / 7.928s | $0.013816 | 0 |
| Gemini 3.1 Pro Preview | 24/24 | 100.00 | 6.704s / 8.555s | $0.227468 | 0 |
| Claude Fable 5 | 24/24 | 100.00 | 7.281s / 9.719s | $0.655100 | 0 |
| Claude Opus 5 | 24/24 | 100.00 | 7.792s / 12.694s | $0.419375 | 0 |
| Qwen 3.8 Max | 24/24 | 100.00 | 7.130s / 11.318s | $0.095688 | 1 |
| Kimi K3 | 24/24 | 100.00 | 10.199s / 18.818s | $0.191970 | 0 |
| Nemotron 3 Ultra | 24/24 | 98.61 | 3.479s / 8.563s | $0.037391 | 0 |
| gpt-oss-120b | 24/24 | 98.61 | 6.130s / 22.855s | $0.002709 | 0 |
| Mistral Small 4 | 24/24 | 94.45 | 1.014s / 1.718s | $0.003981 | 0 |
| Qwen 3.7 Flash | 22/24 | 63.64 | 8.130s / 9.785s | $0.003333 | 8 plus 2 HTTP 429s |
| Qwen 3.7 Plus | 24/24 | 61.46 | 20.486s / 22.233s | $0.039627 | 11 |
| Qwen 3.6 35B A3B | 24/24 | 56.25 | 9.316s / 18.740s | $0.030907 | 12 |

Qwen 3.8 Max's automated answer checks passed, but one response ended with
`finish_reason=length`; it is therefore not contract-clean. The lower Qwen tiers
spent most or all of the common budget on hidden reasoning and often returned an
empty answer. Qwen Flash also received two provider 429s. This is an adapter/budget
and operational result, not proof that their underlying language ability is poor.

The abstention detector initially missed valid Claude phrases such as “cannot be
translated” and “can't provide.” Tests were added and preserved answers were
rescored. No response was regenerated and the result hash below refers to the
corrected scoring artifact.

### Qwen 4,000-token diagnostic treatment

| Candidate | Calls | Auto signal | p50 / p95 | Reported cost | Contract failures |
|---|---:|---:|---:|---:|---:|
| Qwen 3.6 35B A3B | 24/24 | 100.00 | 6.482s / 22.538s | $0.036779 | 0 |
| Qwen 3.7 Flash | 24/24 | 97.22 | 8.352s / 11.008s | $0.004438 | 0 |

The larger budget restores usable answers, but Qwen 3.6 used 28,676 reasoning
tokens and had a 120.89-second outlier; Flash used 27,106 reasoning tokens. The
treatment removes their expected responsiveness advantage, and Flash still missed
two exact orthography/source checks. Keep these results separate from the common
contract and do not advance them as current defaults.

### Decision after the expansion

- **Fast/default hosted route:** GPT-5.6 Luna remains the lead. Its earlier
  integrated run was 100 with a 1.587-second p50, 2.952-second p95, and $0.003375
  reported batch cost, plus a healthy direct-OpenAI comparison.
- **Core-tutor blind finalists:** Terra, Luna, Claude Sonnet 5, Grok 4.5, GLM 5.2,
  Llama 4 Maverick, and the current control. Automated ties must be broken by
  qualified teaching-quality review.
- **Open-weight leaders:** Llama 4 Maverick is the cleanest overall screen; GLM 5.2
  and MiniMax M3 also advance. DeepSeek V4 Flash, Nemotron, and Mistral remain useful
  backup/value comparisons. This is not yet a self-hosting decision.
- **Vision/document suite:** Gemini 3.6 Flash, Gemini 3.1 Pro Preview, and Kimi K3.
  The text suite cannot select a multimodal route.
- **Premium ceilings:** Sol, Opus, Fable, Kimi, and Qwen Max showed no deterministic
  gain that justifies their cost/latency. Sample them in blind review, but do not
  burden the full finalist stage unless reviewers see a material advantage.
- **Do not advance on the current contract:** Qwen Plus, Flash, and 3.6; gpt-oss is
  also a weak finalist because its latency tail is poor despite very low routed
  cost.

No production model is selected. The next legitimate decision is a human-reviewed
shortlist, followed by an independently authored 100-case promotion suite, a
separate multimodal suite, and shadow/canary validation.

### Private evidence hashes

```text
14-model common-budget rescored results  128124e427b128be348cd673c5d1e6b8c8cbc56ecf1c57aa47b8557fc9cb1180
Qwen Plus common-budget results          abc337193a89af2470f01ec879038a9af1257eca113e4f45eb4162e7d4fec829
Qwen 4,000-token treatment results       20f8746c11913efe5142da9de94ce87f305bca509681a02855fd75f53dd58010
```

Full responses and blind keys remain under ignored `evaluation/tmp/`; they must
not be committed or revealed before reviewer ratings are locked.

## Decision rules

1. A candidate that cannot complete every required contract is not a default.
2. More capability must produce a material blind-review gain to justify more cost
   or latency.
3. The cheapest contract-clean model should remain eligible for drills and simple
   source-grounded transformations.
4. Preview models cannot be the only production route without an explicit version
   and rollback strategy.
5. Open-weight finalists need a separate self-hosted total-cost, privacy, security,
   and operations evaluation; OpenRouter performance is only the model-behavior
   screen.
6. Vision/document models require a dedicated multimodal suite.
7. No model output may become canonical language content without human approval.

## Primary sources

- [OpenAI latest-model guide](https://developers.openai.com/api/docs/guides/latest-model)
- [DeepSeek V4 release](https://api-docs.deepseek.com/news/news260424/)
- [DeepSeek API change log](https://api-docs.deepseek.com/updates)
- [Kimi K3 official site](https://www.moonshot.ai/)
- [Kimi K3 official repository and license](https://github.com/MoonshotAI/Kimi-K3)
- [Qwen official repository](https://github.com/QwenLM/Qwen3)
- [Qwen3.6 35B A3B Apache-2 license](https://huggingface.co/Qwen/Qwen3.6-35B-A3B/blob/main/LICENSE)
- [Anthropic model announcements](https://www.anthropic.com/news)
- [Google Gemini model catalog](https://ai.google.dev/gemini-api/docs/models)
- [Google Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
- [xAI Grok 4.5 announcement](https://x.ai/news/grok-4-5)
- [GLM 5.2 announcement](https://z.ai/blog/glm-5.2)
- [MiniMax M3 announcement](https://www.minimax.io/blog/minimax-m3)
- [Mistral Small 4 announcement](https://mistral.ai/news/mistral-small-4/)
- [NVIDIA Nemotron 3 Ultra announcement](https://developer.nvidia.com/blog/nvidia-nemotron-3-ultra-powers-faster-more-efficient-reasoning-for-long-running-agents/)
- [OpenAI gpt-oss introduction](https://openai.com/index/introducing-gpt-oss/)
- [Meta Llama 4 announcement](https://ai.meta.com/blog/llamacon-llama-news/)
- [OpenRouter public model catalog](https://openrouter.ai/api/v1/models)
