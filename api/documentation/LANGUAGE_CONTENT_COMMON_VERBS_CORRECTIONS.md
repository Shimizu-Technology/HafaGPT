# Language Content Common Verbs Corrections

Date: 2026-07-01

## Scope

This pass extends the canonical vocabulary layer into common verb content used by beginner/intermediate flashcards, quizzes, the learning path, daily words, and static audio metadata.

The focus was high-confidence lexical correction. Grammar-sensitive first-person/intransitive cards were documented and left for native-speaker/teacher review rather than rewritten from AI judgment.

## Source policy

Primary evidence remains the bundled local dictionaries:

- `dictionary_data/revised_and_updated_chamorro_dictionary.json`
- `dictionary_data/chamoru_info_dictionary.json`
- `dictionary_data/chamorro_english_dictionary_TOD.json`

AI output was not used as authority.

## Canonical entries added

Added source-backed/common-verb entries for:

- `Hu li'e'` — I see / I saw, with revised-dictionary `Hu li'i'` preserved as a variant
- `Hu hungok` — I hear / I heard
- `Hu cho'gue` — I do / I make
- `Hu gimen` — I drink, with revised-dictionary `Hu gimin` preserved as a variant
- `Hu sångan` — I say / I tell / I speak
- `Hu fåhan` — I buy / I purchase
- `Hu guaiya` — I love
- `Hu tungo'` — I know / I understand, with revised-dictionary `Hu tungu'` preserved as a variant
- `Hu nisisita` — I need
- `Ayuda` — help / aid / assist
- `Åbona` — pay / purchase / buy
- `Fa'nå'gue` — teach / educate / instruct
- `Chålek` — laugh / laughter / smile, with a medium-confidence note because Chamoru.info gives a conflicting gloss

Also catalogued, but did not rewrite, current beginner cards that need phrase/grammar review:

- `Hu hånao` — root `hånao/hånåo/hanao` is source-backed, but local examples commonly use `Humånåo yu'` / `Humånao yu'` for first-person intransitive forms.
- `Hu kånno'` — `kånno'` is source-backed for eating something, but dictionaries say it must take an object.
- `Hu maigo'` — root `maigo'/maigu'` is source-backed, but the current `Hu + intransitive` teaching phrase needs educator review.

## Learner-facing corrections

### Frontend

Updated common-verb teaching surfaces:

- `src/data/defaultFlashcards.ts`
  - Replaced incorrect `Hu fåhan` = “I speak / I say” with source-backed `Hu sångan` = “I say / I tell / I speak”.
- `src/data/quizData.ts`
  - Added a quiz item for `Hu sångan`.
- `src/data/learningPath.ts`
  - Removed overbroad “Hu + verb” guidance that implied all Chamorro verbs follow the same beginner pattern.
  - Replaced grammar-sensitive examples with source-backed transitive examples: `Hu li'e'`, `Hu hungok`, and `Hu sångan`.
- `src/data/dailyWords.ts`
  - Corrected `Fanague` → `Fa'nå'gue`.
  - Corrected the example spelling `patgon` → `påtgon`.
  - Corrected lower-case `mannok` → `månnok` in the kelaguen example.

### API/audio source lists

Updated static audio source metadata:

- `audio_generation/flashcard_words.json`
  - Replaced `Hu fåhan` = “I speak / I say” with `Hu sångan` = “I say / I tell / I speak”.
- `audio_generation/manifest.json`
  - Kept existing `Hu fåhan` static audio as a compatibility key, but corrected its English metadata to “I buy / I purchase”.
  - Generated and uploaded static audio for `Hu sångan`.
  - Verified the remote S3 manifest has `total_words == 713`, includes `Hu sångan`, maps `Hu fåhan` to “I buy / I purchase”, and uses the regional S3 audio base URL consistently.

## Deferred for native-speaker/educator review

Do not rewrite these blindly without a reviewer:

- Best beginner first-person form for `go/leave`: current `Hu hånao` vs source examples such as `Humånåo yu'`.
- Best beginner first-person form for `sleep`: current `Hu maigo'` vs source examples using `maigo'/maigu'` with independent pronouns.
- Whether to teach `Hu kånno'` only with an object, or introduce an intransitive eat form such as `chocho/chumocho` in beginner materials.
- Sentence-level examples using `Hu cho'gue`, `Hu nisisita`, `Ayuda`, and broader phrase/request grammar.
