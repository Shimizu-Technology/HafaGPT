# HåfaGPT Validation Report — August 5, 2026

This report records what was actually run during the re-review and the subsequent
credential/environment recovery. It separates completed evidence from remaining
human and application-level gates.

## Repository validation

### Before repairing the legacy system suite

| Command/check | Result |
|---|---|
| `./scripts/check.sh` | Passed |
| Backend unit suite used by the script | 48 passed |
| Canonical vocabulary validation | Passed |
| Canonical usage audit | 0 findings |
| Static audio manifest verification | Passed, 715 entries synchronized |
| ESLint | Passed with 10 warnings |
| TypeScript type check | Passed |
| Vite production build | Passed |
| Main JS bundle | 635.12 KB minified / 193.19 KB gzip without restored local analytics settings |
| Main CSS | 156.98 KB |
| PWA precache | 1,931.69 KiB |

Running `pytest -q tests` appeared to report 56 passes plus eight warnings. Each warning said a `test_system.py` test returned a value instead of asserting. Running that file as its original standalone script produced only 1/8 passes because it expected obsolete modules/files such as `manage_rag_db`, `chamorro_rag`, `rag_metadata.json`, `chamorro-chatbot-3.0.py`, and a root `web_search_tool.py`.

### After repair

`tests/test_system.py` now uses current monorepo paths, real assertions, and explicit skips for live services. CI and `scripts/check.sh` no longer ignore the file. New tests also validate the model benchmark's canonical references, scoring separation, contraction handling, percentile reporting, contract failures, and provider-reported cost.

```text
The earlier credential-free baseline was 58 passed and 3 skipped. After the
benchmark reporting additions, the final repository-wide result is recorded at the
end of this document.
```

The skips are intentional and visible:

- live RAG database chunk check;
- live RAG retrieval check;
- live RAG source-priority check.

They require `DATABASE_URL` and `OPENAI_API_KEY`. They should run in a protected staging/integration workflow rather than silently falling back in ordinary unit CI.

## Model benchmark validation

| Check | Result |
|---|---|
| Case/catalog offline validation | Passed: 24 cases, 8 models |
| OpenRouter public availability check | Passed: all 8 IDs present |
| Full model API matrix | Passed: 192/192 primary calls plus 72/72 GPT-5.6 low-effort treatment calls |
| Automated response contracts | 191/192; Gemini truncated one structured response |
| Evaluation self-tests | Passed: 7 tests |
| Local RAG database | Passed: 44,865 chunks |
| Basic live retrieval | Passed: `Håfa Adai` returned context and sources |
| PDN-specific retrieval | Failed: top five were Guampedia despite 188 PDN chunks |
| Blind human review | Worksheet/key generated; qualified review pending |

The complete quantitative table, artifact hashes, routing providers, evaluator fix,
and provisional shortlist are in `MODEL_BENCHMARK_RESULTS_2026-08-05.md`.

## Local environment recovery

- `api/.env` and `web/.env.local` were restored as ignored, mode-600 files.
- Backend authentication uses the HåfaGPT **development** Clerk secret; the frontend
  uses its matching development publishable key.
- The API uses local `postgresql://localhost/chamorro_rag`, not the obsolete remote
  URL or the production database.
- OpenAI, OpenRouter, and Clerk credentials were authenticated without printing
  their values.
- Netlify's public PostHog variables were restored; the local frontend targets
  `http://localhost:8000`.
- PostgreSQL 16's missing pgvector 0.8.1 library was rebuilt from the matching
  upstream tag. A vector-distance query now executes successfully.

No secret file is tracked by Git, and no credential value appears in this report.

## Security and dependency evidence

### JavaScript

`npm audit --omit=dev` reported two high findings:

- `react-router`;
- `react-router-dom` through `react-router`.

The advisory is [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2), and npm reports a fix is available.

### Python

`pip-audit -r api/requirements.txt --no-deps` reported 236 advisory records across 38 pinned packages. This includes packages such as aiohttp, chromadb, crawl4ai, cryptography, LangChain/LangGraph packages, LiteLLM, lxml, NLTK, Pillow, PyJWT, pypdf/PyPDF2, python-multipart, Starlette, and urllib3.

Interpretation: this is a high-priority remediation baseline, not proof of 236 reachable exploits. The requirement set mixes production API and offline/tooling dependencies, duplicates advisory paths, and needs reachability/version triage.

### Static security scan

Bandit reported 22 findings: 1 high, 17 medium, and 4 low.

- The high MD5 finding is deterministic word-of-day selection, not security hashing; replace with SHA-256 or annotate `usedforsecurity=False` after review.
- Several SQL warnings involve validated allowlists or dynamic placeholder counts; they are likely false positives but should be rewritten/annotated so the invariant is testable.
- The ElevenLabs admin regeneration request has no timeout and is actionable.
- `ffmpeg` calls use controlled temporary paths/admin flows but still deserve explicit argument and size tests.
- an offline Hugging Face `from_pretrained` call should pin a revision.

No real hardcoded credential was found in the reviewed repository search. Example placeholders and local database examples remain acceptable.

## Production inspection

### Live web

- Home loaded and exposed the expected learning feature set.
- No console errors or warnings appeared during inspected signed-out flows.
- The inspected 390×844 mobile viewport did not show obvious horizontal overflow.
- `/learning` showed “Premium Feature,” “Sign up to unlock,” and “100% free,” while home used “Start Learning Free”/beta messaging.
- Christmas snowfall/tree branding was active in August.

### Live promo endpoint

`GET /api/promo/status` returned:

```json
{"active":true,"end_date":"2026-12-31","message":"Felis Påsgua! Holiday Gift: Unlimited Access!","theme":"christmas"}
```

### Privacy page

The page was last updated December 24, 2025 and did not fully describe the current processor stack or replay behavior. This is a documentation/compliance gap, not a legal conclusion.

## Known non-blocking warnings

- ESLint has 10 React Hooks/Fast Refresh warnings.
- With the restored PostHog variables, Vite reports the main chunk at 1,981.57 KB
  minified / 503.08 KB gzip. The earlier credential-free build was only 635.12 KB /
  193.19 KB gzip, so it materially understated the production-like analytics path.
  `posthog-js` is statically imported by `src/main.tsx`; measure a lazy/conditional
  import and verify replay privacy at the same time.
- browser compatibility datasets used in the build are stale.
- the frontend has no component or end-to-end behavior tests.
- large files include `api/main.py` (8,711 lines), `chatbot_service.py` (1,789), `Chat.tsx` (1,309), and several 700–850 line games/components.

## Evidence boundary

Completed checks establish that the current code builds and its credential-free backend/content tests pass. They do not establish:

- native-level Chamorro correctness;
- production RAG/database health;
- correctness of every authenticated flow;
- upload security under adversarial files;
- accessibility conformance;
- a winning AI model.

Those items are explicit work in the roadmap rather than implied by a green build.

## Final verification after environment/model work

`./scripts/check.sh` completed successfully:

```text
64 passed, 3 skipped
canonical vocabulary: passed
canonical usage audit: 0 findings
audio manifests: synchronized, 715 entries
ESLint: 0 errors, 10 warnings
TypeScript: passed
Vite production build: passed
```

The three default skips are the explicitly marked live integration checks. Running
them with the recovered environment produced two passes and one deliberate failure:
the PDN-specific retrieval gate described above. A green credential-free suite and
a red live retrieval gate are both accurate; neither result should hide the other.

## August 7 Phase 0 addendum

- The source registry and runtime policy now contain the earlier retrieval failure:
  blocked and role-ineligible sources are removed before ranking. Deterministic
  retrieval tests prove Guampedia/Swarthmore containment and historical separation.
- The repeatable local audit maps all 44,865 chunks, with zero unregistered chunks,
  83 blocked legacy chunks, and 66.89% exact redundancy.
- `./scripts/check.sh` passed with 79 tests and 3 skips before the final retrieval
  tests were added; the branch's final verification supersedes this intermediate
  count.
- A fresh one-case provider smoke passed on all eight catalog models. It is not a
  new model-quality comparison and does not replace the prior full matrix or human
  review requirement.
- Live vector retrieval could not be rerun because OpenAI returned
  `insufficient_quota` for the embedding account. The local PostgreSQL connectivity
  check still passed.
- The Clerk dashboard confirms the ignored local publishable key matches the active
  HåfaGPT development instance, but Clerk fails to initialize in both local browser
  surfaces. Production keys were not substituted.
- The local schema has drifted from its Alembic version: the database records
  `49d9a91f7817`, while several later tables/columns already exist and the head is
  `j4k5l6m7n8o9`. The attempted upgrade rolled back on duplicate objects. Reconcile
  and back up this local database before stamping or rebuilding; do not copy this
  state into production.

## August 8 credit-restoration follow-up

- OpenAI embedding access was restored and all three protected live integration
  tests passed: local database connectivity, ordinary semantic retrieval, and the
  PDN-specific retrieval gate.
- Explicit source mentions now receive a registry-governed candidate lane before
  the general semantic pool. The lane still applies source rights, evidence-role,
  deduplication, and ranking policy. For the PDN integration question, all five
  returned references were PDN sources rather than dictionary fallbacks.
- The final repository-wide check passed with 84 tests and 3 expected live-service
  skips, plus canonical content checks, synchronized 715-entry audio manifests,
  lint with zero errors, type checking, and the production web build.
- OpenRouter credit and adapter health were already verified by the complete
  benchmark and the August 7 fresh smoke. The model-quality decision remains gated
  on corpus cleanup and blind native-speaker/educator review; restored credits do
  not change that evidence standard.
