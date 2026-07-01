# Canonical Language Content Schema

This document describes the Phase 2 canonical vocabulary layer for HåfaGPT.

## Why a canonical layer

Before this work, the same language term could appear independently in frontend flashcards, quiz questions, games, daily words, API audio manifests, and RAG material. That makes it easy for one surface to teach a stale or unsupported term even after another surface is corrected.

The canonical layer gives HåfaGPT one reviewed place to record:

- what term we teach,
- what it means,
- which variants exist,
- where the evidence comes from,
- whether it is safe for beginner teaching,
- which app legacy terms should be replaced or reviewed.

## Files

- `language_content/canonical_vocabulary.json` — canonical vocabulary entries.
- `language_content/canonical_vocabulary.schema.json` — JSON schema for the file shape.
- `scripts/chamorro_utils.py` — shared Chamorro text normalization helpers used by the audit/validation scripts.
- `scripts/validate_canonical_vocabulary.py` — dependency-free validation script.
- `scripts/check_language_content_against_canonical.py` — scans app/API surfaces for deprecated and review-needed canonical terms.
- `documentation/language_content_audit/canonical_usage_report.md` — generated action report from the canonical checker.

## Entry fields

Each entry includes:

- `id`: stable identifier such as `colors.brown`.
- `category`: learning category, e.g. `colors`.
- `english`: English gloss.
- `canonical_chamorro`: source-backed canonical form.
- `recommended_teaching_term`: term HåfaGPT should display by default after review.
- `normalized_key`: diacritic-insensitive lookup key.
- `part_of_speech`: from source dictionaries when available.
- `teaching_level`: intended learner level.
- `review_status`: one of `verified`, `source_backed`, `variant`, `needs_review`, `deprecated`, `do_not_teach`.
- `confidence`: `high`, `medium`, `low`, or `unknown`.
- `pronunciation`: provisional pronunciation guide plus review status.
- `variants`: legitimate or possible alternate spellings/forms.
- `deprecated_app_terms`: terms currently or historically in the app that should not be taught.
- `needs_review_terms`: terms that may be valid but need human/source review before teaching.
- `source_citations`: dictionary or verified external-reference headwords/forms, definitions, URLs when external, and evidence.
- `notes`: implementation/review notes.

## Review status definitions

- `verified`: confirmed by a trusted human reviewer and source-backed.
- `source_backed`: backed by local dictionary sources or a verified external language reference when bundled local data is missing/conflicting; not necessarily human-reviewed.
- `variant`: alternate form of a canonical entry.
- `needs_review`: plausible but not safe to teach as canonical yet.
- `deprecated`: old app term that should be replaced.
- `do_not_teach`: known incorrect or inappropriate for lessons.

## Phase 2 seed scope

The canonical seed started with the `colors` category because Phase 1 found clear user-facing drift:

- `Såksan` taught as Brown without local dictionary support.
- `Lalala` taught as Orange while normalized dictionary evidence points to a living/existing meaning.
- `Å'tot` taught as Black while local dictionary evidence points to unrelated meanings.
- Inconsistent color phrases across flashcards, quizzes, games, daily words, and audio manifests.

The canonical vocabulary now also includes beginner `numbers`, core `greetings`, and basic yes/no response terms. These entries follow the same source-backed but conservative pattern: record variants and review notes instead of pretending every spelling or phrase choice is final.

## Validation

Run structural/source validation:

```bash
python3 scripts/validate_canonical_vocabulary.py
```

Run the app/API usage checker:

```bash
python3 scripts/check_language_content_against_canonical.py
```

The validator checks:

- required fields,
- unique entry IDs,
- unique recommended teaching terms after normalization,
- canonical and recommended teaching terms match after normalization, with alternate spellings recorded as variants,
- valid review/confidence values,
- dictionary citation source files,
- cited headwords exist in local dictionary files after normalization,
- external citations include an `http(s)` URL and are structurally recorded without requiring network access during validation.

The usage checker reports where deprecated terms, review-needed terms, and app-legacy variants still appear in the current code/audio content.

## How this should be used next

1. Review the color seed with a trusted Chamorro speaker/teacher if possible.
2. Decide final display spellings for entries with variants, especially brown, orange, black, green, and yellow.
3. Keep static audio regenerated from corrected word lists whenever canonical teaching terms change.
4. Keep regression checks so deprecated app terms like `Såksan`, `Lalala` as Orange, and `Å'tot` as Black cannot reappear in beginner teaching content.
5. Expand canonical entries category by category: greetings, numbers, family, body, food, verbs, and common phrases.

The source-backed correction passes are documented in `documentation/LANGUAGE_CONTENT_COLOR_CORRECTIONS.md`, `documentation/LANGUAGE_CONTENT_NUMBERS_GREETINGS_CORRECTIONS.md`, `documentation/LANGUAGE_CONTENT_FAMILY_CORRECTIONS.md`, `documentation/LANGUAGE_CONTENT_BODY_PARTS_CORRECTIONS.md`, `documentation/LANGUAGE_CONTENT_FOOD_CORRECTIONS.md`, `documentation/LANGUAGE_CONTENT_COMMON_VERBS_CORRECTIONS.md`, and `documentation/LANGUAGE_CONTENT_COMMON_PHRASES_SENTENCE_REVIEW.md`.
