# Connected Learning Program

- **Status:** complete — final cross-surface audit passed
- **Last reviewed:** August 28, 2026 (Pacific/Guam)
- **Delivered through:** Release 5d and final audit

## Decision

HåfaGPT should adopt the starter-app connected-product architecture where it helps a learner continue one coherent learning journey. The app should not become a generic graph, an enterprise workspace, or a screen full of reciprocal links.

The useful unit is a trusted learning record: a topic, concept, lesson attempt, quiz answer, game result, word, conversation, scenario, story, or saved deck. Each record should have a stable identity, a clear home when one is useful, and a small number of relationships that help the learner understand what they practiced and what to do next.

This program is additive. Existing source-backed resources remain available. We are not adding a human review workflow or removing material merely because a reviewer is not currently available. Language claims, translations, and mastery claims remain governed by the existing accuracy program.

## Why this fits HåfaGPT

When this program was approved, the product already had the right activities: guided lessons, flashcards, quizzes, games, chat, scenarios, stories, progress, and Today recommendations. The missing layer was continuity: destinations often forgot the topic or the learner's entry point, and results were usually stored by activity type instead of connecting to the exact concept practiced. Releases 1–5d supplied that layer without replacing the activities or overstating their evidence.

The architecture review compared HåfaGPT with the canonical Brain Dump starter-app guide and the connected implementations in Code School of Guam, Håfa Recipes, and Cornerstone Payroll. The reusable pattern is consistent:

1. Give important objects stable IDs and routes.
2. Put shared route construction in one tested module.
3. Carry a bounded, validated internal return path when a learner enters a sub-workflow.
4. Store relationships at write time when the source knows them.
5. Re-fetch authoritative records after mutations.
6. Add only the reciprocal links that improve a real journey.

HåfaGPT needs a learning-shaped version of that pattern. Topic and concept relationships matter; a universal activity feed does not.

## Evidence and learning constraints

The design is also consistent with the product's trusted learning basis:

- The Institute of Education Sciences recommends spacing learning over time, active retrieval through quizzing, delayed review, and using quiz results to identify material that needs more work: <https://ies.ed.gov/ncee/wwc/PracticeGuide/1>
- ACTFL distinguishes interpretive, interpersonal, and presentational communication. HåfaGPT's lessons, listening/reading, chat/scenarios, and productive practice should complement rather than contradict one another: <https://www.actfl.org/educator-resources/guiding-principles-for-language-learning/plan-with-backward-design>
- CAST's UDL Guidelines support multiple means of engagement, representation, and action/expression while preserving learner agency: <https://udlguidelines.cast.org/>
- OWASP recommends avoiding untrusted redirect destinations or strictly validating them. Connected return paths therefore remain internal, bounded, and tested: <https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html>
- React Router treats URL search parameters as appropriate state for shareable and restorable list views: <https://reactrouter.com/explanation/state-management>

These sources support the learning and navigation model. They do not validate Chamorro wording. Chamorro content continues to require the repository's canonical sources and accuracy controls.

## Audit findings

### What is already strong

- The learning path has stable topic IDs and explicit flashcard and quiz categories.
- Curated flashcards already receive deterministic concept identities.
- Quiz and game results are persisted for signed-in learners.
- Today is deterministic, budget-aware, and based on first-party learner state.
- The app already records a coarse topic-level learning attempt for contextual games.
- The language-resource and accuracy programs separate source trust from product presentation.
- Conversations now have owner-scoped stable routes, optional source-topic
  relationships, and bounded metadata-only previews in topic workspaces.
- Game rounds now have owner-scoped stable result routes and a restorable,
  filterable learner history. Exact concept evidence and broad topic evidence
  remain visibly distinct, and legacy results stay available without an
  invented relationship.

### What the program resolved

- Contextual games return to Today or the originating topic. Today context also survives Today → lesson → card, quiz, or configured game.
- Canonical route construction and bounded internal returns live in shared, tested helpers instead of being rebuilt on each screen.
- Each topic has a stable workspace that joins its lesson, cards, quiz, games, explicitly aligned stories and scenarios, conversations, and recent evidence.
- Lesson exposure, embedded assessments, supported quiz answers, and contextual game rounds can record exact concept evidence. Writes are retry-safe, and older or inherently broad evidence remains honestly topic-level.
- Supported quiz mistakes can open the exact card or add it to review.
- Words, conversations, quiz results, game results, and saved decks have stable, owner-appropriate homes and reciprocal return paths.
- Vocabulary, learner histories, administrative user diagnostics, and learner-library choices restore their relevant view state from the URL.

### Remaining boundaries and maintenance risks

- HåfaGPT does not have a human language-review team. Source-backed, registered, and reviewed states therefore remain explicit; the absence of a reviewer is not grounds for removing useful material or claiming independent human validation.
- External Lengguahita stories remain intentionally unmapped until permission and trusted alignment metadata support a relationship.
- Games opened from the game library or general Today goals correctly remain game-centric and return to `/games`. They are not topic launches, so the application does not invent a topic relationship.
- Historical and inherently broad evidence remains broad. Completion, exposure, points, and stars are not rewritten or presented as exact concept mastery.
- Saved decks preserve their stored topic label, cards, and review state. User-created or generated cards do not acquire inferred canonical concepts or source-topic relationships after the fact.
- `api/api/main.py` remains a large module at 8,815 lines with 80 directly declared routes. Connected-learning endpoints now use focused routers, and future work should continue that seam; reducing the older monolith was not required to deliver learner continuity.
- Audio review filters are operational administration tooling, not a learner list/detail journey. Administrative user diagnostics are URL-restorable; the audio tool remains outside this program's continuity scope.

## Stable records and relationship rules

| Record | Stable identity today | Intended home | Relationships that earn UI space |
| --- | --- | --- | --- |
| Topic | `topic.id` | `/learning/:topicId` | lesson, cards, quiz, games, aligned scenarios/stories, recent attempts/conversations |
| Concept/card | deterministic concept ID | word/card detail when resolvable | source topic, lesson exposure, quiz answers, game attempts, review state |
| Quiz result/answer | database IDs | quiz result detail/history | topic, exact concepts, mistakes, review action |
| Game result/attempt | database IDs | game result detail/history | source topic, exact concepts, launch source |
| Word | dictionary/canonical ID | `/words/:wordId` | topics, cards, attempts, source/provenance already allowed by policy |
| Conversation | conversation ID | `/chat/:conversationId` | optional source topic, messages, return to topic |
| Scenario | scenario ID | existing scenario route | curated topic when explicit |
| Story | story ID | existing story route | curated topic when explicit |
| Saved deck | deck ID | owner-scoped `/flashcards/my-deck/:deckId` | stored topic label, contained cards, review state |

Topic-level attempts remain valid fallback evidence for historical or inherently broad activities. They must not be presented as concept mastery. Exact concept evidence is additive and should be written only when the activity can name the concepts it actually used.

## Curated alignment policy

Relationships may be authored when the product already has enough explicit information to make them defensible. Initial scenario mappings are straightforward: meeting someone → greetings, ordering food → food, market shopping → shopping, visiting family → family, asking directions → directions, fiesta → culture, and phone call → daily life.

Initial first-party story mappings are similarly direct: *Håfa Adai, Maria!* → greetings, *I Familia-hu* → family, *I Gima'-hu* → household, and *I Taotaomo'na*, *I Fiesta*, and *I Latte Stones* → culture.

External Lengguahita stories remain intentionally unmapped until the source or a trusted editor supplies alignment metadata. We will not infer relationships from titles or loose keyword matching.

## Delivery sequence

Each release branches from the latest merged `main`, passes focused tests and `./scripts/check.sh`, receives desktop and mobile journey QA, and is merged only after CodeRabbit approves the exact head with no actionable comments and every required check is green.

### Release 1 — navigation and return foundation

- Delivered tested canonical learner route builders and bounded internal return paths.
- Preserved Today context through Today → lesson → game.
- Made contextual game headers, guarded exits, and completion actions return to Today or Learning.
- Preserved `/games` behavior for games opened from the game library.

Acceptance journeys:

- Today → lesson → configured game → Back to Today.
- Learning → lesson → configured game → Back to learning.
- Games → game → More games.
- A malformed or external `return_to` value never leaves the application.

### Release 2 — stable topic workspace

- Delivered `/learning/:topicId` as the topic home while preserving `/learn/:topicId` as the lesson experience.
- Added a focused learning-workspace API router instead of adding more endpoints directly to `main.py`.
- Joined the lesson, flashcard category, quiz, suggested games, progress, and explicitly aligned stories and scenarios.
- Linked each participating surface back to the topic with contextual return behavior.

### Release 3 — exact concept evidence

- Recorded lesson exposure using deterministic concept IDs.
- Persisted the embedded lesson quiz as an identified lesson assessment.
- Added optional concept IDs to quiz answers and contextual game attempts.
- Preserved legacy topic-level attempts and labeled them as broad evidence.
- Let learners open or review the exact concept behind a supported quiz mistake.

All writes must be idempotent or protected from duplicate retries. A completion event is evidence, not automatically mastery.

### Release 4a — stable words

- Delivered source-order-independent dictionary word identities while preserving the
  existing source IDs used for provenance.
- Added stable `/words/:wordId` detail routes backed by exact dictionary records.
- Carried the same word identity through search, categories, flashcards,
  dictionary quizzes, and mapped Word-of-the-Day entries.
- Preserved bounded return context and kept older API responses usable during a
  staggered web/API deployment.

### Release 4b — stable conversations

- Delivered owner-scoped `/chat/:conversationId` routes while preserving the
  public `/chat` tutor entry point.
- Store a validated optional `learning_topic_id` when a conversation starts
  from a canonical topic; existing unlinked conversations remain available.
- Show at most three recent topic conversations as private metadata-only
  previews, with explicit topic return paths and no message-body disclosure.
- Advance conversation recency when messages are persisted so recent previews
  reflect real activity rather than only creation or renaming.
- Serve new read-side record endpoints through a focused injectable router and
  keep the web safe during staggered API/web deployments.

### Release 5a — stable game results and reciprocal topic evidence

- Delivered a learner-facing game history with URL-backed pagination and game
  filters, plus stable owner-scoped game-result detail routes.
- Connected game result → source topic and exact cards only when those
  relationships were saved at write time; legacy results remain unclassified.
- Added bounded, metadata-only recent quiz/game previews to topic workspaces and
  preserved validated topic return context through both result types.
- Linked dashboard game summaries to their exact saved records and invalidated
  result previews after new quiz and game writes.
- Kept points, stars, exposure, and completion explicitly separate from
  proficiency or mastery claims.

### Release 5b — restorable secondary context

- Delivered URL-backed dictionary and category search plus quiz-history
  pagination, including exact list return context on word and result details.
- Preserved administrative user search and pagination in the URL and carried a
  bounded, validated list return path through user detail and error states.
- Normalized invalid page values and repaired stale out-of-range history and
  user-list URLs to the last available page without inventing an empty state.

### Release 5c — Today continuity

- Preserved canonical topic, category, source, and bounded return context when Today launches its listening flashcards or weak-area quiz.
- Added explicit return-to-Today actions to both activity viewers.
- Persisted `today` as the quiz launch source without changing topic evidence or making a mastery claim.

### Release 5d — restorable learner-library views

- Made flashcard source, quiz source and level, game group, and story source URL-backed so library views survive reloads and can be shared.
- Preserved unrelated query parameters and hashes when a view changes.
- Normalized invalid and empty values to the documented default without leaving misleading URL state behind.

## Final cross-surface audit — August 28, 2026 (Pacific/Guam)

| Surface | Verified continuity | Result |
| --- | --- | --- |
| Today | Topic lessons, listening cards, weak-area quizzes, and contextual games preserve their source and return path. General goals remain top-level activities by design. | Pass |
| Topic workspace | Lesson, cards, quiz, chat, games, aligned stories and scenarios, conversations, and recent quiz/game evidence meet at one stable topic home. | Pass |
| Lessons and cards | Stable topic and concept identities support exact exposure, durable embedded assessments, exact mistake-to-card actions, word detail, and contextual return. | Pass |
| Quizzes | Results and history have stable routes; supported answers carry exact concept IDs; writes are retry-safe; topic and Today launch context survives. | Pass |
| Games | Contextual memory and scramble rounds save their topic, exact concepts, and source; results and history are stable. Library games remain honestly game-centric. | Pass |
| Chat and conversations | Conversations have owner-scoped stable routes, an optional validated topic relationship, privacy-minimized topic previews, and bounded return behavior. | Pass |
| Stories and scenarios | Only authored topic mappings appear. External stories remain intentionally unmapped, and story-library view state is URL-restorable. | Pass |
| Vocabulary | Stable word IDs and routes span dictionary search, categories, cards, and supported quizzes; search and exact return context restore from the URL. | Pass |
| Progress and saved decks | Progress links reach exact saved quiz/game results. Decks preserve owner scope, stored topic labels, contained cards, and review state without inferred concepts. | Pass |
| Administrative diagnostics | User search, pagination, details, and returns restore correctly. Audio review is documented as an operational boundary. | Pass with boundary |

No high-value disconnected journey remains inside the approved program scope as of August 28, 2026 (Pacific/Guam). New list/detail workflows and new cross-surface launches should meet the same stable-identity, write-time-relationship, bounded-return, and restorable-view requirements.

Passing this audit validates the product architecture and tested continuity. It does not independently validate Chamorro wording; the language-resource and accuracy programs remain authoritative for content.

### Implementation record

- Release 1: [PR #51](https://github.com/Shimizu-Technology/HafaGPT/pull/51)
- Release 2: [PR #52](https://github.com/Shimizu-Technology/HafaGPT/pull/52)
- Release 3: [PR #53](https://github.com/Shimizu-Technology/HafaGPT/pull/53)
- Release 4a: [PR #54](https://github.com/Shimizu-Technology/HafaGPT/pull/54)
- Release 4b: [PR #55](https://github.com/Shimizu-Technology/HafaGPT/pull/55)
- Release 5a: [PR #56](https://github.com/Shimizu-Technology/HafaGPT/pull/56)
- Release 5b: [PR #57](https://github.com/Shimizu-Technology/HafaGPT/pull/57)
- Release 5c: [PR #58](https://github.com/Shimizu-Technology/HafaGPT/pull/58)
- Release 5d: [PR #59](https://github.com/Shimizu-Technology/HafaGPT/pull/59)

## Explicit non-goals

- No human review queue or resource-removal gate while there is no review team.
- No weakening of source governance, provenance, or Chamorro accuracy checks.
- No generic graph database or universal relationship engine.
- No generic `activity` table that erases the meaning of quiz answers, game attempts, conversations, or card reviews.
- No link on every screen merely to make the app appear connected.
- No automatic mapping of external resources based on titles or keywords.
- No migration that rewrites historical topic-level evidence as exact concept evidence.
- No claim that completion, exposure, points, or two stars means mastery.
- No broad API rewrite as a prerequisite for learner value.

## Program completion gate

The program met its completion gate on August 28, 2026 (Pacific/Guam). Supported journeys are coherent in both directions, persisted relationships survive reloads, legacy records render honestly, unsafe return paths are rejected, URL-backed views restore correctly, and the final audit found no high-value disconnected journey inside the approved scope.

A future regression or a newly introduced workflow can reopen this work. Completion does not create a human-review requirement, certify Chamorro language content, or turn broad activity evidence into mastery.
