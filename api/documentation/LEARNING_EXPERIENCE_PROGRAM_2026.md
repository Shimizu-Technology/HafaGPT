# HåfaGPT Learning Experience Program — Phases 1 and 2

**Re-reviewed:** August 18, 2026 (Guam)  
**Baseline:** `main` at `bcd2740`  
**Status:** approved implementation plan

## Purpose and scope

This document turns the August 2026 product and learning-experience review into a
reversible implementation program. It is specifically about the two product
phases described below. It does **not** rename or replace the engineering phases
in [MODERNIZATION_ROADMAP_2026.md](MODERNIZATION_ROADMAP_2026.md).

HåfaGPT should serve two jobs without making either one difficult:

1. **Help me now:** translate a school message, ask the tutor, hear a word, or
   find a dictionary entry quickly.
2. **Help me learn over time:** complete a short, adaptive practice loop that
   remembers what the learner knows and what should be reviewed next.

The founding use case remains a family learning Chamorro together. The product
must also work for independent learners outside the school community, from
pre-readers through adults. School-specific language may improve answers when
school context is present, but must never silently become the default meaning in
unrelated contexts.

## Re-review conclusion

The earlier direction is valid: improve the existing product rather than
rebuild it. HåfaGPT already has substantial, useful material—grounded chat,
dictionary data, lessons, flashcards, quizzes, stories, practice scenarios,
games, progress, audio, and source governance. The main product problem is that
these capabilities behave like separate mini-apps instead of one learning
system.

The re-review also found an important additional architectural risk: HåfaGPT has
**two independent flashcard progress systems**.

| Surface | Storage/API | Scheduling model |
|---|---|---|
| Saved custom decks | `user_flashcard_progress` and `/api/flashcards/decks/review` | fixed 1/7/30-day intervals |
| Newer review summary | `spaced_repetition` and `/api/flashcards/review` | SM-2 fields and 0–5 quality |

The main flashcard viewer currently records neither system; its rating handler
only advances the UI. Connecting it without a compatibility plan would fragment
history further. Phase 1 therefore makes `spaced_repetition` the canonical
scheduling layer while preserving all old rows and keeping saved-deck routes
compatible until a later cleanup migration is proven safe.

## What was verified

### Product and content

- The application has meaningful breadth and should not be replaced by a chat-
  only or game-only experience.
- Chat retrieval and source citations are strategically important for a low-
  resource, accuracy-sensitive language.
- Curated content and canonical vocabulary checks are valuable, but automated
  consistency is not the same as native-speaker approval.
- School language cards are intentionally context-gated. General users should
  not receive Hurao-specific acronym interpretations without school evidence.

### Learning behavior

- Flashcard confidence buttons in `FlashcardViewer` do not persist a review.
- `useRecordReview` exists but is not used by a learner-facing component.
- Saved decks use a separate, older scheduling table and endpoint.
- Intermediate and advanced lessons calculate “next” only from the beginner
  path.
- `suggestedGames` exists in the learning-path data but is not displayed or
  launched by lessons.
- Several games render the unlimited sentinel as `-1`, producing values such as
  `0/-1` instead of `0/∞` or “Unlimited.”
- Learning recommendations use broad completion/score data, not stable concept
  attempts and delayed recall.

### Audio and accessibility

- `useSpeech` already implements the best available hierarchy: static audio,
  generated audio, then browser speech fallback.
- Stories, conversation practice, and vocabulary also call browser speech
  directly with an `es-ES` approximation, creating inconsistent pronunciation
  and behavior.
- Some “pre-reader” activities still require substantial setup reading.
- The UI uses many emoji as functional graphics and includes decorative motion
  without one consistent reduced-motion policy.
- Touch targets and focus treatment are not consistently enforced across the
  large component set.

### Navigation and presentation

- The home page presents many equally weighted cards and statistics before a
  learner knows what to do next.
- The most common utility actions—ask/translate and dictionary lookup—should be
  immediately available without competing with the full feature catalog.
- All routes and games are statically imported. The main JavaScript bundle is
  about 1.99 MB minified (about 505 KB gzip) and the PWA precache is about
  3.26 MB at this baseline.
- The Christmas theme is currently coupled to the stored promo theme rather
  than an independently bounded active-theme state. Production showed seasonal
  styling in August.
- There are no frontend behavior tests. Lint, type checking, and build checks
  cannot detect broken learner flows.

### Privacy and measurement

- Existing account metadata stores skill level and goal, but not reading
  independence, learner mode, or preferred session length.
- The current policy asks a parent/guardian to create and supervise accounts for
  children under 13, but the product does not yet enforce a complete child-
  account/parental-consent system.
- Phase 2 must therefore store capability preferences, not a child's birthdate,
  school, classroom, full name, or other unnecessary identifiers.
- Session replay is disabled. New learning analytics must remain event-level
  and exclude chat text, translations, source passages, names, and school
  messages.
- The release gate, data inventory, event allowlist, deletion behavior, and
  unresolved legal/product checks are maintained in
  [`CHILD_PRIVACY_PRODUCT_GATE_2026.md`](CHILD_PRIVACY_PRODUCT_GATE_2026.md).

## Evidence behind the learning design

The implementation is based on primary or institutional guidance, not only on
patterns from popular apps:

- The US Institute of Education Sciences recommends spacing learning, active
  retrieval, delayed review, and using quizzes to identify material that still
  needs work: <https://ies.ed.gov/ncee/wwc/PracticeGuide/1>.
- ACTFL organizes language communication into interpretive, interpersonal, and
  presentational modes. HåfaGPT's daily loop should eventually exercise all
  three rather than only recognition: <https://www.actfl.org/educator-resources/world-readiness-standards-for-learning-languages/standards-summary>.
- CAST's UDL Guidelines 3.0 emphasize multiple means of engagement,
  representation, and action/expression, with learner agency as the goal:
  <https://udlguidelines.cast.org/>.
- The FTC's current COPPA rule applies to child-directed services and services
  with actual knowledge that they collect personal information from children
  under 13. The 2025 amendments add stronger consent, disclosure, and retention
  expectations: <https://www.ftc.gov/legal-library/browse/federal-register-notices/16-cfr-part-312-coppa-final-rule-amendments>.

These sources support spaced review, multimodal choices, meaningful progress,
and data minimization. They do not justify dark patterns, endless streak
pressure, or collecting more child information to make the product feel
personal.

## Product principles

1. **One calm next step.** The first screen should make the recommended action
   obvious while retaining direct access to chat and dictionary tools.
2. **Capability, not age labels.** Adapt reading, audio, pacing, and interaction
   using observable preferences. Do not infantilize adults or demand children's
   personal data.
3. **One concept history.** A word or concept should have one stable review
   identity across lessons, decks, and practice.
4. **Culture and sources stay visible.** Source badges and context should remain
   close to generated or retrieved language content.
5. **Play serves learning.** Games should practice current or due concepts and
   return useful attempt data; they are not a parallel reward arcade.
6. **No false fluency.** “Mastered” requires successful delayed recall, not one
   tap or one high same-session score.
7. **Mobile first, desktop complete.** Core actions must work at 320 CSS pixels
   without horizontal scrolling and remain well-composed at desktop widths.
8. **Reversible delivery.** Additive schema changes, compatibility adapters,
   feature flags where risk warrants them, small PRs, and no destructive data
   operations.

## Phase 1 — Repair the current learning promises

### 1. Canonical review scheduling

- Give curated and dictionary cards stable, versioned concept identifiers.
- Persist Again/Hard/Good/Easy ratings through the canonical review endpoint.
- Adapt saved-deck reviews into the same scheduler while continuing to populate
  the legacy table during the compatibility period.
- Add a due-review queue and accurate summary states.
- Never delete or rewrite existing learner rows during rollout.
- Add API unit tests for scheduling boundaries, authorization, idempotent
  identity, and compatibility writes.

**Acceptance:** a rating survives reload, changes the next-review date, updates
the home summary, and does not lose existing saved-deck progress.

### 2. One pronunciation path

- Move all learner-facing playback through one audio service/hook.
- Prefer reviewed static audio, then generated audio, then an explicitly labeled
  device-voice approximation.
- Prevent overlapping playback, enforce timeouts, expose loading/error states,
  and honor reduced motion.
- Keep both audio manifests synchronized for any manifest change.

**Acceptance:** vocabulary, flashcards, stories, and conversation practice use
the same controls and fallback semantics on desktop and mobile.

### 3. Repair visible runtime defects

- Render unlimited usage consistently; never expose `-1` to learners.
- Make next-lesson behavior work within beginner, intermediate, and advanced
  paths.
- Separate `theme_active` from promo access and default to the Chamorro/base
  theme outside a bounded seasonal period.
- Replace emoji used as interactive icons in touched flows with Lucide icons or
  project-owned visual assets.

**Acceptance:** no `0/-1`, no August Christmas state without an explicitly active
bounded theme, and every path can continue or finish correctly.

### 4. Connect lessons and games

- Show a lesson's configured practice game after teaching/review.
- Pass a small concept set into compatible games.
- Record concept attempts with activity type, correctness, and timestamp.
- Preserve a direct “All games” route for free exploration.

**Acceptance:** completing a lesson offers relevant practice and the result can
influence later review without recording answer text or personal content.

### 5. Learning analytics foundation

- Define event names and property allowlists in code.
- Track concept ID, activity type, success, duration bucket, and anonymous
  capability mode only.
- Do not send question text, chat content, translations, source passages,
  school/class identifiers, or user-entered names to analytics.
- Base “learning,” “due,” and “mastered” on review state and delayed recall.

**Acceptance:** a developer can explain every captured property, and concept
progress can be reproduced from first-party database records without PostHog.

### 6. Child-privacy product gate

- Keep current caregiver-supervised account language visible.
- Document data inventory, retention, processors, account deletion, and the
  intended family-account boundary.
- Do not launch named child profiles or collect age/school/classroom data in
  these phases.
- Obtain qualified legal/privacy review before marketing a child-directed
  account experience as compliant.

**Acceptance:** Phase 2 personalization works without additional child PII and
the remaining legal/product decisions are explicit, not implied complete.

## Phase 2 — Simplify and personalize

### 1. Capability-based onboarding

Ask only what changes the experience:

- learner mode: learning for myself, learning with a child, or helping family;
- reading support: audio/pictures first, short text with audio, or comfortable
  reading independently;
- current Chamorro confidence;
- primary goal;
- preferred daily session: 5, 10, 15, or 20 minutes.

Existing users keep their preferences and receive safe defaults for new fields.
All fields remain editable in Settings. “Skip for now” must work.

**Acceptance:** onboarding is keyboard/screen-reader operable, uses 44-pixel
minimum targets, saves without a full reload, and produces no child PII.

### 2. Adaptive Today experience

Replace the current equal-weight dashboard with this hierarchy:

1. **Today:** one resume/start action, estimated minutes, and a short sequence of
   review, new concept, listen/speak, and relevant play.
2. **Ask or translate:** a prominent utility entry that opens chat with the
   right intent.
3. **Dictionary:** an immediate lookup entry.
4. **Explore:** secondary access to lessons, stories, flashcards, quizzes,
   practice, and all games.
5. **Progress:** a compact, honest summary rather than several competing cards.

Signed-out visitors should still understand the product and can use public
dictionary/story routes. Signed-in learners should see continuity first.

**Acceptance:** a first-time learner can start in one clear action; a returning
learner can resume in one action; translation and dictionary are no more than
one action from home.

### 3. Daily-loop planner

- Generate a deterministic plan from due reviews, current path, weak concepts,
  learner capabilities, goal, and time preference.
- Prefer due material before adding too many new concepts.
- Provide useful empty states when no history exists.
- Let learners choose a different activity without losing the recommendation.
- Keep planning logic testable and provider-independent; the language model
  must not decide progression state.

**Acceptance:** plans are stable for the same state, stay within the time budget,
and differ meaningfully for audio-first and independent-reader preferences.

### 4. Calmer Chamorro visual system

- Retain the warm Chamorro identity while reducing gradients, snow, emoji, and
  repeated card containers.
- Establish semantic tokens for canvas, surface, text, accent, success, warning,
  and focus rather than adding isolated colors.
- Use a clear type scale, consistent radii, and visible focus states.
- Respect `prefers-reduced-motion`; decorative motion must not be required to
  understand state.
- Keep bottom navigation concise on mobile and use desktop space for context,
  not a stretched mobile grid.

**Acceptance:** no horizontal overflow at 320, 390, 768, or 1280 CSS pixels;
interactive targets are at least 44×44 pixels; focus order is logical; normal
text meets WCAG AA contrast; the page remains understandable at 200% zoom.

## Delivery plan and PR boundaries

The exact split may change if a review reveals tighter coupling, but each PR
must remain independently deployable and reversible.

| PR | Scope | Data risk | Rollback |
|---|---|---:|---|
| 1 | This program document and acceptance matrix | none | revert docs |
| 2 | Frontend test harness, stable card identity, canonical SRS wiring, saved-deck compatibility | additive writes | disable adapter/revert UI; old rows remain |
| 3 | Shared audio controls, usage display, path continuation, bounded theme | none or additive setting | revert components/API response |
| 4 | Suggested-game handoff and privacy-minimized concept attempts | additive table/events | disable handoff; retain rows |
| 5 | Capability preferences and redesigned onboarding/settings | additive metadata | ignore new keys/use defaults |
| 6 | Deterministic Today planner and responsive home information architecture | none beyond existing/new preferences | feature flag or revert route UI |
| 7 | Integrated regression, documentation/status updates, production verification | none | revert documentation only |

## Required validation for every implementation PR

1. Run focused unit/component tests while developing.
2. Run `./scripts/check.sh` before publishing.
3. Restart the local API and web servers from a clean process state.
4. Exercise affected flows in a real browser with Computer Use.
5. Test signed-out behavior where relevant and signed-in behavior where local
   Clerk configuration permits it.
6. Check desktop and mobile-responsive layouts, keyboard focus, loading, empty,
   success, and error states.
7. Inspect browser console and API logs for unexpected errors.
8. Push a dedicated `codex/*` branch and open a PR with purpose, screenshots or
   runtime notes, tests, migrations, and rollback behavior.
9. Wait for required CI and Greptile. Address every actionable current-head
   finding and repeat local validation after material changes.
10. Merge only after Greptile explicitly reports `Readiness score: 5/5` for the
    current head, required checks are green, and no actionable thread remains.
11. Update `main`, verify the deployed result, then begin the next PR.

## Program-level completion criteria

Phases 1 and 2 are complete only when:

- review ratings persist and drive due work across curated, dictionary, and
  saved-deck flows;
- the old progress data remains recoverable;
- audio behavior is consistent across the named learning surfaces;
- lesson continuation, unlimited usage display, and seasonal theme behavior are
  correct;
- lessons can launch relevant practice and concept attempts influence future
  plans;
- onboarding captures capability preferences without child PII;
- the signed-in home page leads with an adaptive Today plan plus direct
  ask/translate and dictionary entry;
- desktop and mobile acceptance checks pass;
- frontend behavior tests cover the new critical paths;
- each merged implementation PR received a clean current-head Greptile 5/5;
- final production smoke tests pass and this document records delivered status.

## Deferred intentionally

The following are valuable but should not be smuggled into these phases:

- named child subaccounts, classrooms, teacher dashboards, or school rosters;
- public leaderboards or social competition;
- a full framework/Tailwind rewrite;
- destructive consolidation or deletion of the legacy flashcard tables;
- representing browser Spanish TTS as authentic Chamorro pronunciation;
- claiming legal compliance or native-speaker approval without the appropriate
  review.

This boundary protects the learning improvements from becoming an untestable
rewrite and keeps the family/privacy decisions honest.
