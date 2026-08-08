# HåfaGPT Project Review — 2026

**Reviewed:** August 5, 2026 (Guam)

**Scope:** product purpose, production experience, monorepo architecture, language-content controls, tests, dependencies, security/privacy, AI model strategy, and modernization priorities
**Companion documents:** [MODEL_EVALUATION_2026.md](MODEL_EVALUATION_2026.md), [MODERNIZATION_ROADMAP_2026.md](MODERNIZATION_ROADMAP_2026.md), and [VALIDATION_REPORT_2026-08-05.md](VALIDATION_REPORT_2026-08-05.md)

## Executive conclusion

HåfaGPT is worth improving, not rebuilding. It already contains an unusually broad and thoughtful Chamorro learning product: a source-grounded AI tutor, 21 lessons, a large dictionary, flashcards, quizzes, stories, conversation practice, games, progress systems, administration, PWA support, and a recent canonical-language-content program. Its strongest strategic asset is not the current model or UI. It is the combination of curated Chamorro sources, retrieval behavior, learner-facing content, and the reason the project exists: making Chamorro learning more available to Leon's family and the wider community.

The application is functional, but the engineering and product layers have accumulated debt since the original build. The most important work is now:

1. make language quality measurable and human-governed;
2. close security and privacy gaps;
3. repair confidence in tests and dependency management;
4. select models using the actual HåfaGPT workload rather than old keyword scores;
5. simplify the application around a strong daily family learning loop;
6. modularize the codebase without breaking independent API/web deployment.

The right near-term strategy is a staged modernization. A framework rewrite or wholesale visual redesign would create risk without solving the core trust problem.

## What HåfaGPT is and why it exists

HåfaGPT is a family- and community-oriented Chamorro language learning platform. It was created because generic chat models and general translation tools are unreliable for a low-resource, accuracy-sensitive language, while the people who most need an approachable learning environment may not have easy access to structured instruction or all of the underlying dictionaries, lessons, stories, and cultural material.

The product brings those pieces together:

- a conversational tutor with English, learning, and Chamorro-immersion modes;
- a hybrid RAG knowledge base built from Chamorro dictionaries and educational/cultural sources;
- learner activities including flashcards, quizzes, stories, conversation practice, and games;
- progress features including XP, streaks, and a learning path;
- static vocabulary audio plus on-demand administrative audio generation;
- authentication, usage controls, administration, analytics, and installable PWA behavior.

The founding family use case should remain the product's filter: a learner should be able to open HåfaGPT, know what to do today, practice safely, and make visible progress with other members of the household. Community growth should extend that loop rather than turn the product into a generic AI chat wrapper.

## How the application works today

| Layer | Current implementation | Responsibility |
|---|---|---|
| Web | React 18, TypeScript, Vite 5, Tailwind 3, Clerk, React Query | Pages, learning activities, chat, progress, admin, PWA |
| API | Python 3.12, FastAPI, Alembic | Authentication, chat orchestration, content APIs, progress, usage, admin, uploads |
| Primary data | PostgreSQL/Neon and PGVector | Users/activity data, site settings, conversations, RAG embeddings |
| AI routing | OpenAI-compatible clients, OpenAI direct and OpenRouter | Tutor responses and vision fallback |
| Retrieval | exact/keyword/semantic retrieval plus source re-ranking | Grounds tutor responses in project sources |
| Files/audio | S3 and static manifests | Uploads and pronunciation/audio delivery |
| Operations | Render API, Netlify web, Clerk, PostHog | Hosting, identity, analytics/session replay |

The normal chat flow is:

1. the React client obtains a Clerk token and sends a message to FastAPI;
2. the API chooses a mode prompt, skill-level modifier, and optional web search;
3. hybrid RAG retrieves and re-ranks Chamorro references;
4. conversation history, current input, and optional images/documents are assembled;
5. the configured model generates the answer;
6. the response, sources, usage, and timing are returned and may be logged.

This is a sound basic design. The weakness is that model selection and evaluation have historically tested raw model answers with a different prompt, not the complete production retrieval-and-prompt pipeline.

## What is working well

### Product breadth with real educational intent

The platform is much more than chat. The signed-out production home page clearly exposes lessons, chat, games, quizzes, flashcards, dictionary, stories, and practice. The mobile layout did not show obvious horizontal overflow at 390×844 in the review. Production emitted no browser console errors during the inspected flows.

### A promising source-grounding strategy with a corpus blocker

The RAG implementation combines query-type detection, exact/keyword/semantic matching, normalization for diacritics, source-aware behavior, and re-ranking. Single-word prompts explicitly instruct the model to use dictionary sources and not guess. For a low-resource language, this source system is more strategically important than any single provider model.

The August 7 source audit found that the implementation should not yet be described
as a defensible production corpus: 30,010 of 44,865 rows are redundant exact
duplicates, 90.3% of rows come from Chamoru.info, required rights/provenance fields
are absent, and several source roles are misranked. The detailed correction and
remediation plan is in
[LANGUAGE_RESOURCE_AUDIT_2026-08-07.md](LANGUAGE_RESOURCE_AUDIT_2026-08-07.md).

### Recent canonical content work

The repository now has a versioned canonical vocabulary schema, source citations, review status, confidence, variants, deprecated terms, and category-by-category correction documentation. Automated validation currently reports:

- canonical vocabulary valid;
- zero current app-to-canonical usage findings;
- static API/web audio manifests synchronized at 715 entries.

This is excellent infrastructure. However, “zero usage findings” means app surfaces conform to the current canonical layer; it does **not** mean every language item has been approved by a native speaker. The audit still contains medium-confidence and review-needed material.

### Independent deployment and recent operational maintenance

The July 2026 monorepo consolidation retained separate `api/` and `web/` deployments. Recent work also corrected Guam-date behavior and removed synthetic idle compute. Those are signs the project can be modernized incrementally.

## Findings that are legitimate and actionable

### P0 — language quality needs a real release gate

The existing comparison framework is not strong enough to select a model:

- it tests raw models rather than the production HåfaGPT RAG prompt;
- its own system prompt injects language claims before testing the model;
- “accuracy” can pass when any one normalized keyword appears;
- normalization hides orthography errors;
- it stores only short response previews in some reports;
- its pricing and model registry were frozen in December 2025;
- it ranks a winner without native-speaker review.

Historical percentages such as “93% accuracy” should therefore be treated as obsolete smoke-test results, not evidence that one model understands Chamorro better.

**Action:** the new source-grounded matrix is complete. Finish blinded native-speaker/educator review, repair the failing source-aware retrieval gate, and then run the integrated finalist comparison. No model should be promoted from automated scores alone.

The corpus must be cleaned and rights-cleared before that integrated comparison.
Otherwise the evaluation will measure how models react to duplicated, misclassified,
or unauthorized context rather than which model is best for HåfaGPT.

### P0 — authentication validation is incomplete

`_decode_clerk_token()` verifies the RS256 signature but explicitly sets `verify_aud` to false and does not enforce Clerk's `azp` authorized-party claim. Clerk's current manual verification guidance recommends checking authorized parties and warns that omitting this can enable CSRF-style abuse.

**Action:** configure allowed frontend origins, validate `azp`, issuer, time claims, and audience when the project uses one; add negative-token tests before deployment. Prefer the maintained Clerk verification helper if it cleanly supports FastAPI.

### P0 — dependency security debt is larger than the old review indicated

Current scans found:

- `npm audit --omit=dev`: 2 high findings through React Router/React Router DOM, with a fix available;
- `pip-audit`: 236 advisory records across 38 pinned Python packages;
- Bandit: 22 findings (1 high, 17 medium, 4 low), most of which require triage rather than blind changes.

The Python number is not “236 exploitable production bugs.” It is inflated by duplicate advisories and by a single requirements file that mixes the web API with crawlers, document processing, Chroma, LangChain/LangGraph, evaluation, and other tooling. That packaging is itself the actionable problem: the deploy installs a broad attack and maintenance surface it may not need.

**Action:** patch React Router immediately; split production, crawler/importer, audio, development, and evaluation dependencies; remove unused packages; regenerate and test pinned locks; add `pip-audit` and `npm audit` policies to CI with an explicit reviewed allowlist.

### P0 — chat privacy controls and the policy do not match the application

The December 24, 2025 production privacy policy lists Clerk, OpenAI/DeepSeek, Stripe, and S3, but the application also uses or can use OpenRouter, Google/Gemini, ElevenLabs, PostHog, Neon/PostgreSQL, Render, and Netlify. The policy does not accurately describe current model routing, analytics/session replay, retention, deletion, or children/family usage.

PostHog masks inputs, but normal text is only masked when an element has `data-private`. PostHog's current documentation says general text is not masked by default. Rendered user/model chat text can therefore be recorded unless every relevant element is correctly marked.

**Action:** disable replay on chat/auth/admin until verified, or default to `maskTextSelector: "*"` and selectively expose safe text. Inventory every processor and data category; update consent, retention, deletion, contact, and child/family sections. Obtain legal review before presenting the policy as complete.

### P0 — file handling needs production hardening

Uploads are read fully into memory, rely heavily on supplied MIME type, and produce public S3 URLs. Generated or uploaded family documents may contain personal or sensitive material.

**Action:** enforce streaming size limits, inspect file signatures, reject ambiguous formats, use private objects with short-lived signed URLs, scan where practical, delete temporary files reliably, and define retention. Keep model/document-analysis logs free of document contents by default.

### P1 — the test suite previously overstated confidence

Before this review, the normal repository check ignored `tests/test_system.py`. Running all tests under pytest showed 56 passes, but eight “tests” returned booleans rather than asserting, so pytest warned and counted failures as passes. Executing that file directly passed only 1 of 8 because it referenced obsolete pre-monorepo paths and modules.

This review replaced it with assertion-based current smoke tests and explicit live-infrastructure skips. After adding benchmark regression coverage, the backend now reports `64 passed, 3 skipped` in the credential-free repository check. The live run separately records two integration passes and one PDN-specific retrieval failure.

**Action:** keep unit tests credential-free, run live RAG tests in a protected staging workflow, and never exclude a broken system-test file from CI without a tracked reason.

### P1 — no frontend behavior tests

The React application contains roughly 40,000 lines of TypeScript/TSX and no `*.test.*` or `*.spec.*` files. Lint, type checking, and builds are useful but cannot catch broken signup, chat, audio, game, progress, and admin flows.

**Action:** add Vitest/Testing Library for components and Playwright for a small critical-flow suite. Start with signed-out navigation, Clerk-protected routes, chat submit/cancel, lesson completion, quiz scoring, audio fallback, promo state, and one mobile flow.

### P1 — production seasonal and pricing state is confusing

On August 5, production returned:

```json
{"active":true,"end_date":"2026-12-31","message":"Felis Påsgua! Holiday Gift: Unlimited Access!","theme":"christmas"}
```

That produces Christmas snow and tree branding in August. The API also returns a theme independently of whether a promotion is active, so an expired promo can leave stale seasonal styling. Public copy simultaneously says “Start Learning Free,” “Free during beta,” “Premium Feature,” “Sign up to unlock,” and “100% free,” which blurs authentication, beta access, and paid entitlement.

**Action:** separate `theme_active` from promo entitlements, automatically fall back to the Chamorro/default theme outside a bounded period, and define one truthful access/pricing message across home, protected routes, and pricing.

### P1 — backend responsibilities are too concentrated

`api/api/main.py` is 8,711 lines with roughly 80 routes. `chatbot_service.py` is 1,789 lines. Database connections are opened directly in many paths, rate limiting is in process memory, and site settings use process-local caching. With three workers, worker-local limits/cache are not a single source of truth.

**Action:** extract routers by domain, move SQL into services/repositories, introduce an application-managed pool, use shared rate limiting where limits matter, and add request IDs plus model/RAG metrics. Do this route-by-route with compatibility tests, not as a rewrite.

### P1 — frontend delivery and PWA caching need cleanup

The build passes, but the main JavaScript chunk is about 635 KB minified (193 KB gzip), above Vite's 500 KB warning. All major pages/games are statically imported. The PWA precache is about 1.9 MB. The config also caches Supabase traffic and ships `@supabase/supabase-js`, although the current architecture uses the FastAPI/Neon backend and no frontend Supabase imports were found.

**Action:** remove the unused dependency/cache rule after confirming production, lazy-load routes and games, add bundle budgets, audit offline behavior for personalized data, and avoid caching authenticated API responses.

### P1 — deployment and request behavior contain aging patterns

Render runs Alembic migrations in the build command and starts Gunicorn with `uvicorn.workers.UvicornWorker`. Uvicorn now documents that `uvicorn.workers` is deprecated in favor of the separate `uvicorn-worker` package. Migrations coupled to every build can also make deploy rollback and multi-instance behavior harder to reason about. ElevenLabs audio regeneration has an outbound request without a timeout.

**Action:** move migrations to an explicit release/predeploy step with rollback discipline, adopt the supported worker package or a tested current process model, and give every outbound request a finite connect/read timeout and retry policy.

### P1 — current prompt/model configuration is stale and too global

The comments still label Gemini 2.5 Flash as the recommended model based on the invalid old evaluation. The registry contains preview/stale model IDs. One global model is selected at module import, with a separate fixed vision fallback. This makes safe per-task routing, experiments, and rollback harder.

**Action:** make model configuration data-driven; validate configured IDs at startup; support task roles (`core_tutor`, `fast_practice`, `vision`, `hard_case`); record returned provider/model; and gate changes with eval results and feature flags.

### P2 — framework versions are behind, but upgrades are not the first move

The web is on React 18/Vite 5/Tailwind 3 while current major generations are React 19.2, Vite 8, and Tailwind 4.3. These newer versions contain useful capabilities, but Vite 8 changes the bundler to Rolldown and Tailwind 4 moves heavily toward CSS-first configuration. A simultaneous upgrade would create unnecessary debugging ambiguity.

**Action:** first patch security-compatible versions and add frontend tests. Then upgrade one axis at a time: React/Router, Vite, and Tailwind. Treat Tailwind as a design-system migration, not routine package maintenance.

## Better product direction for families

The strongest product improvement is a clearer recurring learning loop:

1. **Today:** one 5–10 minute plan combining review, one new concept, listening/speaking, and a small game;
2. **Practice:** tutor, vocabulary, and activities all use the learner's current lesson and reviewed content;
3. **Reflect:** show what was learned, what needs review, and tomorrow's next step;
4. **Family:** optional household profiles, shared goals/decks, age-appropriate settings, and caregiver progress without exposing private conversations;
5. **Community trust:** visible source/review badges, report-a-language-issue flow, native-review status, and acknowledgements for contributors.

Recommended product priorities:

- replace a broad feature grid with a prominent “Continue learning” action;
- add family profiles and shared household challenges only after privacy boundaries are designed;
- make native-speaker audio/review a first-class status, not an implied guarantee;
- connect every game to the canonical learning path and spaced repetition;
- simplify emoji density and seasonal decoration in favor of a consistent Chamorro visual system;
- design for children and elders: larger targets, calm motion, readable contrast, keyboard/screen-reader coverage, and reduced-motion support;
- collect structured feedback on answer correctness and learning usefulness, not just generic engagement.

## Corrections and nuances from the first review

- `deepseek/deepseek-chat` is still available through OpenRouter as of this review. The concern is staleness and ambiguous legacy naming, not that the configured OpenRouter ID is currently unavailable.
- “Zero canonical usage findings” verifies consistency against the current canonical layer; it is not equivalent to complete native review.
- The repository's ordinary test command passed, but it excluded a stale system suite. The repaired result is now explicit.
- The 236 Python advisory records need urgent dependency work, but should not be represented as 236 independently exploitable production vulnerabilities.
- The Christmas state is not merely dormant code: the production API actively enables it through December 31, 2026.

## External references used for this review

- [OpenAI GPT-5.6 Sol migration guidance](https://developers.openai.com/api/docs/guides/upgrading-to-gpt-5p6-sol.md)
- [OpenAI GPT-5.6 prompting guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6.md)
- [OpenRouter API reference](https://openrouter.ai/docs/api_reference/overview)
- [Clerk manual JWT verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification)
- [PostHog session-replay privacy controls](https://posthog.com/docs/session-replay/privacy)
- [React 19.2 announcement](https://react.dev/blog/2025/10/01/react-19-2)
- [Vite 8 announcement and migration notes](https://vite.dev/blog/announcing-vite8)
- [Tailwind CSS v4 overview](https://tailwindcss.com/blog/tailwindcss-v4)
- [Uvicorn deployment deprecation notice](https://www.uvicorn.org/deployment/)
- [React Router advisory GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)

## Final assessment

HåfaGPT has a credible core and a meaningful reason to exist. Its next stage should be trust-driven: demonstrably grounded language answers, honest review status, protected family data, dependable tests, and a daily learning experience people want to return to. The modernization roadmap converts that into sequenced work with measurable exit criteria.
