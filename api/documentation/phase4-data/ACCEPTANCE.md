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
