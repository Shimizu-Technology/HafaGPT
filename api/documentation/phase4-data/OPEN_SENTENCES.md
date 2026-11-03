# Offline open sentence snapshots, v1

Captured 2026-11-03. These files make licensed source text inspectable locally. They are not connected to the tutor, an import job, a database, or a RAG collection. All pairs remain `unreviewed` and `teaching_eligible: false`. Native review is deferred; it did not block this offline data work.

| Snapshot | Source version | Pairs | License | Orthography |
| --- | --- | ---: | --- | --- |
| Tatoeba direct API | 2026-11-03 | 228 | CC BY 2.0 FR | unknown |
| OPUS Tatoeba | v2026-07-08 | 237 | CC BY 2.0 FR | unknown |
| OPUS translatewiki | v2026-07-01 | 700 | CC BY 3.0 | unknown |
| OPUS wikimedia | v20260327 | 49 | CC BY-SA 4.0 | unknown |
| OPUS bible-uedin | v1 | 14,486 | CC0 1.0 | historical |
| **Total records** | | **15,700** | per pair / per subset | |

The default loader returns **1,214 non-historical records**; explicit `include_historical=True` is required for the Bible subset. This is a source inventory, not 15,700 independent or verified sentences. Tatoeba API and OPUS Tatoeba overlap, Bible alignments repeat source verses against two English documents, and translatewiki contains UI strings/placeholders. Exact string-pair comparison found 226 pairs shared by direct Tatoeba and OPUS Tatoeba. Within OPUS snapshots, exact distinct text-pair counts are 227/237 (Tatoeba), 675/700 (translatewiki), 49/49 (wikimedia), and 14,452/14,486 (Bible). Original alignment rows remain separately attributable; no cross-source deduplication or spelling normalization was applied.

## License and attribution evidence

The [Tatoeba downloads page](https://tatoeba.org/en/downloads) identifies CC BY 2.0 FR for sentence data; every captured API sentence and direct English translation also reports that license. Four API pages contain 197 Chamorro sentences with 228 direct English links. Indirect links were not requested or promoted. Sentence owners are preserved when returned; otherwise the attribution says unowned and retains links to the original sentence and revision history.

The OPUS subset pages and the README/LICENSE inside each pinned archive agree:

- [Tatoeba](https://opus.nlpl.eu/legacy/Tatoeba-v2026-07-08.php): [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/).
- [translatewiki](https://opus.nlpl.eu/legacy/translatewiki-v2026-07-01.php): [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- [wikimedia](https://opus.nlpl.eu/legacy/wikimedia-v20260327.php): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Retain attribution and this subset's share-alike license on redistribution/adaptation; a source's license is not replaced by a repository code license.
- [bible-uedin](https://opus.nlpl.eu/legacy/bible-uedin.php): [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The packaged notice credits Christos Christodoulopoulos and Mark Steedman's Bible corpus as well as OPUS. Bible-derived language is kept in the historical lane regardless of this permissive license.

Packaged README and full license notices are copied unchanged under `api/data/open_sentences/v1/licenses/`. Per-pair attribution includes the source and OPUS citation (J. Tiedemann, 2012, *Parallel Data, Tools and Interfaces in OPUS*). The structured text copies retain source spelling and punctuation. Removing the plain-text archive's line delimiter and wrapping strings in JSON are the only text transformations.

[QED](https://opus.nlpl.eu/legacy/QED.php) was skipped: its page describes QCRI all-rights-reserved material without a clear reuse license. No QED sentence archive was downloaded. The [1908 ABS rights page](https://ebible.org/cha/copyright.htm) separately identifies its edition as public domain; it is registered as a historical candidate, not separately imported or equated with every OPUS Bible document.

## Identifiers and provenance

Every pair contains source ID/URL, license and license URL, attribution, both language strings, sentence IDs and their kind, retrieval date, orthography, and unreviewed/offline status.

- Direct Tatoeba pairs use original Tatoeba numeric sentence IDs and both source-page URLs.
- The three modern OPUS Moses packages contain aligned text and notices, but no original contributor sentence IDs. Their `archive_line` identifiers name the actual archive member and one-based line, scoped to the pinned source version and SHA-256. They are reproducible artifact identifiers, not invented Tatoeba/Wikimedia contributor IDs.
- Bible pairs preserve the original OPUS XML `xtargets` sentence IDs, including one-to-many links, and the source document paths. The archive has 7,241 alignments to `en/English-WEB.xml.gz` and 7,245 to `en/English.xml.gz`; the combined Moses files contain 14,486 rows in that order.
- Each snapshot header records its download URL, upstream version, pair count, and raw artifact SHA-256. Tatoeba records all four captured page checksums. The source inventory/permission/editorial ledgers all keep RAG ingestion and retrieval disabled for these additions.

`unknown` is used unless the source establishes an orthography. These snapshots make no claim to Guam 2024 or CNMI spelling. Historical Bible wording is never rewritten into modern spelling.

## Rebuild without executing downloads

Create a new private temporary directory for raw files. Download the pinned OPUS archives from the URLs recorded in the snapshot headers, naming them `Tatoeba.zip`, `translatewiki.zip`, `wikimedia.zip`, and `bible-uedin.zip`. Fetch the Tatoeba API URL in its header, saving the first page as `tatoeba-api.json` and following the server's `paging.next` links as `tatoeba-api-2.json` etc. Check that the final page has no next page. Do not execute any downloaded file or copy audio.

From the repository root, parse the raw data with isolated Python:

```sh
python3 -I api/scripts/build_open_sentence_snapshots.py \
  --raw-dir /path/to/new-private-temp-dir \
  --output-dir /path/to/rebuilt-v1 \
  --retrieved-at 2026-11-03
```

The builder verifies every raw input against `data/open_sentences/raw_artifacts_v1.json` before creating output and rejects an existing non-empty output directory. It only reproduces the pinned 2026-11-03 v1 capture. A live API refresh can change owners, links, or text; record a new capture/version and approved manifest instead of silently replacing an artifact. The builder checks languages, direct links, licenses, pagination totals, alignment counts, archive member sizes, and XML IDs. It reads named members without extraction and rejects XML entity declarations. It performs no network requests or database writes. The offline loader separately validates the resulting provenance and digest shape, license, dates, duplicate IDs, orthography flags, and approval status.

## Verification and limits

Focused loader/source-policy tests check the counts above, historical exclusion, original-versus-artifact ID kinds, missing/invalid metadata rejection, and fail-closed ingestion/retrieval. Rebuilding from the captured raw files must reproduce the checked-in JSON and notices byte for byte. No linguistic correction, native certification, full semantic alignment audit, live tutor evaluation, production inspection, or RAG ingestion is claimed here.

Execution on integration base `4d5b75a` (design PR #101 and evaluation PR #102 included): `./scripts/check.sh` passed with **927 API tests passed / 34 skipped**, **127 Vitest files / 793 tests passed**, canonical/governance/routing/audio checks, lint, typecheck, production build, PWA, and bundle checks. The first pre-integration run found the old HTTPS citation expectation; the expectation was updated to the verified HTTP dictionary URL and the complete gate rerun successfully. A clean rebuild from the captured downloads reproduced all JSON and packaged notices byte for byte. No server was started for this slice, and no database ingestion, embedding, or provider inference was performed.

After the initial CodeRabbit review, pinned raw-input preflight and output-directory protection were added, artifact digest validation was tightened, and source-citation availability handling was verified. The complete gate passed again: **936 API tests passed / 34 skipped**, **793 Vitest tests**, all validators/lint/typecheck/build checks. A second clean pinned rebuild remained byte-for-byte identical to the committed snapshots and notices. Original sentence data did not change during review fixes.
