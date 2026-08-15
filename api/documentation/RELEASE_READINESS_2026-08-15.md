# HåfaGPT Release Readiness — August 15, 2026

**Branch:** `codex/phase-1-2-modernization`
**Pull request:** [#5](https://github.com/Shimizu-Technology/HafaGPT/pull/5)
**Scope:** Phase 0 confirmation, immediate Phase 1 trust/security work, local
authenticated validation, and production read-only release inventory

## Decision

The owner approved a controlled rollout of GPT-5.6 Luna and private upload
storage. The repository is ready to return to pull-request review after CI and
Greptile evaluate the final commit. Production configuration must remain on the
current release until that merge gate is green.

The following reversible production safeguards were created before deployment:

1. A new S3 bucket, `hafagpt-private-uploads`, with ACLs disabled, all four public
   access blocks enabled, and SSE-S3 encryption.
2. A dedicated non-console IAM user, `hafagpt-api`, with an inline policy limited
   to object get/put/delete in that private bucket and audio writes under
   `s3://hafagpt/audio/`.
3. A permanent Neon child branch,
   `pre-luna-private-storage-2026-08-15`, forked from production before rollout.

The new code fails closed when private storage is absent: attachments can be used
for the current AI request but are not persisted. This prevents new private family
files from being written to the public bucket. It does not retroactively privatize
or delete legacy objects.

Per owner direction, the existing public S3 bucket and every existing object,
legacy upload reference, database record, IAM credential, and database branch were
left in place. No migration, deletion, reset, credential deactivation, payment
change, or Netlify billing action was performed.

The existing language-resource permission program is also not complete: the
governance ledger still records `0/22` external source families as approved for
`production_rag`. This branch does not add an external source or grant a new use;
the deterministic lookup lane uses dictionary snapshots already shipped by the
application. Public expansion or a “fully licensed corpus” claim remains blocked
until the permission evidence and registry grants documented in
[`LANGUAGE_RESOURCE_AUDIT_2026-08-07.md`](LANGUAGE_RESOURCE_AUDIT_2026-08-07.md)
are complete.

## What changed

### Authentication

- Clerk session tokens remain RS256-only and use cached JWKS with key-rotation
  refresh behavior.
- Tokens must contain an `azp` value matching an exact authorized browser origin.
- Missing and wrong-origin `azp` values fail closed.
- `CLERK_ISSUER` enables exact issuer validation and is recommended in production.
- A wildcard CORS value is never accepted as an authorization policy.

### Privacy and uploads

- PostHog session recording is disabled; aggregate product events remain enabled.
- The privacy policy now lists active processors, describes family/child handling,
  and no longer claims private chats are used to train the language system.
- Conversation deletion now permanently removes the owned conversation, messages,
  share links, available feedback, and approved private objects.
- Uploads are read incrementally with a 20 MB ceiling, limited to five files, and
  checked by magic bytes/structure rather than trusting a MIME label.
- Filenames are sanitized; stored objects request AES-256 server-side encryption.
- New persistent uploads require a separate private bucket and are stored as
  internal `s3://` references. Clients receive 15-minute signed URLs.
- References to an unapproved bucket fail closed.

### Dependencies and delivery

- React Router DOM is pinned to `7.18.2`, which clears the known production
  advisory present in the former version.
- Python runtime packages were refreshed and crawler/tool-only packages were
  moved out of the production requirements into `requirements-tools.txt`.
- The deprecated bundled Uvicorn worker was replaced with `uvicorn-worker`.
- Alembic now runs in Render's pre-deploy phase, not during image build.
- CI now audits npm production dependencies and Python dependencies. The only
  Python audit exception is the documented ECDSA timing advisory; HåfaGPT accepts
  RS256 only, so that algorithm path is unreachable.
- ElevenLabs regeneration requests now have connect/read timeouts.

## Local evidence

### Runtime

- API: `127.0.0.1:8011`
- Web: `127.0.0.1:5191`
- Database: local PostgreSQL only
- Auth: Clerk development instance and the authorized
  `codeschoolofguam@gmail.com` Google account
- Chat: GPT-5.6 Luna through OpenRouter; OpenAI embeddings

All selected ports were confirmed unused before startup. No existing local process
was stopped or replaced.

### Authenticated browser coverage

- Google OAuth completed and the stricter Clerk claim policy accepted the session.
- Home data, learning recommendations, progress, XP, streaks, usage, and chat
  initialization returned successfully for the signed-in identity.
- A new streaming chat created a conversation, persisted it locally, retrieved RAG
  context, returned sources, rendered the answer, and reloaded its two messages.
- Learning, flashcards, quizzes, games, stories, vocabulary, practice, dashboard,
  settings, and privacy routes loaded without an application error.
- One curated quiz answer submitted and displayed its explanation.
- One flashcard was flipped, graded `Good`, and advanced to the next card.
- Unauthenticated conversation access returned 401 and local CORS preflight
  returned the exact allowed origin.

The live answer also reinforced the model-governance requirement: the current
control produced fluent Chamorro-related copy, but it followed a stale hard-coded
base-prompt claim that contradicted the governed language audit. The prompt had
incorrectly described `taigue` as “always” even though the two local dictionaries
define it as absent/not present, and it forced an unreviewed “MSY / God's morning /
commonly used” explanation. Those hard-coded claims were removed, the API prompt
tree was added to the canonical-content scan, exact canonical curriculum matches
now precede semantic RAG context, and regressions prevent the claims from returning.
The same live pass found that phone-style curly quotes bypassed exact dictionary
headword extraction and that the vector corpus could miss a headword present in
the governed local dictionaries. Straight and typographic quotes now share the
exact lookup path, and deterministic local exact-headword evidence precedes
semantic retrieval. A successful HTTP response is not an accuracy decision.

### Automated checks

`./scripts/check.sh` on August 15 after the Luna runtime changes:

- API: **146 passed, 4 skipped**.
- Canonical vocabulary: passed.
- Canonical hardcoded-content audit: zero findings.
- Audio manifests: synchronized, 715 entries.
- ESLint: zero errors; ten existing warnings.
- TypeScript: passed.
- Production/PWA build: passed.
- npm production audit: zero vulnerabilities.
- Python audit: zero known reachable vulnerabilities; one documented RS256-
  irrelevant ECDSA exception.
- Netlify preview routes return 200 and now receive clickjacking, MIME-sniffing,
  referrer, browser-capability, and OAuth-compatible opener protections from the
  repository configuration.
- The Luna alias resolves to `openai/gpt-5.6-luna`, suppresses unsupported
  temperature parameters, and retains explicit token limits.
- A direct three-case Luna smoke completed through OpenRouter, and the local
  authenticated application completed chat streaming, citations, persistence,
  reload, and representative Chamorro checks with the final runtime code.

Known frontend debt remains: the primary JavaScript asset is about 1.99 MB
minified / 504 KB gzip, route-level code splitting is not yet implemented, browser
compatibility metadata is stale, and ten hook/fast-refresh warnings remain. These
are modernization work, not hidden test failures. An enforced Content Security
Policy also remains separate work: capture Clerk, PostHog, API, audio, and optional
payment connection requirements in a preview first, then deploy a least-privilege
policy without breaking OAuth or speech features.

## Production inventory and pre-deployment safeguards

### Current availability

At audit time, all returned HTTP 200:

- `https://hafagpt.com`
- `https://www.hafagpt.com` (canonical redirect)
- `https://hafagpt.netlify.app` (canonical redirect)
- `https://hafagpt-api.onrender.com/api/health`

### Render

- Service: `HafaGPT-API`, Singapore, Standard, branch `main`.
- Production origins include the canonical domain, `www`, and Netlify domain.
- `AWS_PRIVATE_UPLOADS_BUCKET` is not configured on the running release yet.
- The new auth code safely derives authorized parties from the restrictive
  production origins, but explicit values should still be added during the
  authorized release window.

### Neon

- PostgreSQL 17 production branch.
- Alembic revision: `j4k5l6m7n8o9`.
- Pending head migration: `k5l6m7n8o9p0`.
- `message_feedback` and `conversation_logs` exist.
- `message_feedback.conversation_id`, `message_id`, and `user_id` are currently
  UUID/UUID/text as expected by the migration preconditions.
- The target indexes already exist.
- `message_feedback` has one row and is approximately 80 KB, so the reviewed
  type reconciliation is low-volume.
- `conversation_logs` has 8,272 rows.
- Neon history retention is one day. A permanent child branch named
  `pre-luna-private-storage-2026-08-15` now preserves the pre-rollout production
  state without resetting or modifying production.

The migration was not run. A rollback cannot reverse an already-used type change
without handling new string identifiers, so database rollback should use Neon's
point-in-time restore/branch workflow rather than a blind downgrade.

### Netlify

- The team is on a Pro plan with remaining credits and auto-recharge enabled.
- The dashboard is restricted for non-payment.
- An overdue invoice totals `$20.00` and the dashboard warns of suspension in 11
  days.

The owner accepted this notice as outside this rollout. Payment remediation was
intentionally not performed and is not treated as a code or model release gate.

## Model decision

GPT-5.6 Luna is the owner-approved main HåfaGPT model for this release.

- The application alias `gpt-5.6-luna` resolves to the verified OpenRouter model
  ID `openai/gpt-5.6-luna`.
- DeepSeek V3 remains the immediate configuration-only rollback.
- Luna handles the default tutor and supported vision requests for now. Additional
  role-based routing is deliberately deferred until a second model demonstrates a
  material, human-reviewed benefit that justifies the added complexity.
- Terra, Claude Sonnet 5, Grok 4.5, GLM 5.2, Llama 4 Maverick, Gemini, Kimi, and
  other frontier/open-weight candidates remain documented evaluation options,
  not silently activated production routes.

This is an engineering and owner promotion decision, not a claim that automated
scores prove Chamorro correctness. Qualified native review, adjudication, and the
larger integrated RAG suite remain required for stronger language-quality claims
and future routing decisions.

## Authorized rollout sequence

1. **Create private storage and least-privilege credentials.** Complete; existing
   public objects and credentials remain untouched.
2. **Create the Neon pre-rollout branch.** Complete; it has no auto-delete.
3. **Merge only after final CI and Greptile 5/5.** Render's pre-deploy command will
   migrate before starting the new API.
4. **Set Render configuration after merge**: the dedicated AWS access key,
   `AWS_PRIVATE_UPLOADS_BUCKET=hafagpt-private-uploads`, and
   `CHAT_MODEL=gpt-5.6-luna`. Keep the old credential active and retain the old
   bucket as static audio storage. Never expose values in Git or logs.
5. **Smoke the API**: health, Clerk sign-in, authorized/unauthorized requests,
   conversation load/create, private upload and signed retrieval, chat streaming,
   RAG sources, usage, and admin denial. Do not delete production data as part of
   rollout testing.
6. **Smoke the Netlify production build** across the authenticated routes and
   confirm PostHog has no session replay.
7. **Observe for at least one normal usage window**: 5xx, auth failures, database
   connection errors, migration state, AI latency/cost, and upload access.

## Rollback

- Web: restore the prior successful Netlify deploy.
- API: restore the prior Render deploy/image and configuration.
- Model: set `CHAT_MODEL` back to `deepseek-v3`; startup validation resolves it
  to the known OpenRouter provider ID.
- Database: use the recorded Neon PITR point/branch if the migration must be
  reverted after writes. Do not assume `alembic downgrade` is lossless.
- Uploads: unset the private bucket to fail closed; do not fall back to the public
  static-audio bucket.

## Release gates

### Merge gate

- Local repository checks green.
- Final GitHub CI green.
- No unresolved actionable review thread.
- Greptile explicitly reports 5/5 on the final commit.

### Production gate

- Merge gate complete.
- Private upload bucket and least-privilege credential configured.
- Neon recovery point recorded.
- Explicit Render model/upload configuration entered and verified.
- Named owner available for smoke testing and rollback.

### Separate model gate

- Two qualified blinded reviews and adjudication complete.
- 100-case integrated RAG and multimodal-role suites complete as applicable.
- Cost, latency, provider identity, failure behavior, and rollback proven.
- Native-review decision record approves the selected model/role.

### Language-resource gate

- Source-specific permission evidence and allowed-use registry grants agree.
- A versioned, deduplicated production corpus passes retrieval traces and native
  review; evaluation-only material is never selected for production RAG.
- User-facing citations distinguish dictionary, canonical, cultural, news, and
  review-pending evidence roles.
