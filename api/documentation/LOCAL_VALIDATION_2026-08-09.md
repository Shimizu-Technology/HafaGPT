# Local Validation Report — 2026-08-09

## Decision

The Phase 1–2 modernization branch is suitable for code review and merge once
CI and Greptile approve the final commit. It is **not** evidence that a new chat
model is ready for production. Model promotion still requires the documented
blind-review, integrated-RAG, native-review, cost, latency, and rollback gates.

## Environment exercised

- API: FastAPI on `127.0.0.1:8000`.
- Web: Vite on `127.0.0.1:5185`.
- Ports `5173` and `5174` were already occupied, so no existing local process
  was stopped or replaced.
- Local PostgreSQL database: `chamorro_rag` on `localhost`.
- Clerk development keys, OpenAI embeddings, and the configured OpenRouter
  runtime model were loaded from ignored local environment files.
- No credential values, user records, or production exports were printed,
  written to documentation, or committed.

## Automated validation

Repository-wide `./scripts/check.sh`:

- API: 113 passed; four credential-dependent integration checks skipped in the
  credential-free repository command.
- Canonical vocabulary validation: passed.
- Canonical hardcoded-content audit: zero findings.
- Static audio manifest: 715 entries; API and web manifests match.
- Frontend ESLint: zero errors and ten pre-existing warnings.
- Frontend TypeScript check: passed.
- Frontend production/PWA build: passed.

Credential-backed integration run:

- Four of four live checks passed.
- Confirmed the local RAG database contains chunks.
- Confirmed OpenAI embedding-backed retrieval works.
- Confirmed a Pacific Daily News-specific query retrieves an eligible PDN
  source.
- Added and passed a relevance regression requiring `hånom` and `hånum` for an
  English-to-Chamorro water lookup.

## Browser and API coverage

The following public experiences were loaded locally:

- Home, chat shell, vocabulary list/search/category, curated story list,
  curated story reader, external-story containment state, pricing, about,
  privacy, and support.
- Learning, flashcards, quizzes, practice, games, dashboard, and settings were
  checked through their signed-out Clerk gates.
- Clerk's development sign-in modal opened correctly.
- Admin and authenticated API routes rejected unauthenticated requests.
- Health, CORS preflight, promo status, word of the day, vocabulary search,
  vocabulary category, generated quiz, generated flashcards, story
  availability, and eval-input validation returned the expected status.

A signed-in end-to-end browser run was not performed because no existing local
test session was available and creating an external Clerk user was outside this
validation's safe local scope. Authenticated behavior remains covered by the
repository tests and API authorization checks, but a reusable seeded Clerk test
account should be added to the future Playwright suite.

## Defects corrected during validation

### English dictionary retrieval

Production RAG assumed every dictionary chunk used the old
`**headword**` format and used case-sensitive source matching. The current local
collection also contains Chamoru.info `entry | meaning` tables and revised
dictionary `| English | Chamorro |` rows. As a result, a water lookup could pass
the old smoke test while retrieving unrelated pages.

The fix:

- recognizes all three governed dictionary formats;
- rejects footer/ad keyword noise;
- ranks direct meaning rows and revised-dictionary mappings;
- matches dictionary source paths case-insensitively;
- preserves explicit lookup intent when a request also mentions examples; and
- adds unit and live relevance regressions.

After the fix, the live DeepSeek path cited `hånom` from Chamoru.info and
`hånum` from the local revised dictionary snapshot instead of unrelated pages.

### Prompt-mode conflicts

The intermediate skill-level modifier asked for English explanations even in
Chamorro-only immersion mode. Generic skill-level modifiers are now excluded
from immersion mode in both streaming and non-streaming prompt paths. A live
retest remained in Chamorro.

Source-faithfulness and no-reference instructions now also tell the runtime not
to invent pronunciation, etymology, cultural/regional usage, or example claims
when governed evidence does not support them.

### Signed-out product copy

The learning path and settings fell through to a “Premium Feature” gate while
the same page promised the beta was free. They now use specific, free-beta
account-gate copy.

## Remaining findings

These findings are not reasons to bypass the Phase 1–2 governance work. They are
inputs to the next implementation phases:

1. **Current DeepSeek source faithfulness is not sufficient.** In a live
   “Håfa Adai” learning response it added an unsupported Guam/CNMI usage claim
   even though the returned dictionary snippets did not establish that claim.
   The current model should remain the control only; production promotion of a
   replacement must use the governed benchmark and human review.
2. **The legacy production corpus remains noisy.** Relevant evidence now wins
   direct water lookups, but the collection still contains duplicate pages,
   navigation text, and ad/footer material documented in the resource audit.
   Rebuilding the governed corpus with retrieval traces remains a priority.
3. **Some legacy dictionary examples need editorial review.** The vocabulary
   API contains entries where example-language fields appear reversed or where
   paired sentences do not align. These must go through source and native review,
   not blind automated rewriting.
4. **Authenticated browser coverage is incomplete.** Add seeded development
   identities and Playwright coverage for saved conversations, streaming chat,
   uploads, learning progress, flashcard review, quizzes, games, settings, and
   admin authorization.
5. **Frontend cleanup remains.** ESLint reports ten warnings, browser metadata
   packages are stale, and the main production JavaScript chunk is about 1.99 MB
   before gzip. Code splitting and dependency refresh belong in the modernization
   roadmap.

## Merge versus rollout

- **Merge gate for this branch:** repository checks green, live integration
  checks green, GitHub CI green, all actionable review threads resolved, and an
  explicit Greptile 5/5 on the final commit.
- **Model rollout gate:** separate decision; do not switch production merely
  because this branch merges.
- **Corpus rollout gate:** separate versioned collection with permission records,
  native review where required, retrieval-quality evidence, and rollback.
