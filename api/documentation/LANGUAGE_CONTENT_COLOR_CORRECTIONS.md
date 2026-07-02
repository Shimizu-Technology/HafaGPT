# Source-Backed Color Content Corrections

## Scope

This document records the first Phase 3 language-content corrections made from the Phase 2 canonical vocabulary seed.

Corrected surfaces:

- `HafaGPT-frontend/src/data/defaultFlashcards.ts`
- `HafaGPT-frontend/src/data/quizData.ts`
- `HafaGPT-frontend/src/data/dailyWords.ts`
- `HafaGPT-frontend/src/data/learningPath.ts`
- `HafaGPT-frontend/src/components/ColorTouch.tsx`
- `HafaGPT-frontend/src/components/PicturePairs.tsx`
- `HafaGPT-frontend/src/components/SoundMatch.tsx`
- `HafaGPT-API/audio_generation/flashcard_words.json`
- `HafaGPT-API/audio_generation/tier1_words.json`
- `HafaGPT-API/audio_generation/chamorro_pronunciations.json`
- `HafaGPT-API/audio_generation/manifest.json`
- generated static audio files for corrected color terms

## Corrections applied

| English | Previous app term(s) | Source-backed teaching term now used | Notes |
|---|---|---|---|
| Black | `Å'tot`, `Åttelong`, `Attelong` | `Åttilung` | RUCD/Finder support `åttilung`; Chamoru.info/TOD support `åttilong` / `attilong`. Exact `Åttelong` / `Attelong` app spellings are deprecated because the sourced forms are `Åttilung`, `Åttilong`, and `Attilong`. |
| Brown | `Såksan`, `Kulot kafe` | `Kulot chukulåti` | Local sources support chocolate-color forms such as `kulót chukulåti`, `kulot chikolåti`, `kulot chokolåti`. |
| Orange | `Lalala`, `Kulot kahel` | `Kulot kåhet` | `Kulot kåhet` is the canonical teaching/audio form; local sources also support `kulót kåhit` and unaccented `kulot kahet` variants. `Lalala` was not supported as orange. |
| Pink | `Rosa`, `Kulot rosa` | `Kulot di rosa` | Local sources support the full phrase `kulot di rosa` for pink. |
| Gray | `Gris` | `Kulot åpu` | Local sources support `kulot åpu`. |
| Purple | bare `Lila` in beginner game/audio word lists | `Kulot lila` for the beginner phrase; `Lila` remains valid | Local sources support both `kulot lila` as the color phrase and bare `lila` as purple. Do not treat story/adjective uses of `Lila` as wrong. |
| Yellow | `Åmariyu` in some places, including the old flashcard audio word list | `Amariyu` | This spelling normalization is intentional: the revised dictionary and TOD source use `Amariyu`; `Åmariyu` remains recorded as a source-backed variant pending reviewer sign-off. |

## Audio correction

Static audio was regenerated for the corrected color terms:

- `Kulot chukulåti`
- `Kulot di rosa`
- `Kulot åpu`
- `Kulot kåhet`
- `Kulot lila`
- `Åttilung`

The local and S3 static audio manifests now map those corrected beginner color terms and no longer map the old unsupported color-teaching entries: `Såksan`, `Lalala`, `Gris`, `Rosa`, `Kulot kafe`, `Kulot kahel`, `Kulot rosa`, or `Åttelong`. Bare `Lila` is source-backed, but the beginner audio/game color key uses `Kulot lila` for clarity.

## Remaining work

No correction is currently required for the story's bare `Lila` color vocabulary because RUCD and LearningCHamoru support `lila` as purple. A later story/style review may still decide whether the sentence should use `kulot lila` for pedagogy, but it should not be treated as an accuracy defect.

Pronunciation guides and phonetic hints remain provisional and should be reviewed by a fluent speaker/teacher. The `Åttilung` guide is aligned to the project pronunciation note that `Å` sounds like `aw` in `saw`, while still marked as needing native-speaker review.
