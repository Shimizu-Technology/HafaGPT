# Language Content Common Phrases & Sentence-Level Review

Date: 2026-07-01

## Scope

This pass reviews high-visibility common phrases and short sentence-level teaching content used by greeting cards, common-phrase flashcards, quizzes, daily words, story notes, learning-path copy, static audio source lists, and static audio manifests.

The goal is not to solve every phrase/grammar question in one pass. Phrase-level Chamorro content is more grammar- and register-sensitive than single vocabulary items, so this pass only changes items with clear local-source support and documents the rest for native-speaker/teacher review.

## Source policy

Primary evidence remains the bundled local dictionaries:

- `dictionary_data/revised_and_updated_chamorro_dictionary.json`
- `dictionary_data/chamoru_info_dictionary.json`
- `dictionary_data/chamorro_english_dictionary_TOD.json`

AI output was not used as authority. Where local sources only support components or where a phrase remains register-sensitive, the canonical entry uses medium confidence or defers the item.

## Canonical entries added

Added common-phrase/sentence-level entries for:

- `Måolik ha' yu'` — I'm fine / I'm good
- `Dispensa yu'` — excuse me / pardon me / forgive me
- `Pot fabot` — please
- `Ti hu komprende` — I don't understand
- `Kao siña un ayuda yu'?` — Can you help me?
- `Atgun sumångan ennåo` — Say that again / repeat that
- `Nihi ta hånåo` — Let's go
- `Kao guaha?` — Is there? / Do you have?
- `Håfa bidåda-mu?` — What are you doing?

## Learner-facing corrections

### Frontend

Updated phrase/sentence teaching surfaces:

- `src/data/defaultFlashcards.ts`
  - `Maolek ha' yu'` → `Måolik ha' yu'` for the source-cited “I'm fine” phrase.
  - `Kao siña un tulaika?` as “Can you repeat that?” → `Atgun sumångan ennåo` as “Say that again / Repeat that”. Local sources define `tulaika` as exchange/trade/replace/substitute/change, not “repeat”.
  - `Fan hånao hit` as “Let's go” → `Nihi ta hånåo`.
  - `Kao guåha?` → `Kao guaha?`.
  - `Hafa bidå-mu?` as “What are you doing?” → `Håfa bidåda-mu?`.
  - Updated the adjective example to `Måolik ha' yu'. — I'm fine.`
- `src/data/dailyWords.ts`
  - `Maolek ha' yu'` → `Måolik ha' yu'`.
  - `Håfa na bidå-mu?` → `Håfa bidåda-mu?`.
- `src/data/quizData.ts`
  - Updated the “I'm fine” quiz option/answer/explanation to `Måolik ha' yu'`.
  - Replaced the unsupported `Si Yu'os Ma'åse'` explanation “God repay you” with local-source wording around “God have mercy.”
- `src/data/storyData.ts`, `src/data/learningPath.ts`, `src/components/CulturalTrivia.tsx`
  - Removed unsupported “Håfa Adai literally means What's up” learner-facing wording; local sources support `Håfa Adai` as hello/hi.

### API/audio source lists

Updated static audio source metadata:

- `audio_generation/flashcard_words.json`
  - Added `Måolik ha' yu'`.
  - Replaced `Kao siña un tulaika?` with `Atgun sumångan ennåo`.
  - Replaced `Fan hånao hit` with `Nihi ta hånåo`.
  - Replaced `Kao guåha?` with `Kao guaha?`.
  - Replaced `Hafa bidå-mu?` with `Håfa bidåda-mu?`.
  - Fixed truncated English glosses for `Ti hu komprende` and the old `Fan hånao hit` replacement.
- `audio_generation/manifest.json`
  - Removed stale unsupported/wrong phrase keys for learner-facing teaching.
  - Added/generated static audio entries for corrected phrase keys.
  - Fixed `Ti hu komprende` English metadata.

Generated and uploaded static audio for:

- `Måolik ha' yu'`
- `Atgun sumångan ennåo`
- `Nihi ta hånåo`
- `Kao guaha?`
- `Håfa bidåda-mu?`

Verified the remote S3 manifest has `total_words == 714`, includes the corrected phrase keys, omits the stale phrase keys, and returns HTTP 200 for each new MP3.

## Deferred for native-speaker/teacher review

Still do not rewrite blindly:

- `Mångge ginen hao?` versus `Ginen månu hao?` for “Where are you from?”
- `I na'ån-hu si...` and broader self-introduction patterns
- best app-wide display policy for `Kao` versus `Kåo`
- `Si Yu'os Ma'åse'` versus local-source `Si Yu'us ...` variants
- conversation-scenario restaurant/order sentences such as `Håfa tatatmånu?` as “What do you have?”
- full direction-giving and phone-call scenario sentences
- body-command grammar and family-register questions already deferred in previous passes

## Validation target

After this pass, the canonical usage checker should still report only the existing bare `Lila` story findings until a color/story sentence review pass addresses that text.
