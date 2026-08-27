# Connected Learning Program

- **Status:** approved direction, delivered in small reversible releases
- **Last reviewed:** August 28, 2026
- **Delivered through:** Release 5a — stable game results and topic result previews

## Decision

HåfaGPT should adopt the starter-app connected-product architecture where it helps a learner continue one coherent learning journey. The app should not become a generic graph, an enterprise workspace, or a screen full of reciprocal links.

The useful unit is a trusted learning record: a topic, concept, lesson attempt, quiz answer, game result, word, conversation, scenario, story, or saved deck. Each record should have a stable identity, a clear home when one is useful, and a small number of relationships that help the learner understand what they practiced and what to do next.

This program is additive. Existing source-backed resources remain available. We are not adding a human review workflow or removing material merely because a reviewer is not currently available. Language claims, translations, and mastery claims remain governed by the existing accuracy program.

## Why this fits HåfaGPT

The current product already has the right activities: guided lessons, flashcards, quizzes, games, chat, scenarios, stories, progress, and Today recommendations. The main gap is continuity. A learner can start from a topic and move into another activity, but the destination often forgets the topic or where the learner came from. Results are usually stored by activity type rather than connected back to the exact concept that was practiced.

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

### What is disconnected

- Shared game headers and results return to `/games`, even when Today or a lesson launched the game.
- Today previously carried context into a direct game but not through Today → lesson → game.
- Routes and return behavior are assembled in individual components.
- A topic has a lesson route but no stable topic workspace that joins its lesson, cards, quiz, games, related stories/scenarios, conversations, and recent evidence.
- Lesson card views count progress but do not create concept evidence.
- The embedded lesson quiz is browser-only and does not create a durable quiz result.
- Quiz answers identify questions, not the canonical concept/card they assess.
- A game result creates one topic-level attempt; it does not record the exact cards or words used in that round.
- Quiz misses cannot yet open the exact card or add it to review.
- Vocabulary search, quiz-history pagination, and some administrative list context are local-only and cannot be restored from the URL.
- `api/api/main.py` is 8,817 lines with 84 directly declared routes. New connected-learning endpoints should enter through a focused router seam rather than extending the monolith.

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
| Saved deck | deck ID | existing deck route | contained concepts and source topics |

Topic-level attempts remain valid fallback evidence for historical or inherently broad activities. They must not be presented as concept mastery. Exact concept evidence is additive and should be written only when the activity can name the concepts it actually used.

## Curated alignment policy

Relationships may be authored when the product already has enough explicit information to make them defensible. Initial scenario mappings are straightforward: meeting someone → greetings, ordering food → food, market shopping → shopping, visiting family → family, asking directions → directions, fiesta → culture, and phone call → daily life.

Initial first-party story mappings are similarly direct: *Håfa Adai, Maria!* → greetings, *I Familia-hu* → family, *I Gima'-hu* → household, and *I Taotaomo'na*, *I Fiesta*, and *I Latte Stones* → culture.

External Lengguahita stories remain intentionally unmapped until the source or a trusted editor supplies alignment metadata. We will not infer relationships from titles or loose keyword matching.

## Delivery sequence

Each release branches from the latest merged `main`, passes focused tests and `./scripts/check.sh`, receives desktop and mobile journey QA, and is merged only after CodeRabbit approves the exact head with no actionable comments and every required check is green.

### Release 1 — navigation and return foundation

- Add tested canonical learner route builders.
- Validate and bound internal return paths.
- Preserve Today context through Today → lesson → game.
- Make contextual game headers, guarded exits, and completion actions return to Today or Learning.
- Preserve existing `/games` behavior for games opened from the game library.

Acceptance journeys:

- Today → lesson → configured game → Back to Today.
- Learning → lesson → configured game → Back to learning.
- Games → game → More games.
- A malformed or external `return_to` value never leaves the application.

### Release 2 — stable topic workspace

- Add `/learning/:topicId` as the topic home while preserving `/learn/:topicId` as the lesson experience.
- Add a focused learning-workspace API router instead of adding more endpoints directly to `main.py`.
- Join lesson, flashcard category, quiz, suggested games, progress, and explicitly aligned stories/scenarios.
- Link each participating surface back to the topic with contextual return behavior.

### Release 3 — exact concept evidence

- Record lesson exposure using deterministic concept IDs.
- Persist the embedded lesson quiz as an identified lesson assessment.
- Add optional concept IDs to quiz answers and contextual game attempts.
- Preserve legacy topic-level attempts and label them as broad evidence.
- Let a learner open or review the exact concept behind a supported quiz mistake.

All writes must be idempotent or protected from duplicate retries. A completion event is evidence, not automatically mastery.

### Release 4a — stable words

- Add source-order-independent dictionary word identities while preserving the
  existing source IDs used for provenance.
- Add stable `/words/:wordId` detail routes backed by exact dictionary records.
- Carry the same word identity through search, categories, flashcards,
  dictionary quizzes, and mapped Word-of-the-Day entries.
- Preserve bounded return context and keep older API responses usable during a
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

- Preserve useful vocabulary filters/search and quiz-history pagination in URL state.
- Carry validated return context through the administrative user list/detail journey if it remains a demonstrated need.

The final release audit may add a narrowly scoped follow-up when the tested journeys reveal a real gap.

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

The connected-learning program is complete only when the supported journeys are coherent in both directions, persisted relationships survive reloads, legacy records still render honestly, unsafe return paths are rejected, URL-backed views restore correctly, and the final cross-program audit finds no high-value disconnected journey left inside the approved scope.

The final audit will compare lessons, flashcards, quizzes, games, chat, scenarios, stories, Today, progress, and administrative diagnostics against this record model. Any remaining gap must be either implemented in a reviewed release or documented with a concrete reason for deferral.
