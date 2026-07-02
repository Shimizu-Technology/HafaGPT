# Language Content Source Review Follow-up

Date: 2026-07-02

## Scope

This follow-up rechecked the language-content corrections against the bundled dictionaries, local PDF resources, and a small set of public web sources. The goal was to make sure HåfaGPT does not over-correct valid variants or promote unsupported spellings.

## Sources checked

- `dictionary_data/revised_and_updated_chamorro_dictionary.json`
- `dictionary_data/chamoru_info_dictionary.json`
- `dictionary_data/chamorro_english_dictionary_TOD.json`
- `knowledge_base/pdfs/english_chamorro_finder_list_2024.pdf`
- `knowledge_base/pdfs/Revised-Chamorro-Dictionary.pdf`
- LearningCHamoru public dictionary search
- IKNM/KAM web dictionary pages
- Visit Guam Simple CHamoru Greetings

## Follow-up decisions

| Topic | Decision |
|---|---|
| Food spelling | Use `Nengkanno'` as the primary beginner food/nourishment term. Preserve `Nenkanno'`, `Néngkanu'`, and `Boka` as variants. Remove unsupported mixed `Nengkånno'`. |
| Purple | `Kulot lila` remains the beginner phrase, but bare `Lila` is source-backed and should not be flagged as wrong. |
| Black | Keep `Åttilung` primary from RUCD/Finder 2024; preserve `Åttilong` / `Attilong` as source-backed variants. Exact legacy `Åttelong` / `Attelong` remains deprecated. |
| One | Keep `Unu` primary. `Uno` is the Spanish etymon/common expectation, but sources support `Unu`; `Hacha` can be taught later as an indigenous/classical form. |
| Greetings | Keep `Buenas dias` / `Buenas tåtdes` as dictionary-backed beginner display terms. Preserve Visit Guam `Mañana si Yu'os` and `Ha'anen Maolek` as externally attested phrase variants pending teacher review. |
| Orange | Keep `Kulot kåhet` primary; preserve `Kulót kåhit` and `Kulot kahet` as source-backed variants. |
| Food/drink variants | Preserve dictionary splits such as `Kåtne`/`Kåtni`, `Månnok`/`Månnuk`/`Mannok`, `Kåddo`/`Kaddo`/`Kåddu`/`Kåtdu`, `Hånom`/`Hånum`/`Hanom`, `Niyok`/`Niyuk`, and `Månnge'`/`Månngi'`. |

## Implementation notes

- This follow-up avoids treating valid source-backed variants as errors.
- Primary beginner display terms remain singular for consistency, but variants are recorded in canonical vocabulary so future searches, saved decks, and reviewer discussions have context.
- Phrase-level items remain lower-confidence than single-word vocabulary unless a source gives the exact phrase.
