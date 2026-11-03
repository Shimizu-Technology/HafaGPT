# Phase 4 source corrections — 2026-11-03

Scope: offline source inventory and ingestion-path containment. HåfaGPT's learners need evidence whose rights, region, and age remain visible. Sources: the program's `PLAN.md`, KB audit findings 8–9/source inventory, and `RESOURCE_RESEARCH.md`; current code at slice base `fd3100a`; live official pages and packaged license notices inspected below. Native review is deferred. Chamoru.info remains available by Leon's decision.

Acceptance: preserve existing transitional retrieval decisions; correct the dated official links; register missing candidates with explicit fail-closed ingestion/retrieval and complete permission/editorial records; route the duplicate crawler through the existing governed writer; make current runtime defaults and local-versus-production evidence clear in documentation. Sentence capture/loader acceptance is in [OPEN_SENTENCES.md](OPEN_SENTENCES.md).

## Verified links and versions

- The official orthography landing page returned 200, but its download button now points to a Drive file titled **2027 Utugrafihan CHamoru…Digital.pdf**. The page itself also says 2027. This is recorded as a separate discovery-only candidate; it does not change the chosen Guam 2024 default.
- The official WordPress media inventory (`/wp-json/wp/v2/media?search=Utugrafihan&per_page=100`) exposes the dated [November 2024 PDF](https://kumisionchamoru.guam.gov/wp-content/uploads/2024/11/Utugrafihan-CHamoru-Guahan-3rd-Ed-2024_Kumision-i-Fino-CHamoru_Digital.pdf). It returned 200; all 70,497,828 bytes were downloaded temporarily. Its copyright page identifies 2024, ISBN 979-8-9860913-2-7, limited educational reproduction of parts, and restrictions on whole-book reproduction/sale. No new full-text reuse grant is inferred. Only the URL/version evidence is committed.
- [The current official compiler index](https://col.guamcourts.gov/guam-code-annotated/guam-code-annotated) links [01gc007.pdf](https://col.guamcourts.gov/sites/default/files/01gc007.pdf), which returned 200. Extracted text contains § 706, Official Languages. The old host/path remains a matching alias.
- HTTP Chamoru.info dictionary returned 200; HTTPS failed certificate validation. The lessons URL was changed to HTTP consistently with the failing HTTPS route, but its HTTP endpoint returned 500. This is an availability limitation, not a verified lesson-page recovery. Existing content remains in use; no crawl/import was run.
- GDOE's CHLCCSPI PDF, Word of the Day, and Seyon Inafitma pages returned 200. diksionariu.com and eBible returned 403 to the direct HTTP client; the web reader accessed both public pages, and the eBible page explicitly identifies Public Domain. The prior research report supplies additional discovery context, not permission.

## Policy and runtime changes

The registry grows from 32 to **45** sources, with **45** editorial records and **42** external permission/outreach records. Thirteen new candidates include the dictionaries/shelf, standards, five OPUS subsets, Tatoeba, historical ABS text, Kumisión audio programs, review/certification route, and newer orthography download. All 13 explicitly disable both ingestion and retrieval. Licensed offline snapshots carry their exact license; no written permission grant is fabricated. The other candidates remain permission-required. Specific GDOE and 2027 download matches precede broader rules, with regression tests for source resolution.

The duplicate `scripts/crawlers/crawl_website.py` becomes a small compatibility entry point for `src/crawlers/crawl_website.py`. The latter already calls `RAGDatabaseManager.add_governed_documents`, which validates all documents before writing. A regression test verifies delegation without importing the crawler or connecting to a database. No ingestion was performed.

`crawlers/SOURCES.md` and `HOW_RAG_WORKS.md` now describe v3, 384-dimensional `text-embedding-3-small`, and the code's main `gpt-5.6-luna`/OpenRouter default. The 14,800-document count is explicitly the dated read-only local audit, not a production measurement. Deployment settings, the actual production SHA, native language accuracy, and live tutor output remain unverified by this worker.


## Initial CodeRabbit review disposition

Applied: corrected the Guam Code and Chamoru.info evidence access dates; type-annotated new builder/tests; added pinned raw-input digest preflight, SHA-256 shape validation, and an empty-output guard with regression tests. The unavailable lessons URL now stays in the provenance registry but is omitted from both citation construction paths and from structured citation formatting, preserving attribution and retained content.

Not applied: suppressing the working HTTP dictionary link merely because it lacks TLS. The task explicitly requests the verified HTTP scheme where HTTPS fails and keeps Chamoru.info in use. The dictionary endpoint returned 200; its HTTPS certificate check failed. This intentional behavior remains for the lead to assess; no unverified HTTPS substitute is introduced. CodeRabbit's initial review is not represented as approval of the later fixes.
