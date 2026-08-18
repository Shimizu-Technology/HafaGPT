# HåfaGPT Learning Experience — Phase 1 and 2 Release Record

**Completed:** August 19, 2026 (Guam)

**Production baseline:** `main` at merge commit `f5659b6`

**Program:** [LEARNING_EXPERIENCE_PROGRAM_2026.md](LEARNING_EXPERIENCE_PROGRAM_2026.md)

**Outcome:** Phases 1 and 2 delivered; no destructive data operation performed

## Outcome first

HåfaGPT now connects its existing learning resources into one coherent loop
without discarding the original content or learner history:

1. a learner opens a calmer, responsive home page;
2. **Today** recommends a deterministic sequence that fits the authoritative
   daily goal and current progress;
3. due flashcards use a real spaced-repetition schedule;
4. a completed lesson can launch relevant, privacy-minimized game practice;
5. pronunciation controls share one playback and fallback path;
6. onboarding and Settings personalize presentation by capability, not by
   collecting a child's age, school, classroom, or identity; and
7. Translate, Ask, Dictionary, Stories, lessons, cards, quizzes, speaking, and
   games remain directly available for learners who need only one quick task.

This was an incremental improvement of the existing application, not a rewrite.
The source corpus, canonical vocabulary, stories, lesson content, audio assets,
conversations, and historical progress were preserved.

## Why this work was needed

The August review found a capable product whose features behaved like separate
mini-apps. Flashcard ratings did not reliably create due work, audio controls used
different fallback behavior, lessons and games did not form a practice loop, the
home page gave many features equal visual weight, and personalization relied on
broad skill labels rather than the support a learner actually needs.

The delivered changes repair those promises before adding more content. This is
especially important for Chamorro: a low-resource, accuracy-sensitive language
benefits more from consistent practice, visible sources, honest uncertainty, and
preserved evidence than from an opaque engagement system.

## Merged implementation ledger

All implementation work used dedicated branches and merge commits. Every PR was
validated locally, reviewed on its exact current head, and received an explicit
Greptile 5/5 before merge.

| PR | Delivered scope | Merge commit | Data behavior | Exact-head Greptile |
|---|---|---|---|---|
| [#17](https://github.com/Shimizu-Technology/HafaGPT/pull/17) | Program, acceptance criteria, privacy and rollback boundaries | `c46d70e` | Documentation only | 5/5 |
| [#18](https://github.com/Shimizu-Technology/HafaGPT/pull/18) | Canonical SM-2 reviews, stable card identity, due queue, saved-deck compatibility, frontend test harness | `7d3c9f5` | Additive nullable columns; legacy writes retained | 5/5 |
| [#19](https://github.com/Shimizu-Technology/HafaGPT/pull/19) | Shared pronunciation path, level-aware continuation, honest unlimited labels, bounded theme runtime | `4441784` | No migration or content mutation | 5/5 |
| [#20](https://github.com/Shimizu-Technology/HafaGPT/pull/20) | Explicit safe seasonal-theme persistence and admin validation | `ea34102` | Additive settings; existing admin values preserved | 5/5 |
| [#21](https://github.com/Shimizu-Technology/HafaGPT/pull/21) | Lesson-to-game handoff, concept attempts, analytics allowlist, child-privacy product gate | `2eff9fe` | Additive attempt ledger; no answer text | 5/5 |
| [#22](https://github.com/Shimizu-Technology/HafaGPT/pull/22) | Capability-based onboarding and Settings with cross-account/stale-save isolation | `c162356` | Additive allowlisted account metadata; safe defaults | 5/5 |
| [#23](https://github.com/Shimizu-Technology/HafaGPT/pull/23) | Personalized Today home, daily planner, quick intents, compact progress, honest loading/error/disabled states | `f5659b6` | No migration or data rewrite; XP goal is authoritative | 5/5 |

## Acceptance matrix

### Phase 1 — repair the current learning promises

| Promise | Status | Evidence |
|---|---|---|
| One canonical review schedule | Delivered | Again/Hard/Good/Easy persist through the SM-2 endpoint; curated, dictionary, due-queue, and saved-deck paths use stable identities; compatibility writes retain old saved-deck history. |
| One pronunciation path | Delivered | Vocabulary, stories, and conversation practice use the shared reviewed-static → generated → labeled device approximation path with single-playback ownership and error/loading states. |
| Visible runtime defects repaired | Delivered | Unlimited sentinels are not shown as `-1`; beginner/intermediate/advanced continuation is level-aware; seasonal visuals require valid explicit configuration. |
| Lessons connect to relevant play | Delivered | Lesson completion hands validated topic/category context to supported games, which record a minimal concept attempt in the game-result transaction. |
| Privacy-minimized learning analytics | Delivered | Analytics properties are allowlisted, URLs are stripped of query/fragment data, DOM autocapture and replay are disabled, and the first-party attempt ledger stores no answer text. |
| Child-privacy product gate | Delivered for these phases | Capability personalization adds no child name, age, school, classroom, teacher, address, or student ID. Named child profiles and compliance claims remain gated and deferred. |

### Phase 2 — simplify and personalize

| Promise | Status | Evidence |
|---|---|---|
| Capability-based onboarding | Delivered | Five keyboard-operable steps collect learner mode, reading support, Chamorro confidence, goal, and session preference; skip, failure, account-switch, and stale-save behavior have component coverage. |
| Adaptive Today experience | Delivered | Signed-in home follows Today → Ask/Translate/Dictionary → Explore → Progress; signed-out Dictionary and Stories remain public. |
| Deterministic daily planner | Delivered | Provider-independent logic combines due reviews, recommended topic, weak areas, capability preferences, and already-learned minutes without truncating full activities. |
| Honest goal and failure behavior | Delivered | The XP daily goal is the single source of truth; zero is an explicit disabled state; request failures and partial HTTP-200 responses show retryable unavailable states rather than fabricated plans or zeros. |
| Calmer responsive home | Delivered | Mobile-first hierarchy, reduced decorative density, visible focus, 44-pixel primary targets, and verified layouts at 320, 390, 768, and 1280 CSS pixels. |

## Data safety and reversibility

No source, vocabulary entry, story, audio file, conversation, learner row, crawl
log, or production export was deleted or rewritten for this program.

The database changes were additive:

- spaced-repetition snapshot/identity support retained legacy saved-deck writes;
- seasonal settings used conflict-safe defaults and intentionally preserve admin
  choices on downgrade; and
- learning attempts added a separate, answer-text-free ledger linked to game
  results.

If a runtime rollback is necessary, revert merge commits in reverse delivery
order. Revert web/API behavior first and leave additive columns, settings, and
attempt rows in place unless there is a separately approved reason to remove
data. Do not run destructive downgrades merely to roll back UI behavior.

Suggested rollback order:

1. `f5659b6` — personalized Today home;
2. `c162356` — capability onboarding/settings;
3. `2eff9fe` — lesson/game handoff and attempt recording;
4. `ea34102` — seasonal admin controls;
5. `4441784` — shared audio/runtime repairs; and
6. `7d3c9f5` — canonical review UI/adapter, while retaining additive schema and
   historical rows.

## Final verification

The final Phase 2 head passed the repository-wide gate:

- 318 API tests passed and 4 credential-dependent tests skipped;
- 60 web behavior tests passed across 22 test files;
- lint completed with zero errors and 10 unchanged pre-existing warnings;
- TypeScript checking and the production Vite/PWA build passed;
- all 29 governed language sources were registered and reviewed;
- the 30-case source-routing benchmark passed;
- canonical vocabulary and usage checks passed with zero findings; and
- API/web audio manifests matched at 715 entries.

After PR #23 merged, GitHub Actions run
[`32151939905`](https://github.com/Shimizu-Technology/HafaGPT/actions/runs/32151939905)
passed FastAPI, React web, and cross-app content synchronization on merge commit
`f5659b6`.

Production at <https://hafagpt.com/> was then checked in a real signed-in Chrome
session. It served the new Today home, loaded the account's current lesson and
progress from the API, exposed Translate/Ask/Dictionary in one action, retained
all Explore routes, and produced no application console error. The local QA
account's temporarily disabled daily goal was restored to its original
10-minute value after the reversible edge-case test.

## Known debt that did not block this release

These are real follow-ups, but they pre-date or sit outside the Phase 1–2 scope:

- 10 existing frontend lint warnings remain in unrelated components;
- the production build still reports an approximately 1.98 MB minified main
  chunk and recommends route/game code splitting;
- the PWA precache is approximately 3.25 MB;
- named child subaccounts, classroom/teacher tools, and public competition were
  intentionally not introduced;
- old saved-deck rows remain recoverable during the compatibility period; and
- browser device speech remains labeled as an approximation, not represented as
  native Chamorro pronunciation.

## Recommended next program

The next work should deepen the system rather than add another disconnected
feature grid:

1. **Automated critical-flow browser tests.** Preserve the now-working signed-
   in Today, translation intent, lesson → game → attempt, review queue, and
   account-switch flows in repeatable staging checks.
2. **Route and game code splitting.** Improve first-load and PWA performance,
   especially on mobile connections, with bundle budgets that prevent regressions.
3. **Extend the calmer visual system.** Apply the home hierarchy, 44-pixel
   targets, focus treatment, reduced motion, and lower decorative density to
   lessons, flashcards, stories, practice, and games.
4. **Richer pre-reader support.** Increase reviewed image/audio-first guidance
   and reduce setup reading without guessing at authentic pronunciation.
5. **Learning-quality evaluation.** Measure delayed recall and useful return
   behavior rather than maximizing streak pressure or raw time in app.
6. **Language and source governance.** Continue the separate native-review,
   provenance, permission, and source-ranking program; citations do not replace
   permission or qualified language review.
7. **Family features only after privacy design.** Named child profiles,
   caregiver dashboards, or school rosters require a new explicit data model,
   consent/deletion plan, legal review, and separate approval.
8. **Legacy scheduler retirement later.** Observe compatibility writes and
   reconcile identities before considering any migration away from the old
   table. No destructive cleanup should be bundled into ordinary feature work.

## Final decision

Phases 1 and 2 meet their program-level completion criteria and are released.
The application is now easier to enter for a quick answer and more coherent for
a learner who returns over time. The correct next step is measured refinement of
learning quality, accessibility, performance, and source trust—not a rebuild and
not deletion of the preserved resources that make HåfaGPT valuable.
