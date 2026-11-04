# Retiring model replacement — November 5, 2026

HåfaGPT serves Chamorro learners through a React web app and a FastAPI RAG tutor.
This change replaces retiring generation routes while preserving tutor/photo
behavior, embeddings, language content and published audio. The branch starts at
c44b539 (PR #119). The implementation worker leaves review and merge to the lead.
No Render or other production setting is changed.

Sources: repository AGENTS.md and README, actual endpoint implementations,
PR #112's provider boundary, and the Round 3 update at the top of the supplied
output/hafagpt-review-2026-11-03/eval/model-compare/REPORT.md. Earlier report
sections are historical. The Brain Dump project overview identifies HafaGPT as
a Leon/Jerry product; the repository and Round 3 record supply current details.

## Requested changes

| Item | Result |
| --- | --- |
| 1. Tutor/photos | Keep CHAT_MODEL=gpt-5.6-luna, its existing capabilities and request path. |
| 2. Flashcards | FLASHCARD_MODEL defaults to gpt-6-luna; OpenRouter openai/gpt-6-luna, reasoning none, cap 6000, no temperature. Prompt forbids citations in fields. Parsing removes source brackets before deduplication, preserves ordinary brackets/language bytes, and skips empty required fields. |
| 3. Practice | PRACTICE_MODEL defaults to gpt-6.1-terra; OpenRouter openai/gpt-6.1-terra, reasoning none, cap 2000, no temperature, JSON object output. Empty Chamorro remains allowed; objective evidence is validated and authoritative scores remain suppressed. |
| 4. Env aliases | Independent optional feature settings resolve at import/startup. Invalid/empty aliases or missing OpenRouter credentials raise ModelConfigurationError. No production env change required. |
| 5. Registry/rollback | Keep only gpt-5.6-luna, gpt-6-luna, gpt-6.1-terra. Established 5.6 Luna is the feature rollback. Remove DeepSeek, Gemini, GPT-4, Claude, Llama and Qwen runtime aliases. README updated. |
| 6. Vision | Text-only chat configurations route images explicitly to 5.6 Luna or fail clearly. Vision-capable models keep their existing path. No Gemini/direct OpenAI fallback. |
| 7. Summary | The helper condenses old conversation history and long documents. Old Gemini route is absent from OpenRouter catalog and returned HTTP 404 on a bounded English probe. Use openai/gpt-6-luna, reasoning none, no temperature; retain truncation on missing key/provider/empty response. Run blocking call off the event loop. |
| 8. Audit/defaults | Fix stale main.py CHAT_MODEL default and old comments. Leave gpt-4o tokenizer defaults: local tiktoken only, no model API call. Changing them could change budgets/retained evidence. Full model inventory linked below. |
| 9. Speech | Remove OpenAI live fallback and new admin/batch generation. Keep historical candidates/static MP3s. ElevenLabs failure returns safe 503 for existing device fallback. No Realtime integration. |
| Shared failures | Both features use shared friendly retry/alert handling, including SDK, billing, timeout and malformed/empty/truncated JSON failures. Model/source appear in alerts; provider text does not. Timeout 45 seconds, zero SDK retries, accommodating the observed 22-second outlier. |

Usage policy is unchanged. Flashcards authenticate via verify_user but have no
daily-usage reservation. Practice has no endpoint auth or usage reservation.
Neither component increments separate daily usage for these calls. There is no
local balance preflight in the learner path; upstream credit failures use the
shared 503/alert boundary. New abuse/usage policy is outside this migration.

## Speech evidence

OpenAI's [current speech guide](https://developers.openai.com/api/docs/guides/text-to-speech)
says gpt-realtime-2.1-mini does not support /v1/audio/speech.
The [Speech API reference](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create)
lists only retiring models; the [deprecation schedule](https://developers.openai.com/api/docs/deprecations)
retires them January 6, 2027. No supported ongoing drop-in was available, so no
speech call was purchased. GPT-4o/mini retire January 14, 2027.

useSpeech clears generated playback on HTTP failure and attempts its existing
Spanish device approximation. Completion clears speaking state. Devices without
speech synthesis receive an audio unavailable message. Static audio remains first.
Misleading OpenAI function/log names now describe generated speech.
OPENAI_API_KEY remains required for text-embedding-3-small.

Read-only Render queries for the two existing fallback warning strings returned
zero lines, including the October 29–November 5 interval. This does not establish
that fallback never fires: retention and available history limit the observation.
No user content was printed.

## Acceptance and execution

Agent-executed affected-flow QA uses the isolated worktree and a synthetic identity.
Borrowed localhost chamorro_rag is protected read-only; initialization writes are
disabled. No user/conversation records or production database are used.

| Scenario | Result |
| --- | --- |
| Selection/startup | Unit tests pass for defaults, independent overrides, empty/typo/whitespace aliases and missing provider keys. |
| Citations/cards | Source names, page suffixes, empty required fields, apostrophes/å copied from existing fixtures, and legitimate brackets are covered. |
| Practice | JSON parsing, empty Chamorro, rejected invented objective evidence and suppressed final scores pass. |
| Failures | Both endpoints and shared boundary tested for safe retry text and alerts; 402, timeout, generic SDK errors, malformed/empty/wrong-shape responses covered. |
| Regression sensitivity | New feature suite against pre-change runtime/main/token-manager sources: 15 fail/20 pass. Implemented suite: 35 pass. |
| Real calls | Three flashcard endpoint calls (greetings, food, numbers), three practice calls (meeting, food, directions), one synthetic English summary. Terra accepts JSON object output with reasoning none. No returned language was edited or graded. |
| Timing | Practice calls: 12.709, 3.369, 3.416 seconds; summary 2.093 seconds. All calls complete inside 45 seconds. |
| Retrieval | 172/172, zero errors, recall 122/131. No new embeddings/paid tutor calls. All 172 evidence, retained-evidence, query hashes and headwords/concepts match model-compare/r3/retrieval-only. |
| Browser | One incognito synthetic-fixture session at 390×844 and 1440×900. Admin offers only ElevenLabs v4/Multilingual v2; changing models preserves valid input choices. Live 503 recovers through device speech to idle; no horizontal overflow. Unsupported device speech is also unit-tested. |
| Repository gate | Serial scripts/check.sh passes: 1834 backend passes/40 environment skips; 140 web files/935 tests; lint, typecheck, canonical/content/routing checks, audio integrity and build budgets pass. Final-source rerun is recorded with the PR. |
| Content integrity | Audio manifests stay byte-identical and unchanged from base. No generated audio or Chamorro source content is modified. |

Paid checks reconcile from $15.935321919 to $15.927691919: **$0.007630**,
below $0.25 and above the $15 floor. OpenRouter posting lag underreported the
immediate process balances. The later balance includes initial flashcard calls.
The first process stopped on a fixture-field-name error after those three cards
requests; the resumed process ran only practice/summary, avoiding repeated spend.

Local inspectable evidence remains under
output/hafagpt-review-2026-11-03/eval/replace-models-free/ and
.../replace-models-live/, outside Git. No paid tutor run, real photo test, native
Chamorro review, ElevenLabs paid generation, production deploy or real-account
journey was performed. PostgreSQL integration fixtures remain among environment
skips. Component/hook browser QA does not prove production Clerk authentication
or audible pronunciation quality.

## Remaining names and rollback

[Full inventory](MODEL_NAME_INVENTORY_2026-11-05.json) maps every remaining model
spelling to its files across api/ and web/src/, including scripts, tests,
benchmarks, admin code, historical docs and manifest metadata. Generic family
words and dictionary false positives are excluded. Historical catalogs/prices
remain historical.

| Active name | Purpose |
| --- | --- |
| gpt-5.6-luna / openai/gpt-5.6-luna | Tutor/photos, explicit vision fallback and feature rollback. |
| gpt-6-luna / openai/gpt-6-luna | Flashcards and fixed summarization; optional feature alias. |
| gpt-6.1-terra / openai/gpt-6.1-terra | Practice default; optional feature alias. |
| text-embedding-3-small | Unchanged RAG embedding contract, corpus scripts and evaluator. |
| gpt-4o | Local tokenizer defaults only; historical benchmark/test fixtures. |
| sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (also unprefixed) | Existing opt-in local embedding contract/loader and document chunk tokenizer; cloud production embeddings remain text-embedding-3-small. |
| eleven_v4, eleven_multilingual_v2 | Admin candidates; Multilingual v2 live/batch default unless ElevenLabs env overrides. |
| tts-1 | Negative validation test and historical documents/metadata only. No generation route. |

Other code names live in historical evaluation/model_providers.py,
evaluation/compare_models.py, dated catalog/recommendation JSON, the standalone
legacy tests/chamorro-chatbot-3.0.py and synthetic runtime tests. They include
GPT-3.5/4/4.1, previous GPT-5.6 Terra/Sol, GPT-OSS, Gemini 1.5/2/2.5/3,
DeepSeek V3/V4/R1, Claude 3.5/3.7/4/4.5/5, Llama 3.1/3.2/3.3/4, Qwen
2.5/3/3.6–3.8, Mistral/Mixtral and Grok 4.5. The inventory lists every exact
alias/provider ID and file. Benchmark headers now explicitly mark this history.

Rollback either feature by setting its own alias to gpt-5.6-luna and restarting.
Leave CHAT_MODEL=gpt-5.6-luna to preserve photo routing. No environment change is
needed for deployment. A code rollback would restore retiring routes, so is not
the ongoing rollback strategy. The lead reviews/merges; the worker retains the
PR/worktree and cleans owned runtime resources.
