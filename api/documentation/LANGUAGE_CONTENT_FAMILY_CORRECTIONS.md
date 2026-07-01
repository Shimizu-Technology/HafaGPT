# Language Content Family Corrections

Date: 2026-07-01

## Scope

This pass extends the canonical vocabulary layer from colors, numbers, and greetings into beginner family terms. The goal is not to erase legitimate variants, but to make learner-facing flashcards/quizzes/games/audio line up with source-backed canonical entries where the evidence is clear.

## Source policy

Primary evidence remains the bundled local dictionaries:

- `dictionary_data/revised_and_updated_chamorro_dictionary.json`
- `dictionary_data/chamoru_info_dictionary.json`
- `dictionary_data/chamorro_english_dictionary_TOD.json`

For `Nåna` / mother, the bundled dictionaries are missing or conflicting, so this pass records current external references instead of pretending the local JSON is sufficient:

- Chamoru.info online dictionary entry for `nåna`: “Mother; a female parent.”
- Post Guam, “Si Nana gi familia”: notes that `nana` is used for mother, grandmother, or a mother-figure.

That entry remains marked for native-speaker/educator review even though it is source-backed externally.

## Canonical entries added

Added source-backed family entries for:

- `Familia` — family
- `Nåna` — mother / mom
- `Tåta` — father / dad
- `Che'lu` — sibling / brother / sister
- `Låhi` — son / boy / male
- `Håga` — daughter
- `Biha` — grandmother / old woman
- `Bihu` — grandfather / old man
- `Asagua` — spouse / husband / wife
- `Prima` — female cousin
- `Primu` — male cousin
- `Påtgon` — child
- `Famagu'on` — children / kids
- `Tihu` — uncle, with `Tiu` preserved as a source-backed variant
- `Tiha` — aunt, with `Tia` preserved as a source-backed variant
- `Mañaina` — parents / elders
- `Guella` — grandmother / female ancestor
- `Guello` — grandfather

## Learner-facing corrections

### Frontend

Updated beginner/static teaching surfaces:

- `src/data/defaultFlashcards.ts`
  - `Nana` → `Nåna`
  - `Tata` → `Tåta`
  - `Lahi` → `Låhi`
  - `Haga` → `Håga`
  - split `Prima / Primu` into separate `Prima` and `Primu` cards
  - `Tiu` → `Tihu`
  - `Tia` → `Tiha`
- `src/data/dailyWords.ts`
  - `Tiu` → `Tihu`
  - `Tia` → `Tiha`
- `src/data/quizData.ts`
  - teaches `Tåta`, `Tihu`, and `Tiha`
  - keeps `Tiu` acceptable for the uncle typed-answer question because dictionaries list it as a variant
- `src/components/ChamorroWordle.tsx`
  - `NANÅ` → `NÅNA`
  - `LAHI` → `LÅHI`
  - `PATGON` → `PÅTGON`
  - removed truncated `FAMAGU` as “children”; replaced with source-backed `CHE'LU`

### API/audio source lists

Updated curated flashcard audio source list:

- `Nana` → `Nåna`
- `Tata` → `Tåta`
- `Lahi` → `Låhi`
- `Haga` → `Håga`
- split `Prima / Primu` into `Prima` and `Primu`
- `Tiu` → `Tihu`
- `Tia` → `Tiha`

Generated new static audio for:

- `Nåna`
- `Tåta`
- `Låhi`
- `Håga`
- `Prima`
- `Primu`

The existing `tihu.mp3` and `tiha.mp3` audio files are reused directly by canonical `Tihu` and `Tiha` manifest entries. The older `Tiu` and `Tia` keys remain as compatibility aliases pointing to `Tihu` and `Tiha`.

## Variants intentionally preserved

These forms are legitimate or externally attested and should not be blindly erased from the language record:

- `Nana` as a common/source-backed unaccented form for `Nåna`
- `Tata`, `Lahi`, `Haga`, and `Patgon` as source-backed unaccented variants from TOD-style entries
- `Tiu` / `Tia` as dictionary-listed variants of `Tihu` / `Tiha`
- `Nånan biha` / `Tåtan bihu` as externally attested grandmother/grandfather variants pending native-speaker review
- `Biha` / `Bihu` and `Guella` / `Guello` both remain source-backed grandparent terms with different register/context questions to review

For beginner app display, the corrected terms above are now primary. The static audio manifest may retain source-backed variant keys for backward compatibility with existing saved decks and currently deployed clients; those variants are documented rather than treated as linguistically invalid.

## Deferred for native-speaker/educator review

- Best beginner display for mother: `Nåna` is externally source-backed, but bundled local dictionaries conflict/omit it.
- Register/tone of `Biha` / `Bihu` versus `Guella` / `Guello` for teaching “grandmother/grandfather.”
- Whether `Nånan biha` / `Tåtan bihu` should remain in culture flashcards or be moved to variant notes only.
- Sentence-level family story phrases such as `tata-hu`, `nana-hu`, `che'lu-hu`, and `familia-hu`; these were not rewritten in this pass.
