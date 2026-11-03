# Tutor quality v1 baseline — 2026-11-03

Production pipeline base: `93355d96de2365f40a37f712f65fd24e89858c8e` (`origin/main` at task start). Model: `gpt-5.6-luna` / `openai/gpt-5.6-luna`, through OpenRouter, with production generation settings. Corpus: `hafagpt_governed_openai_v3`, borrowed local `localhost/chamorro_rag`. The production tutor and retrieval modules are unchanged by this PR.

The suite has 150 anonymized/text-only cases. It measures behavior and retrieval, not Chamorro accuracy. Expected dictionary terms are local source attestations; none of the expected answers are agent-authored Chamorro sentences. GDOE-style requests are original English prompts inspired by the reported domains. Worksheet/photo coverage is text-only. Two qualified human reviews are deferred.

| Full-run metric | Baseline |
|---|---:|
| Completed / requested | 150 / 150 |
| Refusals on answerable cases | 44 / 146 (30.14%) |
| Expected-headword retrieval recall | 52 / 112 (46.43%) |
| Dictionary-lookup category recall | 38 / 40 (95.00%) |
| Cases with deterministic `must_not` signals | 13 |
| Signals by rule | 5 citation, 6 retraction, 1 unresolved abbreviation, 1 send-in-English |
| Raw translation-router misclassifications | 75 / 150 |
| Latency p50 / p95 | 3.421 / 12.690 seconds |
| OpenRouter-reported chat cost | $0.10081369 |
| Catalog-priced chat estimate | $0.10163740 |
| Initial embedding estimate | $0.00001452 |
| Usage missing / completion errors | 0 / 0 |

See `main-93355d9-full.summary.json` for counts, case IDs, per-category metrics and provenance. The original 149 responses predate per-case retrieval-warning instrumentation; the aggregate records that limitation instead of reporting zero degradation for the full run.

One full baseline produced 149 responses plus one pre-completion block: the production web router interpreted “find the main idea” as a web request. The final harness returns an unsuccessful web stub instead of raising; only that blocked case was retried. All 150 responses finished with `stop`. Existing successful responses were retained, then response heuristics were rescored without further model calls. The checker normalizes Markdown emphasis and curly apostrophes for matching only; raw output bytes remain intact. Thirteen `must_not` signals are triage flags, not thirteen confirmed native-language defects. Same-line citation checks can flag an answer that cites a source elsewhere.

No live web search ran. This deliberately measures the production fallback when web search is unavailable, including the current behavior that can suppress vector retrieval. The optional LLM judge was not run.

The first full pass verified 53 direct read-only connections, guarded 190 SQLAlchemy statements as SELECT/SHOW only, and disabled PGVector setup writes. The recovered case verified two additional direct connections. All 150 conversation-log calls were stubbed; fixture histories were supplied in memory. During validation, the harness was strengthened to enforce server read-only mode for both psycopg and psycopg2 (SQLAlchemy can choose psycopg2 for a bare Postgres URL). The final free run uses that protection and records both drivers in its audit. There were no blocked write statements, migrations, seeds, database starts or resets.

The final cache-only baseline completed 150/150 cases with no completion calls, new embeddings, cache blocks or harness errors. Expected-headword recall was 51/112 (45.54%); raw router misses were 75/150. Latency p50/p95 was 3.937/12.018 seconds. It recorded 45 cases with production retrieval warnings. Response/refusal checks are not scored in this mode. Its audit verified 91 read-only connections across both drivers, guarded 212 SQLAlchemy SELECT/SHOW statements, and blocked no write statements. Cost: $0. See `main-93355d9-retrieval.summary.json`.

Validation and limits:

- Agent-executed CLI QA: source validation, production-path baseline, cached free baseline, blind packet export and offline safety tests. No UI behavior changed; browser/device QA is outside this task.
- The first repository gate passed: 897 backend tests and 785 web tests, plus content/source routing, lint, typecheck and build.
- A later credentialed gate hit three existing live-RAG statement-timeout failures: `tests/test_system.py::test_live_rag_retrieves_context`, `test_live_rag_retrieves_source_backed_water_variants`, and `test_live_rag_retrieves_pdn_for_pdn_specific_query`. All three reproduced serially with read-only connections on files byte-identical to `origin/main` (`git diff --exit-code` against the base was clean for those tests and their retrieval modules). That reproduction verified eight read-only connections and guarded eight SQLAlchemy reads. This is a shared/local DB limitation, not fixed in this evaluation PR.
- Final offline gate passed with live DB/provider credentials disabled: 896 backend tests passed, 34 credential-dependent skips, all 14 harness tests passed, 126 web test files / 785 tests passed, lint/typecheck/build/PWA/bundle checks passed, source routing 33/33. Pytest was serial; Vitest was limited to one worker via VITEST_MAX_FORKS/MIN_FORKS and VITEST_MAX_THREADS/MIN_THREADS=1. The current credentialed live-RAG failure remains documented above.
- The local DB and machine were heavily loaded. Production retrieval timeouts are part of observed recall/latency, and the full and free samples may retain different evidence. Repeat comparisons under similar conditions. The all-case recall includes natural phrasing and follow-ups; explicit dictionary wrappers alone retrieved 38/40 expected concepts in the full run.

Local, ignored evidence for the parent: `results/local/main-full-final/cases.jsonl`, `blind_human_review.csv`, and the separate `blind_review_key.json`; `results/local/main-free-final/` holds the free run. Do not give reviewers the key. Raw outputs/packets remain in this named worktree and are not committed. Only safe aggregate summaries and anonymized fixtures are committed.
