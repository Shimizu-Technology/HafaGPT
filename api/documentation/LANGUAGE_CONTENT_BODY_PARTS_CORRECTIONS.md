# Language Content Body Parts Corrections

Date: 2026-07-01

## Scope

This pass extends the canonical vocabulary layer into body-part terms used by flashcards, quizzes, learning-path copy, Simon Says, story vocabulary, and static audio. The goal is to keep clear source-backed beginner terms in learner-facing surfaces while preserving legitimate variants and review questions.

## Source policy

Primary evidence remains the bundled local dictionaries:

- `dictionary_data/revised_and_updated_chamorro_dictionary.json`
- `dictionary_data/chamoru_info_dictionary.json`
- `dictionary_data/chamorro_english_dictionary_TOD.json`

AI output was not used as authority. Terms that are source-associated but ambiguous are marked for native-speaker/educator review instead of being treated as settled.

## Canonical entries added

Added source-backed body-part entries for:

- `Ulu` — head
- `Åtadok` — eye / eyeball
- `Talanga` — ear
- `Gui'eng` — nose, with `Gui'ing` preserved as a source-backed variant
- `Pachot` — mouth, with `Påchot` / `Påchut` preserved as source-backed variants
- `Kannai` — hand / arm up to shoulder, with `Kånnai` preserved as a source-backed variant
- `Bråsu` — arm / forearm
- `Addeng` — foot / feet / human leg, with revised-dictionary `Ådding` preserved as a source-backed variant
- `Kueyu` — neck / nape
- `Korason` — heart, with `Koråson` / `Kurasón` preserved as source-backed variants
- `Tuyan` — stomach / belly / abdomen

## Learner-facing corrections

### Frontend

Updated learner-facing body content:

- `src/data/defaultFlashcards.ts`
  - `Mata` → `Åtadok` for eye/eyes
  - adjusted pronunciation hints for `Gui'eng`, `Pachot`, and `Bråsu`
- `src/data/quizData.ts`
  - body-parts quiz now asks about `Åtadok` instead of `Mata`
- `src/data/learningPath.ts`
  - key phrase now uses `Åtadok — Eye`
  - removed the unsupported beginner tip that taught `Mata` as the eye term
- `src/components/SimonSays.tsx`
  - `Ulo` → `Ulu`
  - `Mata` → `Åtadok`
  - `Kanai` → `Kannai`
  - `Tata'ao` → `Tuyan`
  - updated corresponding commands to `ulu-mu`, `åtadok-mu`, `kannai-mu`, and `tuyan-mu`
- `src/data/storyData.ts`
  - changed latte-stone vocabulary `ulo` → `ulu` where it is glossed as “head”

### API/audio source lists

Updated `audio_generation/tier1_words.json` for Simon Says body terms and commands:

- `Ulo` → `Ulu`
- `Mata` → `Åtadok`
- `Kanai` → `Kannai`
- `Tata'ao` → `Tuyan`
- `Påtti i ulo-mu!` → `Påtti i ulu-mu!`
- `Påtti i mata-mu!` → `Påtti i åtadok-mu!`
- `Na'fåna i kanai-mu!` → `Na'fåna i kannai-mu!`
- `Påtti i tata'ao-mu!` → `Påtti i tuyan-mu!`

Generated new static audio and manifest entries for:

- `Ulu`
- `Åtadok`
- `Påtti i ulu-mu!`
- `Påtti i åtadok-mu!`
- `Na'fåna i kannai-mu!`
- `Påtti i tuyan-mu!`

Removed stale static audio manifest mappings for:

- `Ulo`
- `Mata`
- `Kanai`
- `Tata'ao`
- `Påtti i ulo-mu!`
- `Påtti i mata-mu!`
- `Na'fåna i kanai-mu!`
- `Påtti i tata'ao-mu!`

Existing source-backed audio for `Kannai` and `Tuyan` remains available in the static manifest.

## Variants intentionally preserved

- `Mata` / `måta` is not erased. Revised/TOD sources associate it with the eye entry as a synonym/cross-reference, but standalone bundled headwords also define `måta` / `mata` with unrelated meanings such as planting hole or raw/uncooked. This pass avoids teaching `Mata` as the primary beginner eye card until a reviewer confirms the best presentation.
- `Gui'ing`, `Påchot`, `Påchut`, `Kånnai`, `Ådding`, `Koråson`, and `Kurasón` remain documented source-backed variants.

## Deferred for native-speaker/educator review

- Best beginner presentation of `Mata` / `måta` versus `Åtadok` for “eye,” including whether `Mata` should be taught later as a variant, possessed/compound form, or regional/common form.
- Sentence-level Simon Says commands such as `Påtti i åtadok-mu!` and `Na'fåna i kannai-mu!`; this pass only aligns the noun stems with source-backed vocabulary and keeps the existing app command pattern pending phrase-level review.
- Pronunciation guides remain app-level approximations and should be reviewed by a native speaker/educator.
