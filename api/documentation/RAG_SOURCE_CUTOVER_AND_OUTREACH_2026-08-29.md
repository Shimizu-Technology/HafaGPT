# RAG cutover and source outreach package

**Prepared:** August 29, 2026 (Guam)  
**Status:** governed runtime cutover implemented; outreach drafted but not sent

## Decision

The application now defaults to `hafagpt_governed_openai_v3`. The legacy
`chamorro_grammar` collection remains intact and can be selected immediately by
setting `RAG_COLLECTION_NAME=chamorro_grammar`.

This is an operational cleanup, not a claim that every retained source has a new
license. The governed collection contains the currently retrieval-eligible
legacy evidence, rebuilt in the runtime's OpenAI embedding space with exact
duplicates and policy-blocked chunks excluded. New production ingestion remains
closed until the permission and artifact gates are satisfied.

## Verified collection state

The August 29 read-only production audit found:

| Measure | Legacy collection | Governed v3 |
| --- | ---: | ---: |
| Rows | 44,865 | 14,800 |
| Unique documents | 14,855 | 14,800 |
| Exact duplicate rows | 30,010 (66.89%) | 0 |
| Blocked-policy chunks | 83 | 0 |
| Unregistered chunks | 0 | 0 |
| Embedding contract | Unversioned | OpenAI `text-embedding-3-small`, 384 dimensions, cosine |
| Collection status | Legacy | `ready` |

The governed collection still inherits incomplete license and retrieval-date
metadata from the legacy corpus. That is why operational readiness and source
permission readiness are reported separately. The cutover must not be described
as a provenance-clean or newly permission-cleared corpus.

Run the repeatable operational gate from `api/`:

```bash
PYTHONPATH=. .venv/bin/python scripts/audit_rag_sources.py \
  --enforce-operational-cutover-gates
```

Run the stricter future-ingestion report separately:

```bash
PYTHONPATH=. .venv/bin/python scripts/check_production_corpus_readiness.py
```

## Retrieval findings

Live checks against v3 recovered the expected source-backed entries for
`flower`, `tree`, and `banana tree`. An explicit question about Chamorro
possession exposed a different failure mode: the much larger dictionary family
filled the nearest-neighbor window with alphabetic index fragments even though
the Sandra Chung grammar contained directly relevant passages. Runtime retrieval
now gives explicit grammar questions a policy-eligible grammar candidate lane
and reserves one grammar result when available. Dictionary results remain
eligible and no source was removed.

## Current official-source priorities

These are the best next partnerships found in the current web review. Public
access is evidence of availability, not permission to build a vector corpus.

1. **Kumisión i Fino' CHamoru.** Request one agreement covering the [2024 Guam
   orthography](https://kumisionchamoru.guam.gov/utugrafihan-chamoru-guahan/),
   [2025 specialized lists](https://kumisionchamoru.guam.gov/listan-palabra-word-lists/listan-espesi%C7%BBt-specialized-lists/),
   and selected [learning tools](https://kumisionchamoru.guam.gov/materiat-ineyak-siha-learning-tools/).
   The specialized-list page says its downloadable lists follow the 2024
   orthography. The orthography PDF permits educational reproduction of parts
   while reserving reproduction of the whole work, so the exact RAG uses still
   need written confirmation.
2. **Natibu Marianas / IKNM-KAM.** Seek an approved, dated snapshot and update
   agreement for the [living dictionary](https://natibunmarianas.org/). The site
   describes a changing work in progress, so version, correction, and revocation
   procedures are essential.
3. **CNMI Chamorro-Carolinian Language Policy Commission.** Request regional
   policy guidance and item-level terms through the [official commission
   program](https://cnmidcca.org/default.asp?secID=14), including the lineage and
   permitted uses of the [December 2024 English-Chamorro finder](https://www.cnmilicensing.gov.mp/wp-content/uploads/2025/01/Title-English-Chamorro.pdf).
4. **LearningCHamoru and University of Guam.** Propose curriculum and reviewer
   collaboration around [LearningCHamoru's 25-lesson program](https://learningchamoru.com/)
   and the [UOG CHamoru Studies program](https://catalog.uog.edu/current/programs/college-of-liberal-arts-and-social-sciences/chamoru-studies).
   Multimedia, course materials, and individual authors need separate scopes.
5. **Guam Department of Education.** Ask the [CHamoru Language and Culture
   Program](https://ocpes.gdoe.net/programs/chamoru-language-and-culture) to
   validate learning outcomes and identify reusable standards or materials.

## Artifact inventory for the Kumisión request

The following official files were downloaded to temporary local storage only to
confirm identity and prepare the request. They are not committed, embedded, or
served by HåfaGPT.

| Artifact label | Pages | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| 2024 orthography, third edition | 66 | 70,494,632 | `8696fa399a451b6b68ef101209e6a3616c044384709770e6d0cda1af39f3eddd` |
| 2025 days list | 1 | 202,199 | `fd33d5b06dfbf8978dbd94cb8e200345fdb139cc4ea705ac24d602254e8b0df5` |
| 2025 genealogy and kinship list | 4 | 784,900 | `873475a2a25e6113b047cdcd572b3d6271dde22267a4e4b40ebd7c7e365fffeb` |
| 2025 months list | 1 | 202,350 | `68090179a5c3736be5b31e45a39ec86e2df0abff3f13a967468b4041d1925d6d` |
| 2025 weather and climate list | 2 | 401,273 | `ac1f8860cb6ab1fcc79072e76fb319f74a2f3949d67afd34b59971bc107727c6` |

The checksum identifies the reviewed file but does not imply permission.

## Permission scope to request

Each owner should answer every line separately:

- retain an exact, dated source snapshot;
- create and store embeddings;
- return short excerpts with page or entry locators;
- return complete dictionary entries where applicable;
- create original explanations, flashcards, quizzes, and exercises;
- use approved material in private model evaluation;
- serve the material in a public or commercial learning service;
- use audio or transcripts, including speaker consent where applicable;
- apply required attribution, regional labels, and orthography labels;
- receive updates and corrections on an agreed schedule;
- handle expiration, revocation, replacement, and deletion of snapshots and
  embeddings.

An approval must identify the exact artifact version and SHA-256. The written
evidence is stored privately; Git receives only its non-secret locator and the
approved scope.

## Tailored opening drafts

### Kumisión

> Håfa adai. HåfaGPT is a family-oriented Chamorro learning platform. We would
> like to discuss a source and review partnership covering the 2024 Utugrafihan
> CHamoru, the identified 2025 specialized word lists, and selected learning
> tools. We have recorded the exact file checksums and will not ingest them based
> only on public availability. Could we review permission for dated snapshot
> retention, embeddings, short attributed excerpts, original derived learning
> activities, evaluation, public service, updates, and revocation, with Guam 2024
> orthography clearly labeled?

### Natibu Marianas / CNMI partners

> Håfa adai. We would like to explore a CNMI language partnership for HåfaGPT,
> centered on an approved dated snapshot of the living dictionary and clear CNMI
> regional labeling. Could we review dictionary-entry display, embeddings,
> original exercises, evaluation, attribution, update cadence, corrections, and
> revocation with the appropriate language stewards and rights holders? We also
> want to preserve the finder list's derivative lineage rather than treat it as
> an independent source.

### LearningCHamoru, UOG, and GDOE

> Håfa adai. We are seeking curriculum alignment and compensated expert review
> for HåfaGPT. We would like to discuss learner outcomes, review procedures, and
> narrowly approved materials rather than scrape courses or multimedia. Could we
> identify the appropriate program contacts and separately define permissions for
> curriculum references, excerpts, derived exercises, audio, evaluation,
> attribution, updates, and withdrawal?

No outreach has been sent. Sending these requests and recording the replies is
the next human-authorized step.
