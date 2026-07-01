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
| Black | `Å'tot`, `Åttelong`, `Attelong` | `Åttilung` | Local sources support `åttilung` / `åttilong` / `attilong`; `Å'tot` was not supported as black. |
| Brown | `Såksan`, `Kulot kafe` | `Kulot chukulåti` | Local sources support chocolate-color forms such as `kulót chukulåti`, `kulot chikolåti`, `kulot chokolåti`. |
| Orange | `Lalala`, `Kulot kahel` | `Kulot kåhet` | `Kulot kåhet` is the canonical teaching/audio form; local sources also support the source variant `kulót kåhit`. `Lalala` was not supported as orange. |
| Pink | `Rosa`, `Kulot rosa` | `Kulot di rosa` | Local sources support the full phrase `kulot di rosa` for pink. |
| Gray | `Gris` | `Kulot åpu` | Local sources support `kulot åpu`. |
| Purple | `Lila` in game/audio word lists | `Kulot lila` | Local color entries use the full phrase `kulot lila`; one story sentence still needs native-speaker review before rewriting. |
| Yellow | `Åmariyu` in some places, including the old flashcard audio word list | `Amariyu` | This spelling normalization is intentional: the revised dictionary and TOD source use `Amariyu`; `Åmariyu` remains recorded as a source-backed variant pending reviewer sign-off. |

## Audio correction

Static audio was regenerated for the corrected color terms:

- `Kulot chukulåti`
- `Kulot di rosa`
- `Kulot åpu`
- `Kulot kåhet`
- `Kulot lila`
- `Åttilung`

The local and S3 static audio manifests now map those corrected terms and no longer map the old color-teaching entries: `Såksan`, `Lalala`, `Gris`, `Rosa`, `Kulot kafe`, `Kulot kahel`, `Kulot rosa`, `Åttelong`, or bare `Lila`.

## Remaining work

One story sentence still needs review before correction:

- `HafaGPT-frontend/src/data/storyData.ts`: `Lila i kulot-ña.`

This may be acceptable usage, but the local dictionary entries found in Phase 2 cite the full color phrase `kulot lila`. Do not rewrite the sentence blindly without a speaker/teacher review of natural grammar.

Pronunciation guides and phonetic hints remain provisional and should be reviewed by a fluent speaker/teacher. The `Åttilung` guide is aligned to the project pronunciation note that `Å` sounds like `aw` in `saw`, while still marked as needing native-speaker review.
