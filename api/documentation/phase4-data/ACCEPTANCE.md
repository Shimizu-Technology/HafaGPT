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

## Review round 1 — PR #103

Refreshed against remote main `6d83b7f` (tutor routing merge). Agent-executed affected-flow acceptance: preserve pending embedded and standalone quiz answers/attempt IDs across retirement and reload, retry historical submissions, replay legacy ten-card exposure queues without retired credit, and retain structurally supported dictionary prefixes.

- Both browser quiz stores keep answered history verbatim, remove only unanswered retired IDs, and preserve current-question/draft state. Embedded history uses exact pre-retirement question records; Start Fresh and standalone restart use only the active pool. Answers never transfer to replacement questions. API validation accepts only the original retired question/concept relationships; persistence and result detail retain their original IDs. Retired concepts remain absent from the active manifest and cannot become new curated mastery/review targets.
- Legacy exposure requests ignore known retired verb IDs and retired review cards, write the seven surviving stable IDs, and still reject invented or cross-topic IDs. Repeated replay is covered through the route and transactional cursor fixture.
- Parser now keeps the even, structurally supported prefix before an ambiguous tail. Collapsed fields and ambiguous taxonomy headings remain unpaired. Real luseru, å'paka' chåda', and achá'ungak fixtures added without changing source wording. New totals: 17,723 presented pairs across 7,575 entries; 18,126 unpaired fields across 3,946 entries. This recovers 1,615 presented pairs across 790 entries from the previous conservative output. The existing three-example presentation cap and ambiguity guards explain why this is below the reviewer's uncapped candidate inventory.
- Full `./scripts/check.sh`: 1,099 API passed / 34 skipped; 128 Vitest files / 801 tests; canonical/governance/routing/audio validators, lint, typecheck, production build/PWA/bundle checks passed. Three existing lint warnings remain. Impeccable advisory scan: no findings. Audit output now includes the verbatim historical archive; these needs-review records are for restoration only. Audio manifests unchanged.
- Dictionary Playwright entry/search/return: desktop Chromium and Pixel 7 emulation, mocked API, 2/2 passed. Initial run lacked the public Clerk browser key and failed before app startup; rerun used existing public browser configuration. API snapshot regressions separately verify actual parsing/search behavior. Signed-in browser QA remains not run without an authenticated fixture; component/storage/API regressions cover save/reload/retry. No production, ingestion, inference, or language certification performed.
- Worker pushes fixes and leaves merge/review to the lead. CodeRabbit rate-limit skips are not completed review. Exact owned web/Playwright processes are cleaned after QA; no shared services touched.

## Review round 2 — PR #103

Refreshed on 2026-11-03 against remote main `7cd6e37` (including #104 and the
merged tutor work). The affected users remain dictionary learners and learners
with SRS snapshots saved before the three verb cards were retired. Context:
repo `AGENTS.md`, the brief above, and Brain Dump `work/shimizu-tech/hafa-gpt.md`.
Worker implements and pushes; the lead reviews and merges.

Required, agent-executed scenarios:

- D02: parse real `suni`, `platitus`, `chungi'`, and `linalålu'` snapshot fields;
  withhold their ambiguous blocks, retain a known prefix before a collapsed
  block, and never resume pairing afterward. Additional real fixtures cover
  parenthetical taxonomy/family names, slash-separated names, abbreviated
  headings, missing English partners, and detached English fragments.
- S02: seed all three retired verb fingerprints alongside an active verb card,
  a saved user card, and another learner's card in isolated local PostgreSQL.
  Query global/deck queues with limit 1, both summary paths, and repeated
  grades 0/5. Retired snapshots must remain byte-for-byte unchanged, contribute
  no active due/mastery counts, and acknowledge replay as an ignored 200.
  An active card must still update its counters and schedule. Auth is required.
- B02: public dictionary entry → search → return, desktop Chromium and Pixel 7
  browser emulation, using the existing Playwright journey and mocked API.
  Source parsing is verified separately against the bundled API snapshot.

Implementation: `f702c63` stops at the first uncertain pair. Taxonomy-like
headings are checked case-insensitively after whitespace normalization,
including multiword, slash/hyphen, parenthetical, and abbreviated shapes.
Missing/fragmented English partners, unbalanced English punctuation, and
collapsed fields end the prefix. These are conservative exclusion checks;
matching short sentences can also be withheld. No source wording is repaired.
The three-example cap remains. New totals: **14,108 presented pairs / 6,028
entries; 25,940 unpaired fields / 4,766 entries**. Relative to the pre-round-1
parser at `13b388a`, **544 pairs across 312 entries are recovered**. This replaces
the round-1 counts; 3,615 fewer pairs are presented than round 1.

Sample: **48 recovered pairs across 44 entries**, selected with
`random.Random(10302).sample(recovered_pairs, 48)` after traversing the snapshot
in insertion order and comparing capped outputs with `13b388a`. The worker
inspected the raw delimiter-to-pair adjacency and the English column only.
All 48 preserve an uninterrupted source prefix with an English partner; no
sampled taxonomy heading or English sentence was observed in the Chamorro
column. Some English source wording contains gaps; no translation-equivalence
or Chamorro correctness judgment was made. Initial sampling exposed additional
unsafe taxonomy/fragment shapes, which were excluded before the final sample.
The sample JSON, reproduction script, and inspection text are saved in local
`output/hafagpt-review-2026-11-03/data-worker-round2/`.

Implementation: `50f715a` excludes retired card IDs in SQL before due limits and
counts, shares the filtered summary query between homepage and standalone
summary routes, and acknowledges retired review replays without touching the
scheduler. The shared writer also refuses retired IDs. Historical records and
saved user cards remain intact. ReviewQueue receives the filtered API queue;
no client-side retirement filter or UI change is needed.

Known pre-existing limitation, outside this round: fabricated retired-only quiz
submissions can save ordinary evidence; the base client-grading validator also
accepts equivalent submissions with `concept_id` omitted. The quiz endpoint
awards no XP or SRS credit. This round does not expand quiz validation scope.

Verification results and exact final head are recorded in the PR's Review
round 2 section and the local worker handoff. Native-language certification,
production/release behavior, and signed-in browser journeys remain unverified.

Final round-2 verification at executable head `6c07933`: D02 and S02 passed;
B02 passed both desktop Chromium and Pixel 7 emulation (**2/2**, mocked API).
`./scripts/check.sh` ran serially and passed: **1,180 API passed / 34 skipped;
128 Vitest files / 801 tests**; canonical/governance/routing/audio validators,
lint, typecheck, build/PWA/bundle checks passed. Three existing lint warnings
remain. The first gate run exposed an existing millisecond-sensitive quiz-resume
assertion; `6c07933` controls the save clock and expects the refreshed timestamp,
without changing production quiz code. The initial failure log is preserved.
The test-only PostgreSQL database was dropped, the task's web/Playwright
processes and preview tab were cleaned, and audio manifests remain unchanged.
No API server was started. CodeRabbit is not awaited; a rate-limit skip is not
a completed final-head review. The lead owns review and merge.

## Review round 3 — PR #103

Refreshed on 2026-11-04 against `origin/main` at `a9fbcc8`. The affected journey
is dictionary example display for learners; source wording remains
accuracy-sensitive. Context: repo `AGENTS.md`, Brain Dump
`work/shimizu-tech/hafa-gpt.md`, the round-2 handoff, and the lead's round-3
findings. The worker implements and pushes; the lead reviews and merges.
The SRS/retirement changes at `50f715a` remain unchanged.

Agent-executed affected-flow acceptance:

- D03: positive validation of both fields before showing each adjacent pair.
  All four newly reported fixtures and the four round-2 shifted fixtures must
  stop at the first field. No pairing may resume after any rejection. Preserve
  rejected fields as unpaired source text without language labels or repair.
- C03: regenerate counts from the bundled snapshot; compare thresholds and
  headword retention; manually inspect 60 shown pairs from a fixed seed using
  source adjacency and the English side only. Record source wording concerns
  without judging Chamorro correctness or translation equivalence.
- B03: public dictionary entry → search → return on desktop Chromium and Pixel 7
  browser emulation with the existing mocked-API Playwright journey. API snapshot
  tests separately verify actual parsing. No API server or production data is
  needed. Signed-in, physical/native, production, and deployment acceptance are
  outside this round.

The parser now uses an original, hand-curated 1,383-token common-English list.
Apostrophes inside tokens and final glottal stops stay in the token; the English
score never matches fragments inside those tokens. English requires at least
three tokens and 60% exact common-English overlap. The Chamorro field requires
at least two tokens, at most 25% overlap, and an entry-headword signal: an exact
accent/glottal-normalized token sequence, or a single normalized headword of at
least four letters within a longer source token. This is an orthographic signal,
not a morphology judgment. Even a single-token headword is withheld under the
stricter two-token minimum.

Both fields must pass the source structure, taxonomy, abbreviation, and balanced
punctuation checks. English also requires a letter/quote start, no unsupported
one/two-letter fragment token, and evidence of a complete ending/clause. A final
article+noun phrase requires one of 1,216 original noun/regular-plural candidates
or a capitalized name. Unknown lowercase nouns in that position are withheld.
Leading dependent clauses need a source-delimited main clause; terminal
auxiliaries/contractions, determiners, and unfinished dependent subjects are
withheld. These deliberately conservative rules can reject good sentences.
Exploratory sampling exposed additional English extraction gaps and prompted
these completeness checks before the final sample. No English or Chamorro
source wording was repaired.

Final counts (three-pair cap): **7,390 shown pairs / 3,926 entries; 40,422
unpaired fields / 7,674 entries**. The regenerated `example_pairing_counts.json`
labels round-2 totals as historical and records hashes, configuration, and six
calibration configurations. At the chosen lexical thresholds, disabling the
headword requirement would show 8,352 pairs / 4,222 entries; requiring it removes
962 pairs and 296 entries from display. Raising English overlap to 65% retains
6,324 pairs, and 70% retains 5,415; lowering the Chamorro ceiling to 20% retains
6,392. The chosen thresholds keep useful supported examples while withholding
short or weakly supported fields.

Required fixture results (shown pairs / unpaired fields):

| Fixture | Result |
| --- | --- |
| abubun pápagu' | 0 / 7 |
| melindris | 0 / 8 |
| priparasión | 0 / 8 |
| míhinilat | 0 / 8 |
| suni | 0 / 7 |
| platitus | 0 / 7 |
| chungi' | 0 / 7 |
| linalålu' | 0 / 5 |
| adiós | 3 / 0 |
| chinikulåti na kulót (brown) | 1 / 2 |
| håyu | 3 / 0 |
| aga' | 2 / 2 |
| luseru | 0 / 11 |

The third `aga'` pair lacks the required headword signal. `luseru`'s first short
field has 1/3 English overlap from the shared token `i`, exceeding 25%; the block
therefore stops even though these are plausible source examples. Both losses
are intentional consequences of preferring fewer pairs. Metadata keeps its
existing cutoff and is not included in unpaired-field totals.

Final manual sample: **60 shown pairs from 60 entries**, selected with
`random.Random(10303).sample(population, 60)` after snapshot-order traversal of
all 7,390 shown pairs. The worker inspected every raw delimiter-to-pair prefix
and each English side independently of the validator's verdict. **60/60 preserve
source adjacency; 60/60 have an English partner with no observed shifted,
taxonomy, or detached-fragment pair**. Eight records have unchanged source
spelling/grammar notes, including earlier prefixes; those are not language
corrections or translation judgments. Individual judgments, English text, and
raw-prefix hashes are tracked in `example_pairing_sample_round3.json`.
Reproduce counts with `api/scripts/audit_dictionary_example_pairing.py`; use
`--check` to detect stale evidence or `--sample NEW_PATH` to write a separate,
unjudged sample. A regression checks counts and the exact sampled source
prefixes so annotations cannot silently survive parser/source drift.

D03 and C03 passed locally. Full-gate and B03 execution evidence follows after
verification. This sample is not proof of language correctness or complete
English extraction across the whole snapshot.

Verification at executable head `09ae024` (main `a9fbcc8` integrated):

- D03/C03 passed: focused parser regressions **49 passed**; counts and exact
  final sample/source-prefix checks passed. All 13 requested fixtures have the
  outcomes above. `--check` confirms the regenerated counts are current.
- Serial `./scripts/check.sh` passed: **1,196 API passed / 40 skipped; 129 Vitest
  files / 837 tests passed**. Canonical/governance/routing/audio validators,
  lint, typecheck, production build, PWA and bundle checks passed. Four existing
  lint warnings remain. The six opt-in PostgreSQL SRS tests were skipped without
  `SRS_TEST_DSN`; round 2 executed them, and this round changes none of their
  implementation or fixtures.
- B03 passed **2/2**: desktop Chromium and Pixel 7 emulation, public entry →
  dictionary → search → return, mocked API. Actual bundled-source parsing is
  covered separately by API tests. The extra preview tab only observed the
  homepage with no live API; it is not evidence of a live API dictionary journey.
- Exact owned Vite PID, finite Playwright/gate runners, and preview tab were
  cleaned/released; lifecycle session
  `01a1a1c1-cb02-7bb2-b716-bbf5b82a5c6e` reports no active owned resources.
  No API server or database was started; borrowed/protected services remain
  running. Task-only dependencies/build output/browser configuration are removed
  after preserving the QA report outside the worktree. No resource handoff.
- Source dictionary and audio manifests remain unchanged; the manifests compare
  equal. `50f715a` remains an ancestor, with its three files unchanged since the
  round-2 head. CodeRabbit is not awaited and no new review is claimed. The lead
  owns final review/CI assessment and merge; the worker does not merge.

Logs, raw final sample prefixes, Playwright HTML report, and worker handoff are
local at `output/hafagpt-review-2026-11-03/data-worker-round3/` under the canonical
Shimizu Technology root. Final evidence commit changes documentation only.
