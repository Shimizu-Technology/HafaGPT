# HåfaGPT Language Resource and Corpus Audit — August 7, 2026

## Executive summary

HåfaGPT has several credible Chamorro references, but the current RAG database is
not yet a governed or production-trustworthy language corpus. The earlier project
review was right that source grounding is strategically important, but it
overstated the quality of the corpus as it exists today.

The most important findings are:

1. **The 44,865-chunk total is misleading.** The local database contains 30,010
   redundant exact-duplicate rows. A single Chamoru.info copyright/footer fragment
   appears 17,130 times. Only 14,855 unique document strings remain after exact
   deduplication.
2. **The corpus is highly concentrated and poorly documented.** Chamoru.info
   accounts for 40,501 chunks, or 90.3% of the database. All 44,865 rows lack
   license, author, source date, and retrieval-date metadata. The database also
   contains no current Natibu Marianas URL even though `crawlers/SOURCES.md` says
   the revised dictionary was added.
3. **Some sources are credible but are being used for the wrong job.** PDN and
   Guampedia are useful authentic-usage or cultural sources, not authorities for
   canonical spelling and vocabulary. Swarthmore's student wiki should not have
   the same priority as official or reviewed language materials. Historical works
   should never silently determine beginner teaching.
4. **Rights are a release blocker, not a paperwork detail.** Guampedia's published
   terms prohibit storing its material in a public or private electronic retrieval
   system without permission. The local corpus has 55 Guampedia chunks. The app
   also republishes 18 complete Lengguahi-ta stories without a recorded license or
   permission grant. Seven of their extracted author fields are visibly corrupted.
5. **The canonical vocabulary is useful infrastructure, not completed review.** It
   contains 104 entries: 101 `source_backed`, three `needs_review`, and zero
   `verified`. All 104 pronunciation guides still require native review. Two of
   its three dominant dictionary citations are not independent: Chamoru.info says
   its dictionary uses Topping and the 1918 von Preissig dictionary as sources.
6. **The best missing resources are now official and community-reviewed.** Guam's
   Kumisión publishes a third-edition 2024 orthography, an official digital word
   search, 2025 specialized word lists, and cultural-dictionary volumes. The
   University of Guam-supported CHachalåni archive provides community-consented
   native-speaker recordings. LearningCHamoru provides structured multimedia
   pedagogy. The revised Natibu Marianas dictionary remains a strong CNMI source,
   but it is explicitly a living work in progress and uses the CNMI orthography.

**Recommendation:** pause broad crawling and do not switch HåfaGPT's production
model on the strength of the current corpus. First establish permissions, rebuild a
deduplicated corpus with source roles and complete provenance, align canonical
teaching with the learner's selected Guam or CNMI orthography profile, and obtain
two qualified Chamorro reviewers. Then rerun the integrated model evaluation.

## Scope and intended use

This audit evaluates resources used to:

- ground HåfaGPT tutor answers;
- define canonical beginner vocabulary and variants;
- power dictionary search, stories, lessons, and quizzes;
- generate and serve pronunciation audio;
- evaluate candidate AI models.

The desired unit of governance is not merely a website or PDF. It is an individual
source item or chunk with a stable source ID, title, author/contributor, publication
and retrieval dates, exact location, orthography/dialect profile, content role,
rights status, review status, and content hash.

## Evidence and reproducibility

The audit used the local PostgreSQL `langchain_pg_embedding` collection, the three
bundled dictionary JSON files, canonical vocabulary, audio manifests, extracted
stories, crawler code, project documentation, and current public source-owner or
institutional pages. No production database or private user data was used.

Key local checks:

```text
RAG rows                                      44,865
Unique document strings after exact dedupe   14,855
Redundant exact rows                         30,010 (66.9%)
Largest exact duplicate group                17,130
Chamoru.info rows                            40,501 (90.3%)
Rows missing rights/author/date/access date  44,865 (100%)
Rows missing source type                      4,074 (9.1%)
Rows missing priority                        27,683 (61.7%)
Rows missing title                           38,330 (85.4%)
```

The language-content inventory currently finds 2,172 user-facing occurrences
across 980 unique Chamorro strings. Of those occurrences, 185 are medium-risk and
169 require phrase/sentence review. Those labels are triage signals, not rulings
that the language is wrong.

## What is actually in the RAG database

| Current source family | Chunks | Unique document strings | Current role | Audit decision |
|---|---:|---:|---|---|
| Chamoru.info | 40,501 | 10,597 | Dictionary and lessons | Rebuild from clean entries; reference-only until rights/provenance are recorded |
| Sandra Chung grammar PDF | 1,492 | 1,490 | Grammar | Strong academic reference; permission required for full-text commercial RAG |
| Rosetta Project vocabulary PDF | 1,304 | 1,246 | Archival vocabulary | Historical/reference-only pending exact provenance and rights |
| Historic dictionary/grammar PDF | 1,099 | 1,099 | Historical lexicon/grammar | Public-domain candidate; never default modern teaching |
| Pacific Daily News | 188 | 177 | Authentic modern usage | Context-only; permission required; remove “highest authority” treatment |
| Revised dictionary PDF | 174 | 173 | Lexicon | Credible candidate, but local source/version and rights are not recoverable |
| Guampedia | 55 | 27 | Culture/history | Stop retrieval use unless written permission is obtained |
| Visit Guam | 24 | 18 | Tourism phrases | Attestation/context only, not normative authority |
| Swarthmore student wiki | 23 | 23 | Student grammar summary | Remove from authoritative ranking |
| Local abbreviation entries | 5 | 5 | Abbreviations | Retain only with citations and review |

The source tracker is stale. It reports approximately 45,400 chunks as of December
2024, five dictionaries, and a recently added IKNM/KAM dictionary. The current
database has 44,865 rows and no `natibunmarianas.org` sources. It also does not
contain the claimed 2024 orthography/finder PDFs under stable, reproducible paths.
The four local PDF source paths point to a retired pre-monorepo directory and the
files no longer exist there.

## Source-by-source assessment

### Revised and Updated Chamorro Dictionary JSON

**Assessment:** high linguistic value, but incomplete provenance and rights.

- The file contains 10,350 entries and closely matches the scale and structure of
  the Natibu Marianas living dictionary.
- The Natibu Marianas introduction describes a substantial community process with
  more than 100 contributors, editorial leadership, assistance from Sandra Chung,
  and verification help from Guam's Kumisión.
- It uses the official 2010 CNMI orthography. This is not interchangeable with
  Guam's current orthography; HåfaGPT must preserve the regional profile rather
  than normalize one into the other without explanation.
- The source itself says it is a work in progress, recommends checking for updates
  every three to six months, and acknowledges entries that still need research.
- The local JSON has no source URL, snapshot date, version, checksum provenance,
  license, or permission record.

**Decision:** pursue a direct partnership/permission agreement, store a dated
snapshot with checksum, label it `CNMI / living dictionary`, and use it as a primary
CNMI lexicon after review. Do not call the current local file “2025” until its exact
snapshot is proven.

### Topping, Ogo, and Dungca dictionary JSON

**Assessment:** foundational standard reference, not a current sole authority.

- The bundled file has 9,151 entries.
- The 1975 dictionary remains a major scholarly reference and underlies later
  projects.
- It reflects an older orthographic system and historical usage. Current Guam and
  CNMI teaching choices must be reconciled against their official orthographies.
- PARADISEC's record for the original electronic files states that data access is
  closed and depositor permission is required; its Creative Commons notice applies
  to catalog metadata, not automatically to the dictionary data files.
- The repository does not document how its JSON copy was obtained or what rights
  permit redistributing/embedding it.

**Decision:** retain as an important reference but resolve permission and provenance,
mark its orthography era, and never treat agreement with a derivative source as
independent corroboration.

### Chamoru.info dictionary and lessons

**Assessment:** useful learner-oriented aggregation; not an independent or
normative source.

- The bundled dictionary has 9,414 entries.
- Chamoru.info identifies Topping and von Preissig as dictionary sources. It is
  therefore not an independent third vote when the same term is also cited from
  Topping.
- 8,560 normalized headwords overlap the local Topping JSON.
- The current crawl is severely contaminated: 17,130 footer duplicates and 287
  copies of an “entry not found” page are stored as knowledge.
- The site describes itself as continuously updated, but HåfaGPT has no per-entry
  source lineage or snapshot date.

**Decision:** remove all existing crawled chunks and re-import only structured entry
content after rights approval. Preserve each entry's underlying source when known.
Use Chamoru.info lessons as reviewed pedagogy/context, not the source of record for
official spelling.

### Sandra Chung's 2020 *Chamorro Grammar*

**Assessment:** strongest current comprehensive grammar reference in the corpus.

- It is a detailed contemporary reference grammar and explicitly discusses both
  Guam and CNMI orthographies.
- The current edition is openly downloadable through UC eScholarship but states
  “all rights reserved.” Open access to read does not itself authorize republishing
  the full text through a commercial retrieval product.
- The database copy has no durable page-level citation source, current file, license,
  or edition metadata.

**Decision:** use for human/reference work immediately; seek written permission for
full-text RAG. If permission is not available, store only HåfaGPT-authored,
expert-reviewed rule summaries with page citations and link to the source.

### Guampedia

**Assessment:** credible cultural encyclopedia; current RAG use conflicts with
published terms.

- Guampedia is valuable for Guam culture, history, people, and context.
- It is not a language-standardization authority.
- Its terms say content may not be stored in a public or private electronic
  retrieval system without permission, apart from limited fair-use contexts.
- HåfaGPT currently stores 55 chunks and may be a public/commercial product.

**Decision:** remove from the production RAG unless Guampedia grants written
permission. Continue linking to it as a cultural reference and explore a formal
partnership.

### Pacific Daily News Chamorro columns

**Assessment:** valuable authentic usage; incorrectly ranked as highest authority.

- The 188 chunks can help with modern discourse, authorship, style, and real-world
  examples.
- A newspaper column can contain author preference, code-switching, editing errors,
  rhetorical style, or a specific regional orthography. It should not override an
  official orthography or reviewed dictionary entry.
- The material is copyrighted and no permission record exists.

**Decision:** change its role to `authentic_usage`, obtain permission, attach author
and publication date, and make it eligible only for usage/example questions—not
canonical word selection.

### Lengguahi-ta and the 18 extracted stories

**Assessment:** one of the strongest practical learning resources, but the current
republication is not production-ready.

- Lengguahi-ta now offers structured beginner/intermediate lessons, drills,
  translations, cultural context, and native/highly fluent speaker audio.
- It is an authored, evolving educational project, not an official commission.
- HåfaGPT stores and serves 18 complete stories. No license or permission field is
  recorded. Some pages are translations or adaptations of third-party works.
- Seven extracted `author` fields contain story text/newlines, demonstrating broken
  extraction. Attribution alone is not permission.

**Decision:** contact the creator for an explicit collaboration. Until then, do not
ship full copied stories in a public release. Prefer links, short attributed excerpts
where appropriate, or licensed materials. After permission, retain original author,
translator, editor, work provenance, URL, revision date, and allowed uses.

### Visit Guam

**Assessment:** official tourism attestation, not a language authority.

- Its greetings page can confirm that a phrase is in public-facing use.
- Tourism copy may simplify or choose audience-friendly variants.

**Decision:** use as secondary attestation only. Current canonical records should
not elevate a tourism phrase over the Kumisión, reviewed dictionaries, or expert
adjudication.

### Swarthmore wiki

**Assessment:** unsuitable as a priority-100 authority.

The source is a course wiki, not an official publication or maintained reviewed
reference. Its 23 chunks are currently ranked as modern educational material.

**Decision:** remove from production retrieval or mark as discovery-only.

### Historical sources

**Assessment:** valuable for etymology, diachronic comparison, and source discovery;
unsafe for unmarked beginner teaching.

The Kumisión now hosts several historical dictionaries, including the 1918 von
Preissig work. Older works may have public-domain advantages but contain colonial
framing, outdated orthography, glosses, and usage.

**Decision:** retain in a separate historical collection. Never mix historical and
modern results without an explicit `historical` label and query intent.

### Supplemental dictionary JSON

**Assessment:** quarantine.

The 14-entry local file has no citations, author, review history, or provenance.
Some example sentences are visibly suspect or mismatched—for example, a “two” entry
uses `lemmai` while glossing “days,” and other generated-looking example sentences
are unsupported.

**Decision:** remove this file from authoritative retrieval immediately. Migrate any
needed term into canonical vocabulary only after source citation and human review.

## Canonical content, stories, and audio

### Canonical vocabulary

The canonical layer is the correct architectural direction, but it currently
governs only 104 concepts and has no human-verified entries:

```text
source_backed       101
needs_review          3
verified              0
pronunciation needing native review 104
```

The phrase `source_backed` should mean evidence exists, not “approved for teaching.”
The current schema should add:

- `reviewed_by`, `reviewed_at`, and adjudication record;
- Guam/CNMI orthography and island/dialect applicability;
- source registry IDs rather than free-text filenames;
- independent-source lineage so a derivative dictionary does not count twice;
- exact source edition, page/entry URL, access date, and rights status;
- separate fields for normative spelling, attested variant, colloquial usage, and
  historical form;
- an age/level suitability flag and sensitive/taboo-term handling.

### Audio

The API and web manifests are synchronized at 715 entries, which is good operational
control. The language-quality status is weaker:

- 610 files are explicitly marked `needs_review` and 104 have no review status;
- one file is marked approved;
- all 715 contain a phonetic hint, while all 104 canonical pronunciation guides
  still need native review;
- 610 identify ElevenLabs as the TTS provider and 105 omit the provider.

**Decision:** label current audio as synthetic, not native pronunciation. Do not
display “approved” without reviewer identity and date. Prioritize consented native
speaker recordings for the core learning path, while retaining TTS as an explicitly
marked fallback.

### Model evaluation

The August model benchmark remains valid as an **engineering comparison** of
latency, cost, response contracts, routing, and behavior when given the same local
reference. It is not yet a language-accuracy benchmark because:

- its 24 cases derive from the 104-entry canonical layer;
- no canonical entry is human-verified;
- most cases cite the same three dictionary files, two of which are source-related;
- the benchmark does not cover Guam/CNMI orthography choice;
- the same source family helps define both the expected answer and the supplied
  context, creating circularity;
- corrupted/duplicated RAG data has not yet been included in the model matrix.

The Terra/Luna/Claude/Gemini shortlist is still reasonable for the next test stage,
but no model result can repair bad retrieval or settle a source conflict.

## Strong resources to add or partner with

| Candidate | Why it is strong | Recommended use | Rights/action |
|---|---|---|---|
| Kumisión 2024 third-edition *Utugrafihan CHamoru, Guåhan* | Current official Guam spelling rules | Normative Guam orthography | Request machine-use/embedding permission; version and page citations |
| Kumisión Fañodda'an Fino' digital dictionary | Official current Guam word-search project with expert contributors and documented source lineage | Primary Guam lexical lookup | Seek API/data partnership; do not scrape blindly |
| Kumisión 2025 specialized lists | Current official terminology for months, kinship, weather, titles, places, and more | Canonical specialized vocabulary | Download/reference now; request reuse permission |
| Kumisión cultural dictionary volumes (2022, 2024) | Community/official context for sayings, values, metaphors, and cultural meanings | Cultural explanations and advanced learning | Request permission; preserve entry-level attribution |
| Natibu Marianas revised dictionary | Community-reviewed 10,500+ entry living lexicon with examples | Primary CNMI lexicon and usage examples | Formal partnership, snapshot/version policy, permissions |
| English-Chamorro Finder List (2024) | Compiled from the revised dictionary by Sandra Chung | Candidate generation only | Do not treat rough pointers as definitions; confirm reuse rights |
| Chung 2020 *Chamorro Grammar* | Comprehensive modern grammar covering both orthographies | Grammar evidence and reviewer reference | Permission for full-text RAG or reviewed summaries with citations |
| CHachalåni / Kaipuleohone archive | Community-consented native-speaker interviews, transcripts, and cultural expertise | Listening, pronunciation research, authentic usage | Respect item-level access/consent; partner before product reuse |
| LearningCHamoru | UOG-supported multimedia lessons, dictionary, grammar, dialogues, and media | Pedagogy, curriculum mapping, learner exercises | Seek collaboration/data agreement |
| GDOE standards and CHamoru program materials | Official school learning goals and grade-oriented outcomes | Curriculum sequence and assessment design | Use standards as structure; request reuse for lesson content |
| UOG *Finu' Chamorro for Beginners* | Expert-panel post-secondary curriculum | Curriculum comparison and licensed lesson design | Purchase/reference; negotiate license rather than copy |
| UCLA Phonetics Lab Chamorro word list | Archival audio with word list and recording details | Pronunciation research/control | Check recording-level rights and speaker metadata before reuse |

Discovery-only resources such as OLAC, PARADISEC catalogs, ABVD, Glottolog, and
general web search are useful for locating sources. They should not themselves decide
what HåfaGPT teaches.

## The source model HåfaGPT should use

Replace one global numeric “priority” with role-aware retrieval:

| Source role | Answers it may support | Examples |
|---|---|---|
| `normative_orthography` | How a term should be written for a selected regional standard | Kumisión Guam orthography; CNMI 2010 orthography |
| `reviewed_lexicon` | Headword, meaning, part of speech, variants | Official DCA/Kumisión dictionary; Natibu Marianas dictionary |
| `reviewed_grammar` | Inflection, syntax, morphology, grammatical explanation | Chung grammar; reviewed teaching grammar |
| `pedagogy` | Lesson sequence, drills, learner-friendly explanation | GDOE/UOG/LearningCHamoru/licensed Lengguahi-ta |
| `authentic_usage` | How a person used a form in context | Consented archives, licensed columns/interviews |
| `cultural_context` | History, practices, values, sayings | Kumisión cultural dictionaries; permitted Guampedia content |
| `historical` | Etymology and historical comparison | Preissig and other archival dictionaries |
| `discovery_only` | Leads to a better source; never cited as teaching authority | Student wikis, metadata catalogs, general search |

Retrieval should first infer the question's evidence need, then search eligible
roles. A lookup should not retrieve news before dictionaries. A cultural question
should not be answered from a bare dictionary definition. Conflicts should be shown
as regional/source differences, not flattened into a single invented answer.

## Required source registry fields

Every ingested item should require:

```text
source_id
source_family_id and derivative_of
title / entry headword
author, translator, editor, speaker, contributor
publisher / owning organization
canonical URL or stable identifier
edition / version / publication date / retrieved_at
content_role
region / island / dialect / orthography profile
rights_status / allowed_uses / permission record / expiration
review_status / reviewer / reviewed_at
page, section, timestamp, or entry locator
content_sha256 / parser_version / chunk_index
age or teaching suitability
```

Ingestion must fail closed if rights status or required provenance is missing.

## Remediation plan

### Phase 0 — immediate containment (before the next public release)

1. Disable or remove the supplemental dictionary from authoritative retrieval.
2. Stop treating PDN, Swarthmore, Visit Guam, and Guampedia as language authorities.
3. Remove Guampedia content unless written retrieval permission already exists.
4. Pause serving full copied Lengguahi-ta stories until rights and attribution are
   confirmed; fix corrupted author fields.
5. Add visible `synthetic / needs native review` labeling to current TTS audio.
6. Add this audit as a gate to the existing modernization/model plan.

### Phase 1 — source agreements and registry (one to three weeks)

1. Contact the Kumisión, Natibu Marianas, UOG/CHachalåni, LearningCHamoru,
   Lengguahi-ta, Guampedia, and relevant publishers/data owners.
2. Agree on allowed uses: lookup, short citation, embedding, display, audio, model
   evaluation, commercial/public access, and attribution.
3. Create a versioned source registry and import contract.
4. Decide whether HåfaGPT teaches Guam, CNMI, or a selectable dual-standard profile.

### Phase 2 — clean rebuild (two to four weeks)

1. Create a new RAG collection; never mutate the current collection in place.
2. Import from reproducible source snapshots with checksum and parser version.
3. Deduplicate boilerplate and near-duplicates before embedding.
4. Keep source roles in separate collections or mandatory filters.
5. Add retrieval traces and tests for source-role eligibility, conflicts, citations,
   and historical leakage.
6. Compare the new collection against the old one, then switch behind a rollback
   flag.

### Phase 3 — human review and independent evaluation (ongoing)

1. Recruit at least two qualified reviewers representing Guam and CNMI perspectives
   or explicitly scope the product to one standard.
2. Review canonical vocabulary category by category; record adjudication and source
   conflicts.
3. Build a held-out 100+ case evaluation authored/adjudicated independently of the
   source used in the prompt.
4. Include pronunciation, multi-turn teaching, source conflict, colloquial speech,
   cultural safety, and abstention cases.
5. Rerun Terra, Luna, Claude, the current control, and a separate Gemini vision set
   through the real HåfaGPT pipeline.

## Acceptance gates

HåfaGPT should not call the corpus production-ready until:

- exact redundant RAG rows are below 1%;
- boilerplate/error-page chunks are zero;
- 100% of chunks have source ID, role, version/date, locator, checksum, and rights;
- no source with prohibited storage terms is embedded without written permission;
- official/current orthography resources are versioned and region-scoped;
- 100% of beginner canonical items are reviewed or explicitly withheld;
- core audio is native-reviewed or visibly marked synthetic;
- retrieval tests prove that source roles—not a global boost—control evidence;
- the held-out model suite has two-reviewer adjudication and no unresolved critical
  language errors;
- production has a rollback switch for both model and corpus version.

## Reassessment of prior recommendations

The following previous findings remain sound: do not rebuild the whole application;
repair security/privacy; add frontend tests; modularize incrementally; use role-based
model routing; require blind human review; and run an integrated app-level model
suite before promotion.

The following need correction or stronger wording:

- “45,000+ curated chunks” should be replaced with “44,865 rows, 14,855 unique
  document strings before semantic/near-duplicate cleanup.”
- The source strategy is promising code, not yet a defensible corpus.
- PDN must not be the highest general language authority.
- Three dictionary citations often do not represent three independent sources.
- The model benchmark's automated signal is an engineering result, not language
  accuracy, because the reference layer has not been human-verified.
- Rights, consent, indigenous data governance, regional orthography, and source
  lineage are first-class product requirements.

## Validation completed after this audit

The repository-wide validation completed successfully on August 7, 2026, and
the August 8 live-RAG follow-up produced the final branch totals:

- `./scripts/check.sh`: 84 API tests passed, three intentionally skipped;
- canonical vocabulary validation passed with zero app-to-canonical usage findings;
- the API and web audio manifests matched at 715 entries;
- frontend type-check and production build passed;
- frontend lint completed with zero errors and ten pre-existing warnings;
- `model_benchmark.py --validate-only --check-catalog` confirmed all eight frozen
  model IDs were available and validated all 24 cases and eight model definitions;
- the governed corpus audit resolved all 44,865 rows to registered sources, with
  83 legacy rows blocked and zero unregistered;
- `git diff --check` passed.

These checks establish engineering consistency. They do not override the language,
rights, and corpus-quality release gates above.

## Primary online references

- [Kumisión home, official resources, and word-search project](https://kumisionchamoru.guam.gov/)
- [Kumisión 2024 third-edition orthography](https://kumisionchamoru.guam.gov/wp-content/uploads/2025/02/Utugrafihan-CHamoru-GuA%C2%A5han-3rd-Ed-2024_KumisiA%C2%B3n-i-Fino-CHamoru_Digital.pdf)
- [Kumisión 2025 specialized word lists](https://kumisionchamoru.guam.gov/listan-palabra-word-lists/listan-espesi%C7%BBt-specialized-lists/)
- [Kumisión cultural dictionary series](https://kumisionchamoru.guam.gov/prudukto-siha-products/ginen-i-hila-i-manaina-ta-chamoru-cultural-dictionary-series/)
- [Natibu Marianas revised dictionary introduction](https://natibunmarianas.org/dictionary-introduction/)
- [Natibu Marianas living dictionary status](https://natibunmarianas.org/)
- [Sandra Chung, *Chamorro Grammar* (2020)](https://escholarship.org/uc/item/2sx7w4h5)
- [English-Chamorro Finder List (2024)](https://escholarship.org/uc/item/0098k2nh)
- [PARADISEC Topping dictionary-file record and access conditions](https://catalog.paradisec.org.au/collections/CHA1/items/originaldictionary?files_per_page=10)
- [CHachalåni documentation project and archive](https://chachalani.com/)
- [LearningCHamoru, supported by UOG and the Kumisión](https://learningchamoru.com/)
- [University of Guam CHamoru course sequence](https://catalog.uog.edu/current/courses/cm)
- [UOG announcement for *Finu' Chamorro for Beginners*](https://www.uog.edu/news-announcements/2024-2025/2024-uog-press-and-proa-publications-launch-their-second-title-finu-chamorro-for-beginners.php)
- [Chamoru.info dictionary sources](https://www.chamoru.info/dictionary/)
- [Guampedia terms of use](https://www.guampedia.com/terms-of-use/)
- [Lengguahi-ta current resources](https://lengguahita.com/resources/)
- [UCLA Phonetics Lab Chamorro archive](https://archive.phonetics.ucla.edu/Language/CHA/cha.html)

## Caveats

- This is a product/data-governance audit, not legal advice. Rights conclusions that
  control release should be confirmed by counsel or explicit permission from the
  owner.
- Source authority is contextual. A source may be excellent for authentic speech
  while inappropriate for normative spelling.
- Guam and CNMI orthographies are both legitimate standards. “Conflict” may reflect
  regional policy rather than error.
- Exact deduplication is only the first pass; the corpus likely contains additional
  near-duplicate and derivative content.
- Only qualified community reviewers can make final language and cultural judgments.
