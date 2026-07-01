# Language Content Food & Drinks Corrections

Date: 2026-07-01

## Scope

This pass extends the canonical vocabulary layer into food and drink content used by flashcards, quizzes, learning-path copy, games, daily words, story vocabulary, conversation scenarios, and static audio. The goal is to correct high-confidence learner-facing drift while preserving legitimate source-backed variants.

## Source policy

Primary evidence remains the bundled local dictionaries:

- `dictionary_data/revised_and_updated_chamorro_dictionary.json`
- `dictionary_data/chamoru_info_dictionary.json`
- `dictionary_data/chamorro_english_dictionary_TOD.json`

AI output was not used as authority. Where sources conflict or a term is valid but was paired with the wrong English gloss, the canonical notes preserve that nuance instead of treating the word as invalid.

## Canonical entries added

Added source-backed food/drink entries for:

- `Nengkånno'` — food / nourishment, with `Nenkanno'` and `Boka` preserved as source-backed variants
- `Hineksa'` — cooked rice
- `Guihan` — fish
- `Kåtne` — meat / flesh
- `Månnok` — chicken / poultry, with `Mannok` preserved as a source-backed variant
- `Månha` — green coconut, preserved as a valid term but removed from chicken teaching
- `Kåddo` — soup / broth / stew
- `Gollai` — vegetable(s)
- `Hånom` — water / liquid
- `Kafé` — coffee, with `Kåfe` / `Kafe` preserved as variants
- `Niyok` — coconut / coconut palm
- `Kelaguen` — citrus-cured meat dish
- `Fina'denne'` — hot sauce / condiment
- `Chotda` — green banana / banana tree
- `Mångga` — mango, with `Mangga` preserved as a source-backed variant
- `Månnge'` — delicious
- `Chåda'` — egg
- `Babui` — pig / swine
- `Buen prubetchu` — you're welcome, correcting the unsupported old meal-phrase card

## Learner-facing corrections

### Frontend

Updated food and drink teaching surfaces:

- `src/data/defaultFlashcards.ts`
  - `Kånno'` as “Food” → `Nengkånno'` as “Food / Nourishment”
  - `Månha` as “Chicken” → `Månnok` as “Chicken / Poultry”
  - `Kådu` as “Soup / Stew” → `Kåddo` as “Soup / Broth / Stew”
  - `Lechuga` as “Lettuce / Vegetables” → `Gollai` as “Vegetables”
  - `Kelaguen` → “Citrus-cured meat dish” instead of requiring “grilled”
  - `Niyok` gloss clarified to “Coconut / Coconut palm”
  - unsupported `Buen prubechu` “Enjoy your meal / Bon appetit” card → source-backed `Buen prubetchu` “You're welcome”
  - sentence examples now use `nengkånno'` for the food noun while leaving `Hu kånno'` intact as the eat verb
- `src/data/quizData.ts`
  - Kelaguen answer/explanation now says “citrus-cured meat dish” rather than “grilled dish with lemon”
- `src/data/learningPath.ts`
  - food key phrases now say `Hineksa' — Cooked rice` and `Niyok — Coconut palm`
- `src/data/dailyWords.ts`
  - `Mannok` → `Månnok`
  - `Chotda` gloss clarified to green banana / banana tree
  - `Kelaguen` gloss clarified to citrus-cured meat dish
  - `Niyok` gloss clarified to coconut / coconut palm
- `src/components/SoundMatch.tsx` and `src/components/PicturePairs.tsx`
  - `Mannok` → `Månnok`
  - `Mangga` → `Mångga`
  - `Hineksa` → `Hineksa'`
  - `Månnge` → `Månnge'`
  - `Chåda` → `Chåda'`
  - food glosses clarified for `Niyok`, `Chotda`, and `Kelaguen`
- `src/components/ChamorroWordle.tsx`
  - removed truncated unsupported food forms `MANGÅ` and `GALÅI`
  - added/uses source-backed `NIYOK`, `KÅDDO`, `MÅNGGA`, and `GOLLAI`
  - changed `CHOCHO` meaning from “food/eat” to “eat”
- `src/components/CulturalTrivia.tsx`
  - `Hanom` → `Hånom`
  - clarified `Niyok` versus valid `Månha` green-coconut distractor
- `src/data/storyData.ts`
  - replaced English `red rice` inside Chamorro story text with `hineksa' agaga'`

### API/audio source lists

Updated audio source lists:

- `audio_generation/tier1_words.json`
  - `Mannok` → `Månnok`
  - `Mangga` → `Mångga`
  - `Hineksa` → `Hineksa'`
  - `Månnge` → `Månnge'`
  - `Chåda` → `Chåda'`
  - clarified English glosses for `Niyok`, `Chotda`, and `Hineksa'`
- `audio_generation/flashcard_words.json`
  - `Buen prubechu` → `Buen prubetchu`
  - `Månha` as chicken → `Nengkånno'` food noun entry, while chicken teaching uses existing/new `Månnok`
  - `Kådu` → `Kåddo`
  - `Lechuga` → `Gollai`
  - added `Fina'denne'`
  - clarified `Kelaguen`

Generated and uploaded static audio for:

- `Mångga`
- `Hineksa'`
- `Månnge'`
- `Chåda'`
- `Buen prubetchu`
- `Nengkånno'`
- `Kåddo`
- `Gollai`
- `Fina'denne'`

Removed stale unsupported/wrong static audio manifest mappings for:

- `Buen prubechu`
- `Månha` as chicken
- `Kådu` as soup/stew
- `Lechuga` as vegetables

Kept compatibility manifest aliases for deployed clients / saved content where the old key is source-backed or a harmless orthographic fallback:

- `Mannok` → `Månnok`
- `Hineksa` → `Hineksa'`
- `Mangga` → `Mångga`
- `Månnge` → `Månnge'`
- `Chåda` → `Chåda'`

## Variants intentionally preserved

- `Månha` is valid, but means green coconut with tender meat; it should not be taught as chicken.
- `Mannok`, `Mangga`, and `Kafe` are source-backed unaccented/TOD-style variants.
- `Boka` is source-backed as food/eat/eaten but was not selected as the beginner food-noun display because `Nengkånno'` is the clearer noun for food/nourishment in this app context.
- `Hineksa`, `Månnge`, and `Chåda` are retained only as compatibility/search fallbacks where they omit source-backed glottal stops.

## Deferred for native-speaker/educator review

- Best beginner display for `Nengkånno'` versus `Nengkanno'`, `Nenkanno'`, and `Boka`.
- Whether `Niyok` should be glossed as “coconut palm” only, or “coconut / coconut palm” for beginner food contexts.
- Best way to teach `Månha` (green coconut) alongside `Niyok` without confusing beginners.
- Phrase-level food/restaurant sentences such as `Kao malago' hao hånom?`, `Malago' yu' nengkånno'`, and `Håfa tatatmånu?`; this pass only corrected noun stems and obvious unsupported phrase meaning.
