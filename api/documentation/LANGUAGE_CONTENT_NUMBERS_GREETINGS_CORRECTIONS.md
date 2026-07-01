# Source-Backed Numbers and Greetings Corrections

## Scope

This document records the second canonical language-content correction pass after colors. The focus is beginner numbers and high-visibility greeting/basic phrases.

Corrected surfaces:

- `HafaGPT-frontend/src/data/defaultFlashcards.ts`
- `HafaGPT-frontend/src/data/dailyWords.ts`
- `HafaGPT-frontend/src/data/quizData.ts`
- `HafaGPT-frontend/src/components/SoundMatch.tsx`
- `HafaGPT-frontend/src/components/NumberTap.tsx`
- `HafaGPT-frontend/src/components/CulturalTrivia.tsx`
- `HafaGPT-API/audio_generation/flashcard_words.json`
- `HafaGPT-API/audio_generation/tier1_words.json`
- `HafaGPT-API/audio_generation/chamorro_pronunciations.json`
- `HafaGPT-API/audio_generation/manifest.json`

## Number corrections applied

| English | Previous app term(s) | Source-backed teaching term now used | Notes |
|---|---|---|---|
| One | `Uno` | `Unu` | Local dictionary sources support `unu`; app examples already used `Unu` in sentence context. |
| Four | `Kuåttro` | `Kuåtro` | Local sources support `kuåtro` / `kuatro`, with `kuåttru` recorded as a revised-dictionary variant. |
| Five | `Sinku`, `Singko` | `Sinko` | Local sources support `sinko`, with `singku` recorded as a revised-dictionary variant. |
| Seven | `Siette` | `Siete` | Local sources support `siete`, with `sietti` recorded as a revised-dictionary variant. |
| Nine | `Nuebe` | `Nuebi` | Local dictionary sources support `nuebi`. |

No changes were needed for `Dos`, `Tres`, `Sais`, `Ocho`, or `Dies` beyond adding canonical records and citations.

## Greeting/basic corrections applied

| English | Previous app term(s) | Source-backed teaching term now used | Notes |
|---|---|---|---|
| Hello / Hi | `Buenas yan hågu` as Hello | `Håfa Adai`; `Buenas dias` for good morning/hello contexts | No local dictionary headword was found for teaching `Buenas yan hågu` as Hello. |
| Good morning | `Mañana si Yu'os` | `Buenas dias` | Local sources support `buenas dias`; no local dictionary source was found for the old phrase as Good morning. |
| Good afternoon | `Buenas tatdes` | `Buenas tåtdes` | Diacritic teaching form is backed by `chamoru_info`; TOD has the unaccented spelling. |
| Goodbye | `Bula` as informal Goodbye | `Adios`; `Asta agupa'` for See you tomorrow | Local sources define `bula` as much/plenty/lots, not goodbye. `Bula` remains valid in non-goodbye contexts. |
| Yes / No | existing `Hunggan`, `Åhe'` | `Hunggan`, `Åhe'` | Added canonical citations and used these as source-backed basics in the greetings deck. |

## Audio correction

Static audio was generated or activated for the corrected terms:

- `Unu`
- `Kuåtro`
- `Sinko`
- `Siete`
- `Nuebi`
- `Buenas tåtdes`
- `Asta agupa'`

The local and S3 static audio manifests now map corrected terms and no longer map stale teaching entries for `Uno`, `Kuåttro`, `Singko`, `Sinku`, `Siette`, `Nuebe`, `Buenas yan hågu`, `Buenas tatdes`, or `Bula` as goodbye.

## Remaining work

Some greeting/introductory phrases remain useful but need phrase-level review before deeper correction, especially:

- `Maolek ha' yu'`
- `Håyi na'ån-mu?`
- `I na'ån-hu si...`
- `Kao siña un ayuda yu'?`
- sentence-level uses of `Buenas yan hågu` in conversation scenarios
- spelling variants around `Si Yu'os Ma'åse'` vs local-source `Si Yu'us ...` forms

Those were not rewritten blindly because phrase grammar and common usage should be confirmed by a fluent speaker/teacher.
