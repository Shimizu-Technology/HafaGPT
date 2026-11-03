# Offline open sentence snapshots, v1

Captured 2026-11-03; scope revised during review round 1. These files are offline evidence with no app, tutor, database, import-job, or RAG consumer. All records remain `unreviewed` and `teaching_eligible: false`; native review is deferred.

| Bundled snapshot | Version | Pairs | License | Orthography |
| --- | --- | ---: | --- | --- |
| Direct Tatoeba API | 2026-11-03 | 228 | CC BY 2.0 FR | unknown |
| OPUS translatewiki | v2026-07-01 | 700 | CC BY 3.0 | unknown |
| **Total** | | **928** | per source | |

The loader returns 928 records, including 675 distinct translatewiki text pairs from 700 alignment rows. Direct Tatoeba covers 197 Chamorro sentences and 228 direct English links. No cross-source spelling normalization or language correction is applied. No historical corpus is bundled; the compatibility argument `include_historical=True` cannot enable removed sources.

## Review disposition

The following snapshots and their now-unreferenced packaged notices were removed. Their registry, editorial, and permission records remain, with `bundling_status: not_bundled` and the reason. All 13 added source records retain ingestion and retrieval disabled (45 registry records, 45 editorial records, 42 permission records total).

| Removed snapshot | Former rows | Reason |
| --- | ---: | --- |
| OPUS Tatoeba | 237 | Insufficient original sentence-owner attribution; direct attributed Tatoeba already covers 226 overlapping pairs. |
| OPUS Wikimedia | 49 | Missing article/contributor attribution; archive-line IDs alone do not provide it. |
| OPUS bible-uedin | 14,486 | Lead review reported 192 corrupted alignments, including Psalm 10:4 pulling an Acts 28:30 fragment; 14.23 MB with no runtime consumer. |

The builder no longer supports those three datasets and requires no raw files for them. The loader rejects their source IDs even if a stale snapshot is copied into its input directory. QED remains unbundled for lack of a clear reuse grant; it was not downloaded.

## Bible edition evidence retained

The removed corpus's Chamorro text matches the **1908 American Bible Society Gospels, Acts, and Psalms**. The lead verified all **7,245 corpus verses** against eBible USFM after markup normalization. This identifies the text edition; it does not validate OPUS's English alignments. The corpus metadata value **2007 is not the edition date**. The [eBible rights page](https://ebible.org/cha/copyright.htm) identifies the American Bible Society translation and marks it public domain (rechecked 2026-11-03).

A future historical Bible lane should be rebuilt directly from verified eBible USFM, with checked verse identifiers and independently validated alignments. That is a separately approved step; this PR does not import it or rewrite historical wording into modern spelling.

## License, identifiers, and translatewiki provenance

The [Tatoeba downloads page](https://tatoeba.org/en/downloads) identifies [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) for sentence data. Every captured source and direct English translation reports that license. Records preserve numeric sentence IDs, both source-page URLs, and owners where supplied; unowned records explicitly retain their source/revision-history links. No indirect links are promoted.

The [OPUS translatewiki package](https://opus.nlpl.eu/legacy/translatewiki-v2026-07-01.php) and its unchanged packaged README/LICENSE identify [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), translatewiki contributors, the [upstream translation dumps](https://translatewiki.net/static/translation-dump), and the OPUS citation (J. Tiedemann, 2012, *Parallel Data, Tools and Interfaces in OPUS*). Both packaged notices remain under `api/data/open_sentences/v1/licenses/`.

Each translatewiki record keeps its stable Moses archive-line IDs and now adds the package's document paths, Chamorro/English XML sentence IDs, scoped XML alignment ID, and upstream dump URL under `provenance`. Pinned alignment XML plus both raw language packages reproduce **all 700 Moses rows byte for byte** before provenance is attached. The packages provide no original translatewiki message keys or individual contributor identities: `message_key: null` and `message_key_status: not_provided_in_opus_package` record that limit. Project-document paths and sentence IDs are not presented as message keys. These are UI localization strings, including placeholders, rather than certified natural-sentence examples. Nothing is displayed in the app.

Header artifacts pin the original download URLs, source versions, and SHA-256 values, including the three translatewiki provenance inputs. Record fields also preserve license, attribution, retrieval date, unknown orthography, and lack of teaching approval. The validator enforces exact source-specific pair/sentence IDs, positive row numbers, document paths, alignment IDs, and provenance IDs; malformed identifiers fail closed.

## Rebuild from pinned inputs

In a private scratch directory, obtain the four captured Tatoeba API pages listed in the direct snapshot header (`tatoeba-api.json`, then `tatoeba-api-2.json` through `-4.json`) and the following translatewiki files:

- `translatewiki.zip`: `https://object.pouta.csc.fi/OPUS-translatewiki/v2026-07-01/moses/ch-en.txt.zip`
- `ch-en.xml.gz`: `https://object.pouta.csc.fi/OPUS-translatewiki/v2026-07-01/xml/ch-en.xml.gz`
- `ch.zip`: `https://object.pouta.csc.fi/OPUS-translatewiki/v2026-07-01/raw/ch.zip`
- `en.zip`: `https://object.pouta.csc.fi/OPUS-translatewiki/v2026-07-01/raw/en.zip`

Do not execute downloads or extract archive members to disk. Run:

```sh
python3 -I api/scripts/build_open_sentence_snapshots.py \
  --raw-dir /path/to/private-raw-dir \
  --output-dir /path/to/empty-rebuilt-v1 \
  --retrieved-at 2026-11-03
```

The builder verifies every raw input against `data/open_sentences/raw_artifacts_v1.json` before output, rejects non-empty destinations and XML entity declarations, reads only named archive members, and checks every translatewiki source string against its alignment. It performs no downloads, database writes, or ingestion. A live API refresh that changes bytes requires a separately versioned capture; do not loosen the pinned hashes to force a rebuild.

## Verification and limits

Regression tests cover the retained counts, removed-source rejection (including historical opt-in), preserved ledger records, malformed-ID fixtures, provenance/row mismatch rejection, pinned input preflight, and output protection. Full repository gate results and final commit are recorded in the PR's Review round 1 section and the worker handoff. No production inspection, native-language certification, provider inference, or ingestion is claimed. No server is needed for this slice.

Review round 1 execution on remote main `6d83b7f`: `./scripts/check.sh` passed with **1,123 API passed / 34 skipped**, **127 Vitest files / 793 tests**, canonical/governance/routing/audio validators, lint, typecheck, production build/PWA/bundle checks. Focused snapshot/source-policy tests: **67 passed**. All four direct Tatoeba pages still match their frozen hashes. A complete pinned CLI rebuild reproduced both retained snapshots and both translatewiki notices byte for byte; a second translatewiki-only rebuild also matched. Source strings are unchanged. No server was started; all owned resources from the earlier #103 QA phase were cleaned. Signed-in browser, production, native-language, and replacement Bible acceptance are not claimed. This branch is independent of #103 and remains held for lead review/merge.
