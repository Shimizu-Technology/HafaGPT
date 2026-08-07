# HåfaGPT Modernization Roadmap — 2026

**Goal:** make HåfaGPT a trustworthy, maintainable, family-centered Chamorro learning platform without destabilizing the existing product or coupling API/web deployment.

## Principles

- Language accuracy outranks feature volume.
- Native-speaker/educator approval outranks model confidence.
- Protect family conversations and uploaded documents by default.
- Change one risky system at a time with rollback.
- Keep `api/` and `web/` independently deployable.
- Every phase has measurable exit criteria.
- Do not combine dependency, framework, architecture, model, and visual migrations in one release.

## Phase 0 — establish a trustworthy baseline

**Status:** completed for the repository/direct-model baseline; human review and
integrated finalist validation move to Phase 2.

| Work | Outcome | Exit criterion |
|---|---|---|
| Repair legacy system tests | Failures can no longer be reported as passes | backend reports assertion-based pass/skip/fail |
| Run repository validation | Known baseline for API, content, lint, type, build | report saved in documentation |
| Add model benchmark v2 | Reproducible source-grounded comparison | cases/catalog validate and artifacts are private/ignored |
| Inventory live behavior | Production claims match observed state | promo, privacy, signed-out flows documented |
| Capture dependency/security baseline | Remediation is measurable | npm/pip/Bandit findings recorded and triaged |

Completed after the initial review:

- restored a safe local development environment and 44,865-chunk RAG database;
- repaired PostgreSQL 16/pgvector 0.8.1 compatibility;
- ran all 192 direct-model calls and preserved the blind-review artifacts;
- exposed a failing PDN-specific retrieval gate.

Remaining transition item: schedule two native-speaker/educator reviewers.

## Phase 1 — close immediate trust and security gaps

**Target:** 1–2 focused weeks
**Release style:** small independent pull requests with preview/staging validation

1. Patch React Router/DOM to a non-vulnerable release and rerun the web suite.
2. Validate Clerk `azp`/authorized parties, issuer, time claims, and audience policy; add forged/incorrect-origin token tests.
3. Mask all chat/user/model text in PostHog replay or disable replay on sensitive routes; verify with an actual recording.
4. Update the privacy policy and processor inventory; document retention/deletion and child/family handling.
5. End or rename the year-long Christmas promo; make theme activation bounded and independent from entitlements.
6. Add timeouts to ElevenLabs and audit every outbound HTTP request.
7. Split `requirements.txt` into production and tool-specific groups, then remove unused runtime packages.
8. Reconcile Alembic history with actual local/production schemas using backups and
   explicit schema diffs; stop application code from silently creating migration-owned tables.
9. Repair the Clerk development initialization path without using production keys
   on localhost, then add an authenticated browser smoke test.
10. Add dependency scanning to CI with a documented review/exception process.
11. Harden uploads: streaming limits, magic-byte validation, private objects, signed URLs, deletion, and redacted logging.

**Exit criteria:**

- no known high-severity npm production finding without an approved exception;
- Clerk negative-token tests pass;
- replay evidence shows chat content redacted;
- privacy policy accurately names active processors and controls;
- seasonal theme is appropriate on the current Guam date;
- production requirements contain only runtime-needed packages;
- upload threat tests pass.

## Phase 2 — make and deploy the model decision properly

**Target:** 1–2 weeks after Phase 1 controls
**Dependency:** qualified reviewers, retrieval repair, and a protected finalist-evaluation path

1. ~~Run a three-case smoke across all eight models.~~ Completed.
2. ~~Diagnose contract/adapter failures without changing first-comparison prompts.~~ Completed; fixed evaluator normalization and Gemini budget diagnosis.
3. ~~Run all 24 grounded cases across all eight models and one lower GPT-5.6 reasoning effort.~~ Completed: 192/192 primary plus 72/72 treatment calls.
4. Complete blind review with two reviewers and adjudicate critical errors.
5. Rebuild the corpus behind the now-enforced source registry, add retrieval traces
   and at least 100 representative integrated RAG cases, then run the control,
   Terra, Luna, and Claude finalists.
6. Run Gemini separately on images/documents with an explicit reasoning/output budget.
7. Calculate cost at realistic low/base/high monthly usage, including reasoning tokens and retries.
8. Decide whether one model or role-based routing is justified.
9. Add data-driven model configuration, startup ID validation, returned-provider logging, feature flags, and rollback.
10. Shadow, then canary, then promote only after gates pass.

**Exit criteria:**

- decision record includes raw artifact hashes, reviewer counts, quality/latency/cost by workload, and rejected alternatives;
- zero adjudicated critical errors for the selected role;
- canary meets latency/error/cost budgets;
- control rollback is tested;
- old model comments and switching documentation are replaced with measured current results.

## Phase 3 — improve engineering structure and delivery confidence

**Target:** 2–4 weeks, incremental

### API

- Extract FastAPI routers for auth/users, chat, dictionary/content, learning/progress, games, uploads/audio, usage/billing, and admin.
- Introduce service/repository boundaries around SQL and an application-managed PostgreSQL pool.
- Replace worker-local rate limiting and correctness-sensitive cache state with shared infrastructure or database enforcement.
- Version the tutor prompt and retrieval configuration; log hashes rather than private contents.
- Add structured errors, request IDs, provider/RAG metrics, and timeout budgets.
- Move migrations out of the build command and adopt the supported Uvicorn worker package/process setup.

### Web

- Add Vitest/Testing Library and Playwright critical-flow coverage.
- Lazy-load route pages and games; set JavaScript/CSS/precache budgets in CI.
- Lazy/conditionally load PostHog after consent/configuration; the configured build
  is 1.98 MB minified versus 635 KB in the earlier credential-free measurement.
- Remove confirmed-unused Supabase package and Workbox rule.
- Audit PWA caching so authenticated/personalized responses are never served stale to another context.
- Consolidate API clients, error states, skeletons, and empty states.

**Exit criteria:**

- no single API composition file remains a multi-domain 8,000-line bottleneck;
- database connections are pooled and measured;
- critical frontend flows run in CI;
- main initial bundle is below an agreed budget, initially 500 KB minified and then tightened using real performance data;
- rollback/deploy/migration procedures are documented and exercised.

## Phase 4 — build the family learning loop

**Target:** 3–6 weeks after trust foundations

1. Make “Continue today's lesson” the primary home action.
2. Build a 5–10 minute daily sequence: spaced review, one concept, listening/speaking, a connected game, and a recap.
3. Tie all games and quizzes to the canonical curriculum and learner mastery state.
4. Add optional household profiles with clear privacy separation; do not expose conversation contents to caregivers by default.
5. Add shared family decks/challenges and progress summaries based on learning events, not chat surveillance.
6. Add a language-issue report flow linked to the exact content/model/source version.
7. Show source-backed, needs-review, and native-reviewed status where it helps learners understand confidence.
8. Prioritize native audio collection/review for the daily path and most-used terms.

**Suggested success metrics:**

- weekly learners completing at least three daily sessions;
- day-7 and day-30 retained learners;
- lesson-to-practice completion rate;
- delayed recall improvement by canonical term;
- percentage of core-path content native-reviewed;
- language issue rate and median time to review;
- family accounts with two or more active learner profiles, once the feature exists.

Do not optimize only for chat messages, minutes, or streak length; those can rise without learning.

## Phase 5 — cohesive design and current foundations

1. Simplify information architecture around Today, Learn, Practice, Family, and Profile/Admin.
2. Establish a calmer Chamorro visual language with fewer decorative emoji, consistent icons, and bounded seasonal campaigns.
3. Complete WCAG-oriented keyboard, screen-reader, contrast, focus, target-size, and reduced-motion testing.
4. Upgrade React/Router, then Vite, then Tailwind in separate measured changes.
5. Add performance budgets based on real Guam/mobile network traces.
6. Create contributor/reviewer workflows for community language experts without exposing administration broadly.

**Exit criteria:**

- usability tests with children, adult learners, and elders can complete the daily loop without guidance;
- accessibility checks and manual keyboard/screen-reader scenarios pass;
- each framework migration has its own regression evidence and rollback point;
- product copy clearly distinguishes free account, beta, premium, and promotions.

## Recommended first backlog

| Order | Work item | Why first | Size |
|---:|---|---|---:|
| 1 | Patch React Router high advisory | known production security issue | S |
| 2 | Correct promo/theme and access copy | visible production confusion | S |
| 3 | Lock Clerk authorized parties and tests | authentication boundary | M |
| 4 | Mask/disable replay on sensitive routes | family conversation privacy | S–M |
| 5 | Update privacy/processor documentation | current policy mismatch | M + legal review |
| 6 | Split Python runtime/tool dependencies | reduces 38-package advisory surface | M–L |
| 7 | Complete blind native review | required language-quality gate; direct benchmark is complete | M |
| 8 | Reconcile Alembic/schema drift | local upgrades currently stop on duplicate objects | M–L |
| 9 | Repair Clerk local initialization and add an auth smoke | authenticated UI validation is currently blocked | M |
| 10 | Rebuild the governed corpus and add retrieval traces | Phase 0 contains sources but the legacy corpus is 66.89% redundant | L |
| 11 | Add integrated RAG finalist evaluation | measures the real application | L |
| 12 | Add frontend critical-flow tests | enables safe cleanup/upgrades | M |
| 13 | Lazy-load routes/games and remove Supabase leftovers | performance and clarity | M |
| 14 | Begin API router/pool extraction | long-term maintainability | L, incremental |

## Decision records to create

- model/routing decision and rollback plan;
- language source and native-review governance;
- family profile/privacy boundaries;
- upload retention and object access;
- analytics/replay data policy;
- production dependency boundaries;
- migration/release process;
- PWA offline caching policy.

## What not to do

- Do not choose a model from vendor benchmarks or the old keyword percentage.
- Do not allow model output to become canonical language content automatically.
- Do not run a React/Vite/Tailwind/API architecture rewrite as one project.
- Do not add family dashboards until private conversation boundaries are explicit.
- Do not interpret passing lint/build checks as frontend behavioral coverage.
- Do not optimize engagement at the expense of learning outcomes or cultural trust.
