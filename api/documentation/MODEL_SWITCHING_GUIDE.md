# HåfaGPT Model Configuration Guide — 2026

## Current rule

Do not change production by copying a model name into Render. The August 2026
integrated 23-model landscape screen produced a shortlist, but production remains on the
`deepseek-v3` control until blinded Chamorro review and integrated RAG gates pass.

See:

- [Model evaluation method](MODEL_EVALUATION_2026.md)
- [Frontier and open-weight research/results](FRONTIER_MODEL_RESEARCH_2026-08-08.md)
- [August 2026 benchmark results](MODEL_BENCHMARK_RESULTS_2026-08-05.md)
- [Modernization roadmap](MODERNIZATION_ROADMAP_2026.md)

## Runtime configuration today

`api/api/chatbot_service.py` owns the `MODEL_CONFIG` registry. `CHAT_MODEL` in
`api/.env` selects an alias from that registry when the process starts.

```env
CHAT_MODEL=deepseek-v3
```

The current control resolves to `deepseek/deepseek-chat` through OpenRouter. The
August benchmark catalog is intentionally separate from the runtime registry: it
allows candidates to be evaluated without silently making them production options.

An unknown runtime alias falls back to `gpt-4o`. That behavior should be replaced
with fail-fast startup validation before model routing is expanded; a typo must not
cause an unplanned provider/cost change.

## Safe local benchmark

Keep the OpenRouter key only in ignored `api/.env` and run:

```bash
cd api

# Validate cases and current OpenRouter availability without model calls
.venv/bin/python evaluation/model_benchmark.py --validate-only --check-catalog

# Small adapter smoke
.venv/bin/python evaluation/model_benchmark.py --limit 3 --check-catalog

# Complete private matrix
.venv/bin/python evaluation/model_benchmark.py --check-catalog
```

Select a subset by stable benchmark alias:

```bash
.venv/bin/python evaluation/model_benchmark.py \
  --models current-deepseek-v3,gpt-5.6-luna,gpt-5.6-terra,claude-sonnet-5
```

Private results and the blind-review key live under ignored `evaluation/tmp/`.

## Adding a production-capable candidate

After a candidate clears its documented gates:

1. Add a stable internal alias to `MODEL_CONFIG`; do not scatter provider IDs.
2. Record provider, exact model ID, modality support, context/output limits, data
   handling, timeout, and cost assumptions in a decision record.
3. Validate the configured model ID against the provider at startup and fail closed.
4. Log the requested alias, returned model, returned provider, prompt/config hash,
   latency, token use, finish reason, retry/fallback, and provider-reported cost—no
   private prompt contents.
5. Add an administrator/evaluation-only model override for integrated testing. Do
   not accept arbitrary client-supplied provider IDs.
6. Put selection behind a server-side feature flag with a tested control rollback.
7. Shadow, canary, review, and only then change the default.

## Provisional roles from the August run

| Role to validate | Candidate(s) | Why advanced | Still required |
|---|---|---|---|
| Main tutor | Terra, Luna, Sonnet 5, Grok 4.5, GLM 5.2, Llama 4 Maverick | strongest combination of clean contracts, latency/cost diversity, and provider/deployment options | blind review + 100-case RAG suite |
| High-volume drills | GPT-5.6 Luna; Llama/GLM as open-weight screens | clean, fast, low measured routed cost | blind review + drill-specific RAG suite + self-hosting study for open weights |
| Premium explanation | Claude Sonnet 5 | newer ceiling models showed no deterministic advantage | prove human benefit justifies latency/cost |
| Images/documents | Gemini 3.6 Flash, Gemini 3.1 Pro Preview, Kimi K3 | credible multimodal candidates | real vision suite, version stability, and reasoning budget |
| Control | DeepSeek V3 | current rollback baseline | integrated head-to-head comparison |

GPT-5.6 Sol, Claude Opus/Fable, Kimi K3, and Qwen 3.8 Max did not show a text
advantage that justified their cost/latency. Qwen Plus/Flash/3.6 were not reliable
at the common output budget; a separate 4,000-token treatment fixed empty answers
for Flash/3.6 but removed their expected efficiency advantage. They should not
consume additional default-route work unless human or workload evidence changes
that conclusion.

## Secrets and cost controls

- Use development/provider-scoped keys with spend limits when available.
- Never commit `.env`, paste keys into reports, or expose server keys through Vite.
- `VITE_*` values are public by design; only publishable Clerk and public analytics
  project values belong there.
- Prefer OpenRouter-reported cost over catalog multiplication. DeepSeek reported
  cost in the August run was 1.50–2.91 times the frozen catalog calculation because
  requests were routed across many providers.
- Never use model output as canonical Chamorro content without human approval.
