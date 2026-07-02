# HåfaGPT Language Content Accuracy Program

## Why this exists

HåfaGPT is not just another AI app. People use it to learn Chamorro words, phrases, pronunciation, culture, and context. That means the app has to be careful about what it teaches. If a beginner flashcard, quiz, game, audio file, or chatbot response is wrong, users can internalize the wrong form and repeat it with confidence.

This matters especially because the app is used by families and learners who trust it as a guide. The goal is not to move fast and patch one typo at a time. The goal is to build a durable content-quality process so the app becomes more trustworthy over time.

## Current problem

Language content is currently spread across multiple places:

- Frontend hardcoded flashcards and lesson decks.
- Frontend quiz data.
- Frontend game data.
- Daily words and story vocabulary.
- API dictionary JSON files.
- API audio generation manifests and word lists.
- RAG documents and generated embeddings.
- Prompt examples and documentation.

Because these sources are separate, they can drift. A term can be corrected in one place while remaining wrong in another. The color example that triggered this work is a good symptom: the app has taught brown as `Såksan` in one place, while local dictionary sources support chocolate-color constructions such as `kulot chikolåti` / `kulót chukulåti` instead.

## Principle

No HåfaGPT teaching content should be treated as correct just because it appears in the codebase or because an AI generated it.

Language content should be:

1. Source-backed.
2. Traceable.
3. Reviewed when uncertain.
4. Consistent across app surfaces.
5. Clear about variants and regional/orthographic differences.
6. Easy to audit repeatedly.

## Source hierarchy

When content is reviewed, prefer sources in this order:

1. Reviewed/local authoritative dictionary entries already in the repo.
2. Multiple agreeing dictionary sources.
3. Trusted external published Chamorro references.
4. Native speaker or educator review.
5. AI suggestions only as a research aid, never as final authority.

If sources disagree, the app should not hide that. It should record variants and teach the form most appropriate for beginner learners while preserving alternate forms as variants.

## Content status labels

Every canonical teaching item should eventually have a review status:

- `verified`: confirmed by a trusted source and/or human reviewer.
- `source_backed`: supported by one or more cited sources but not yet human-reviewed.
- `variant`: legitimate alternate spelling/form; should point to canonical entry.
- `needs_review`: plausible but not yet sufficiently supported.
- `deprecated`: previously used in the app but should no longer be taught.
- `do_not_teach`: known incorrect or inappropriate for app lessons.

## What we are auditing

The audit should cover all user-facing and AI-facing language content:

- Flashcards.
- Quizzes.
- Games.
- Daily words.
- Stories and story word breakdowns.
- Learning path lesson content.
- Conversation scenarios.
- Audio generation word lists and manifests.
- Dictionary category outputs.
- RAG source documents.
- Evaluation fixtures.
- Prompt examples and docs.

## Phased plan

### Phase 1: Inventory and triage

Create a full inventory of app/API language content and compare it against local dictionary sources. Produce a report that separates:

- confirmed exact source matches,
- likely spelling variants,
- phrases or inflected forms that need manual review,
- unsupported terms,
- high-risk beginner content issues.

Phase 1 should not mass-edit content. It should identify the highest-risk areas and create a repeatable audit script.

### Phase 2: Canonical vocabulary/content schema

Define a canonical vocabulary format that can serve the app consistently. Each entry should include:

- canonical Chamorro term,
- English gloss,
- category,
- part of speech,
- spelling variants,
- pronunciation guide,
- source citations,
- notes,
- confidence/review status,
- whether it is safe for beginner teaching.

### Phase 3: Correct core beginner content

Start with the highest-user-impact content:

- colors,
- numbers,
- greetings,
- family,
- body parts,
- food,
- common verbs,
- common phrases.

Update flashcards, quizzes, games, audio metadata, and lesson content from the canonical source.

### Phase 4: RAG and chatbot behavior

Audit the knowledge base used by the AI:

- confirm source document quality,
- ensure retrieval prefers trusted sources,
- prevent unsupported direct translations,
- require uncertainty language when sources conflict,
- add evaluation tests for known tricky terms.

### Phase 5: Ongoing governance

Add guardrails so future content does not drift:

- CI checks for hardcoded language terms not present in the canonical vocabulary,
- a review queue for `needs_review` content,
- regression tests for corrected terms,
- documentation for adding new learning content.

## Immediate non-goals

This program is not trying to decide every Chamorro variant in one pass. Chamorro has spelling, regional, and usage variation. The goal is to make that variation visible and source-backed instead of accidental.

This program also does not require all content to be perfect before any improvement ships. It creates a path to improve the most visible/high-risk content first while keeping track of what still needs review.

## First deliverables

- `scripts/audit_language_content.py`: repeatable inventory/audit script.
- `documentation/LANGUAGE_CONTENT_PHASE1_AUDIT.md`: Phase 1 audit report.
- `documentation/language_content_audit/phase1_inventory.json`: machine-readable inventory generated locally by `scripts/audit_language_content.py`; intentionally gitignored because it is a large generated snapshot.
- `language_content/canonical_vocabulary.schema.json`: canonical vocabulary schema.
- `language_content/canonical_vocabulary.json`: Phase 2 seed canonical vocabulary, starting with beginner colors.
- `scripts/validate_canonical_vocabulary.py`: dependency-free canonical vocabulary validator.
- `scripts/check_language_content_against_canonical.py`: checker for deprecated/review-needed terms still present in app/API surfaces.
- `documentation/CANONICAL_LANGUAGE_CONTENT_SCHEMA.md`: schema and workflow notes.
- `documentation/language_content_audit/canonical_usage_report.md`: generated report of remaining color-content cleanup targets.
- `documentation/LANGUAGE_CONTENT_COLOR_CORRECTIONS.md`: source-backed color corrections and remaining review work.
- `documentation/LANGUAGE_CONTENT_NUMBERS_GREETINGS_CORRECTIONS.md`: source-backed numbers/greetings corrections and remaining review work.
- `documentation/LANGUAGE_CONTENT_FAMILY_CORRECTIONS.md`: source-backed family corrections and remaining review work.
- `documentation/LANGUAGE_CONTENT_BODY_PARTS_CORRECTIONS.md`: source-backed body-part corrections and remaining review work.
- `documentation/LANGUAGE_CONTENT_FOOD_CORRECTIONS.md`: source-backed food/drink corrections and remaining review work.
- `documentation/LANGUAGE_CONTENT_COMMON_VERBS_CORRECTIONS.md`: source-backed common-verb corrections and remaining review work.
- `documentation/LANGUAGE_CONTENT_COMMON_PHRASES_SENTENCE_REVIEW.md`: source-backed common-phrase/sentence-level corrections and remaining review work.
