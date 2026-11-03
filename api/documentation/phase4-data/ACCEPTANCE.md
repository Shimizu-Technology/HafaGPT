# Phase 4 data work — 2026-11-03

Base: `6148382` (`origin/main`). Implementation worker; the parent Claude thread reviews and merges. No database writes, embeddings, provider inference, or outreach are authorized here.

HåfaGPT serves Chamorro learners and families through the tutor, dictionary, flashcards, and quizzes. Accuracy and cross-surface consistency are the affected journeys (repo AGENTS.md; Brain Dump `work/shimizu-tech/hafa-gpt.md`; review program `PLAN.md`, KB findings 1, 2, 8, 9, and `RESOURCE_RESEARCH.md`). Guam 2024 is the teaching default; regional and historical source wording remains labeled. Native review is deferred. Chamoru.info remains available pending permission.

Agent-executed affected-flow acceptance:

1. Dictionary source examples retain their original wording and pair only when the flattened source structure supports it. Real fixtures: adiós, chinikulåti na kulót, håyu, aga'. Ambiguity stays unpaired/hidden.
2. Search puts complete English glosses ahead of incidental mentions. Tree, banana, blue, happy are regression fixtures. Source-specific dictionary records retain working detail links.
3. Reverse lookup never treats a line-wrapped mention as a direct gloss (gutos/chicken, ha'ilas/food); real direct glosses still work.
4. Canonical `needs_review` entries do not appear as recommended tutor terms or as the three graded verb items/default cards. Existing saved user decks are outside this change.
5. Source registry, permission ledger, crawler path, and runtime docs agree. New candidates default to no ingestion/retrieval; licensed local snapshots do not authorize RAG ingestion.
6. Versioned sentence pairs contain source/license/attribution/IDs/date/orthography. Loader validates offline, excludes historical material by default, and never connects to a database.

Validation: focused API tests, canonical validators, full `./scripts/check.sh` serially, relevant Vitest and Playwright coverage for changed data surfaces. Production deployment, native language certification, authenticated saved-deck migration, and later RAG ingestion are outside this worker's acceptance.

## Slice A execution

- Offline gate: 906 API tests passed, 34 skipped; 127 Vitest files / 788 tests passed; canonical/governance/routing/audio validators, lint, typecheck, production build, PWA and bundle checks passed. API tests used the existing main-checkout Python environment as an executable only; no database or inference was started.
- Browser: existing public dictionary entry/search/return journey passed in desktop Chromium and Pixel 7 emulation (2/2), with mocked API fixtures. This verifies the public UI contract, not a live server response. API pairing, ranking, and source-specific ID lookup were checked separately against the real bundled snapshots.
- Three default cards and three graded questions are withheld. The surviving seven verb cards retain their original progress fingerprints through synchronized `card_source_indices`; held fingerprints are no longer accepted as active curated concepts. Existing user-saved decks and historical results are preserved.
- Authenticated flashcard/quiz Playwright journeys were not run: this worktree has no authenticated test-user fixture. Native-speaker review, production behavior, and release delivery remain outside this worker's evidence.
- A small `scripts/dev.sh` change enables isolated ports and API-free web QA. Port 5261 ran via that script with a lifecycle session; its exact Vite process was stopped after QA. No API server, database ingestion, or provider call was started.

## Final integration verification

Rebased onto `4d5b75a` (main, including evaluation PR #102 and design PR #101). The final code, including one-time migration of legacy verb-lesson positions through the original card indices, passes **920 API tests / 34 skipped**, **128 Vitest files / 798 tests**, all repository validators, lint, typecheck, production build, PWA, and bundle checks. Legacy positions no longer credit a different card after removal, and pending completions remain available for retry; new saves carry an order signature to avoid double migration. Existing saved user decks are unchanged.

The public dictionary entry/search/return Playwright journey passed again on desktop and Pixel 7 emulation (2/2), with mocked API fixtures. Authenticated flashcard/quiz browser scenarios remain not run for lack of a signed-in fixture. API snapshot tests cover actual pairing, ranking, and stable reference IDs. No production or native-language acceptance is claimed.

The final web-only launcher run claimed its direct Vite PID and finite Playwright runner. Cleanup terminated the exact listener on 5261; lifecycle status reports no active owned resources. No API server or RAG ingestion was started.
