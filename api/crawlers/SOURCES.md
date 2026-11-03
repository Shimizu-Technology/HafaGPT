# Language source inventory

Updated 2026-11-03. The enforceable policy is [the source registry](../data/language_source_registry.json), with [rights/outreach records](../data/source_permission_records.json) and [editorial dispositions](../data/source_review_records.json). Public access does not grant copying, embedding, or teaching rights.

## Current runtime and retained sources

The code defaults to **`hafagpt_governed_openai_v3`**, OpenAI `text-embedding-3-small` at **384 dimensions**, and the main tutor's `gpt-5.6-luna` setting via OpenRouter. Environment overrides and separate feature/fallback models exist. The 2026-11-03 read-only local audit measured **14,800 distinct v3 documents**; production state was not inspected here. The legacy `chamorro_grammar` collection is retained separately. Old December 2024 counts and numeric crawler priorities do not describe current eligibility.

| Source | Current scope |
| --- | --- |
| Local Revised snapshot / Natibu Marianas lineage | CNMI 2010 lexical reference; legacy snapshot remains available while provenance/permission work continues. No new ingestion grant. |
| [Chamoru.info dictionary](http://www.chamoru.info/dictionary/) | Mixed source traditions; remains in use by Leon's decision while permission is pending. Derivative lineage is not independent corroboration. HTTP dictionary returned 200; HTTPS failed certificate validation. |
| [Chamoru.info lessons](http://www.chamoru.info/language-lessons/) | Registered transitional pedagogy. Scheme corrected, but the HTTP lessons endpoint returned 500 during this check; HTTPS was also unavailable. Citation links are suppressed while the endpoint fails; retained source content remains available. |
| Topping, Ogo, and Dungca (1975) | Legacy orthography, scoped historical/lexical evidence; permission still unresolved. |
| Sandra Chung, Chamorro Grammar (2020) | Grammar reference; full-text reuse permission remains unresolved. |
| Guampedia / copied Lengguahi-ta stories | Blocked pending written permission; old crawler priority numbers do not override policy. |
| Rosetta / nineteenth-century dictionary snapshots | Historical lane; item-level provenance and rights remain separate concerns. |

See [HOW_RAG_WORKS.md](../documentation/HOW_RAG_WORKS.md) for the actual request flow and source controls.

## Corrected official references

- **Chosen Guam 2024 orthography edition:** [official-hosted 2024 PDF](https://kumisionchamoru.guam.gov/wp-content/uploads/2024/11/Utugrafihan-CHamoru-Guahan-3rd-Ed-2024_Kumision-i-Fino-CHamoru_Digital.pdf). Returned 200; its copyright page says 2024 and ISBN 979-8-9860913-2-7. The former encoded February 2025 URL is broken. The [landing page](https://kumisionchamoru.guam.gov/utugrafihan-chamoru-guahan/) now advertises a **2027** download, registered separately as an unreviewed candidate; it is not silently substituted for the chosen 2024 edition.
- **Guam official languages:** [Compiler of Laws, 1 GCA Chapter 7](https://col.guamcourts.gov/sites/default/files/01gc007.pdf), § 706. Returned 200, linked from the official compiler's current code index. Retains the old URL as a matching alias; full-title vectorization stays disabled.

## New candidates and licensed offline data

Every new record has **ingestion and retrieval disabled**. Rights permitting an offline snapshot do not authorize a RAG run or certify language accuracy.

| Source ID | Evidence / license | Disposition |
| --- | --- | --- |
| `diksionariu_com` | [Dictionary](https://diksionariu.com/); upstream rights and AI restrictions need written scope | Permission required; no CSV/morphology/audio download. Direct HTTP client returned 403; the web reader confirmed the public page. |
| `kumision_historical_dictionary_shelf` | [Official publications](https://kumisionchamoru.guam.gov/lepblo-siha-publications/); 1865, 1903, 1910, 1918, 1932, 1995 scans appear in the official site inventory | Historical lane; confirm each work and scan. No shelf-wide public-domain assumption. |
| `gdoe_chlccspi_2025` | [CHLCCSPI PDF](https://www.gdoe.net/files/user/59/file/CHLCCSPI-(Medidan-Suhetu)-GEB-Approved-2025.pdf), returned 200 | Permission required. Filename says 2025; landing-page approval year says 2026. |
| `tatoeba_chamorro` | [Tatoeba downloads](https://tatoeba.org/en/downloads), CC BY 2.0 FR | 228 direct English pairs from 197 Chamorro sentences; unreviewed, orthography unknown. |
| `opus_tatoeba_ch_en` | [OPUS Tatoeba v2026-07-08](https://opus.nlpl.eu/legacy/Tatoeba-v2026-07-08.php), CC BY 2.0 FR | `not_bundled`: 237-row snapshot removed for missing original owner attribution; 226 overlap direct Tatoeba. |
| `opus_translatewiki_ch_en` | [OPUS translatewiki v2026-07-01](https://opus.nlpl.eu/legacy/translatewiki-v2026-07-01.php), CC BY 3.0 | 700 offline UI localization pairs with package document/sentence/alignment provenance; no original message keys supplied. Not certified natural-sentence examples. |
| `opus_wikimedia_ch_en` | [OPUS wikimedia v20260327](https://opus.nlpl.eu/legacy/wikimedia-v20260327.php), CC BY-SA 4.0 | `not_bundled`: 49-row snapshot removed for missing article/contributor attribution. |
| `opus_bible_uedin_ch_en` | [OPUS bible-uedin v1](https://opus.nlpl.eu/legacy/bible-uedin.php), CC0 1.0 | `not_bundled`: 14,486-row snapshot removed for corrupted alignments; identified text is the 1908 ABS edition, not corpus metadata 2007. |
| `opus_qed_ch_en` | [OPUS QED](https://opus.nlpl.eu/legacy/QED.php), no clear reuse grant on inspected page | Skipped; 9 reported pairs were not downloaded. |
| `abs_bible_1908` | [eBible rights page](https://ebible.org/cha/copyright.htm), Public Domain | Historical reference only. Lead matched all 7,245 corpus verses to eBible USFM after markup normalization; future rebuilding directly from eBible requires separate approval. No text/audio import. |
| `kumision_audio_programs` | [Word of the Day](https://kumisionchamoru.guam.gov/pruyekto-siha-projects/fino-i-haani-word-of-the-day/) and official interview/read-along projects | Permission and recording-level consent required; no audio downloaded. |
| `kumision_seyon_inafitma` | [Seyon Inafitma](https://kumisionchamoru.guam.gov/community-services/seyon-inafitma/), returned 200 | Human review/certification route; registration is not an endorsement or approval. |
| `kumision_guam_orthography_2027_candidate` | Current landing page and linked Drive title both say 2027 | Discovery only; separate edition/permission review. Guam 2024 remains the chosen default. |

[Offline snapshot notes](../documentation/phase4-data/OPEN_SENTENCES.md) include exact artifact checksums, identifiers, attribution, and rebuild instructions. No source text in those files has been authored, translated, or spelling-corrected by an agent.

## Crawler safety

Use the implementation under `src/crawlers/`. The legacy `scripts/crawlers/crawl_website.py` delegates to that implementation. Its writes pass through `RAGDatabaseManager.add_governed_documents` and the registry gate. A crawler's existence, a successful preview, or a permissive source license does not authorize running ingestion.
