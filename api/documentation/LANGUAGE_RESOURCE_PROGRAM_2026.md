# HåfaGPT Language Resource Program — 2026

**Program owner:** HåfaGPT product and engineering team

**Community authority:** qualified Chamorro reviewers and participating source owners

**Started:** August 7, 2026
**Companion audit:** [LANGUAGE_RESOURCE_AUDIT_2026-08-07.md](LANGUAGE_RESOURCE_AUDIT_2026-08-07.md)

## Outcome

HåfaGPT should become a family-friendly Chamorro learning platform whose teaching
claims can be traced to an appropriate source, regional standard, permission
record, and human review. The model must follow that governed evidence rather than
decide language truth by itself.

This program deliberately separates four questions that the old global source
priority mixed together:

1. Is the material permitted for this product use?
2. What kind of evidence can it provide?
3. Which regional or historical language profile does it represent?
4. Has the learner-facing claim been reviewed by a qualified person?

## Decisions already made

- Guam and CNMI standards are both legitimate. HåfaGPT will preserve regional
  labels and should eventually let learners choose a profile rather than silently
  flattening differences.
- Official orthography, reviewed lexicon, reviewed grammar, pedagogy, authentic
  usage, cultural context, historical material, and discovery sources are separate
  evidence roles.
- Attribution is not permission. Public web access is not permission to embed,
  reproduce, or commercially serve a complete work.
- Unknown sources fail closed for ingestion and retrieval.
- Transitional sources may remain available only for explicitly allowed roles
  while agreements are pursued. Transitional status is not production clearance.
- Source-dependent citations do not count as independent corroboration.
- Synthetic audio must be labeled. “Approved” requires a named reviewer and date.
- Model promotion follows corpus cleanup and human review, not the reverse.

## System of record

The versioned source registry is
[`data/language_source_registry.json`](../data/language_source_registry.json).
Every source record contains:

- stable source ID and matching rules;
- canonical name and URL when available;
- content role;
- region and orthography profile;
- rights and review status;
- allowed retrieval intents and a role-specific weight;
- a plain-language decision explaining why.

The runtime policy is
[`src/rag/source_policy.py`](../src/rag/source_policy.py). It fails closed for
unknown sources, adds governed metadata to eligible chunks, and prevents ingestion
unless the registry contains explicit permission evidence.

The registry is a containment system, not a substitute for signed agreements,
legal review, or community adjudication.

## Phase 0 — containment

**Goal:** stop known questionable uses immediately without deleting evidence or
making an irreversible production-data change.

| Work item | Why | Acceptance condition | Status |
|---|---|---|---|
| Quarantine the supplemental dictionary | It is uncited and contains suspect examples | It cannot be ingested or returned by any query | Verified by policy and retrieval tests |
| Block Guampedia retrieval | Published terms restrict electronic retrieval storage without permission | Guampedia receives zero production retrieval eligibility | Verified by policy and retrieval tests |
| Remove Swarthmore from authority | A student course wiki is discovery material | It cannot be returned as teaching evidence | Verified by policy and retrieval tests |
| Reclassify PDN and Visit Guam | Authentic/public usage cannot decide canonical vocabulary | They are eligible only for usage/cultural questions | Verified by query-role tests |
| Separate historical sources | Old spelling and glosses must not leak into beginner teaching | Historical sources require explicit historical intent | Verified by query-role tests |
| Pause Lengguahi-ta copies | Complete copied stories lack a recorded permission grant and attribution is corrupted | API returns no copied story content without a matching registry permission | Verified locally: empty catalogs and HTTP 451 detail response |
| Label synthetic audio | Learners must know AI speech is not native authority | Manifest and every audio surface disclose synthetic/native-review status | Verified by manifest tests, synchronized copies, lint, type check, and build |
| Stop uncontrolled imports | Another crawl would deepen provenance and duplication debt | All maintained ingestion paths call the registry permission gate | Verified by code inventory and fail-closed tests |
| Make the audit repeatable | A one-time count will become stale | Read-only database audit reports duplicates, metadata gaps, and policy status | Verified against the 44,865-row local corpus |

Phase 0 does not physically delete local or production vectors. Runtime retrieval
filters contain blocked material now; the new corpus in Phase 2 will omit it. Any
physical purge should occur only after a backup/rollback plan and an exact target
review.

### Phase 0 verification record

- Repository check: 84 tests passed and 3 credential-dependent tests skipped;
  canonical content checks, synchronized audio checks, lint, type check, and the
  production build passed.
- Corpus audit: all 44,865 chunks resolve to a registered source; 83 legacy chunks
  are blocked and zero are unregistered. Exact redundancy remains 66.89%, so this
  is containment—not a clean-corpus claim.
- OpenRouter smoke: the current control and all seven candidates completed one
  grounded case; this proves current availability/adapter health only, not model
  superiority.
- Live semantic RAG passed all 3 protected integration gates on August 8 after
  embedding service access was restored: database connectivity, ordinary semantic
  retrieval, and the PDN-specific source lane. The PDN question returned five
  governed PDN references. This validates runtime containment and source targeting
  on the legacy corpus; it is not a clean-corpus or model-quality claim.
- Authenticated browser validation is currently blocked by Clerk failing to
  initialize even though the local publishable key exactly matches the active
  development instance. Do not substitute production keys for localhost; diagnose
  the SDK/instance path in a focused authentication change.
- The local database contains schema objects created outside its recorded Alembic
  history. `alembic upgrade head` fails transactionally on duplicate objects. Do
  not stamp or rebuild it without a reviewed reconciliation/backup procedure.

## Phase 1 — agreements, governance, and product scope

**Goal:** replace inferred rights and authority with recorded decisions.

### Source-owner outreach

Contact these organizations or creators with a concrete permission matrix:

1. Kumisión i Fino' CHamoru — orthography, word search, specialized lists, and
   cultural dictionaries;
2. Natibu Marianas / IKNM-KAM — living CNMI dictionary snapshot and update policy;
3. UOG and CHachalåni — grammar collaboration, recordings, transcripts, consent,
   and curriculum expertise;
4. LearningCHamoru — lesson/curriculum collaboration;
5. Lengguahi-ta — stories, lessons, translations, audio, and attribution;
6. Guampedia — cultural excerpts, linking, embedding, and retrieval permission;
7. relevant publishers, authors, archives, speakers, translators, and editors.

Each agreement must separately answer whether HåfaGPT may:

- download and retain a snapshot;
- create embeddings;
- return short excerpts or full entries;
- display complete works;
- create derived exercises or summaries;
- use material in model evaluation;
- serve audio or transcripts;
- operate publicly or commercially;
- retain data after an agreement ends.

### Governance decisions

- Name a product language-review lead.
- Recruit at least two qualified reviewers or explicitly scope the first release to
  one regional standard.
- Decide the Guam/CNMI profile UX and default.
- Define reviewer compensation, consent, attribution, and conflict resolution.
- Define sensitive, sacred, taboo, personal, and child-suitability policies.
- Add a permission-record store with owner, scope, signed date, expiration,
  attribution, restrictions, and revocation procedure.

### Phase 1 acceptance

- Every intended production source has an owner and permission status.
- No “unknown” or “probably allowed” rights state is considered approved.
- The registry contains stable editions or snapshot policies.
- Reviewer roles and adjudication rules are documented.
- Guam/CNMI product scope is explicitly approved.

## Phase 2 — clean corpus rebuild

**Goal:** create a reproducible corpus rather than repairing the legacy collection
in place.

### Ingestion contract

Every chunk must contain:

```text
source_id
source_family_id / derivative_of
title or entry headword
author / editor / translator / speaker / contributor
publisher or owner
canonical URL or stable identifier
edition / version / published_at / retrieved_at
content_role
region / island / dialect / orthography
rights_status / permission_reference / allowed_uses / expiration
review_status / reviewed_by / reviewed_at
page / section / timestamp / entry locator
content_sha256 / source_sha256 / parser_version / chunk_index
age and teaching suitability
```

### Build process

1. Create a new collection with a versioned name.
2. Store source snapshots outside Git when redistribution is not permitted.
3. Verify checksums and parser versions.
4. Strip navigation, footers, error pages, and repeated templates before chunking.
5. Exact-deduplicate and near-deduplicate before embedding.
6. Preserve source-family lineage and do not count derivatives as independent.
7. Split historical material and role-filter modern evidence.
8. Add query traces explaining why every retrieved chunk was eligible.
9. Compare old and new results with a fixed regression suite.
10. Release behind corpus-version and rollback flags.

### Phase 2 acceptance

- exact redundant rows below 1%;
- zero known boilerplate or error-page chunks;
- 100% required provenance, locator, checksum, role, and rights fields;
- zero blocked or unregistered sources;
- retrieval tests prove role eligibility and regional separation;
- reproducible source snapshots and ingestion command;
- old/new comparison reviewed and rollback tested.

## Phase 3 — human-reviewed teaching layer

**Goal:** make beginner content safe enough for family learning.

### Review workflow

1. Review canonical concepts category by category.
2. Record reviewer identity, date, sources, regional applicability, and decision.
3. Send disagreements to a second reviewer and preserve adjudication notes.
4. Separate recommended teaching form, accepted variant, colloquial usage,
   historical form, and deprecated/unsupported form.
5. Review every example sentence independently from its headword.
6. Review pronunciation text and audio separately.
7. Withhold unresolved beginner content instead of filling gaps with a model.

### Audio program

- Keep TTS as an explicitly synthetic fallback.
- Record consented native speakers for the core learning path.
- Retain speaker, island/community, recording date, consent scope, pronunciation
  target, editor, reviewer, and revocation information.
- Require named reviewer evidence before `approved` appears in a manifest.

### Phase 3 acceptance

- 100% of beginner canonical items are human-reviewed or withheld;
- two-reviewer adjudication for critical conflicts;
- all learner examples reviewed;
- core audio is native-reviewed or visibly synthetic;
- no anonymous approval records;
- review coverage and unresolved issues are measurable.

## Phase 4 — integrated model evaluation and routing

**Goal:** choose models using the real governed HåfaGPT workload.

The provisional candidates remain:

- GPT-5.6 Terra for the main tutor;
- GPT-5.6 Luna for high-volume drills;
- Claude Sonnet 5 for premium explanation review;
- the current DeepSeek model as control;
- Gemini 3.6 Flash for a separate vision/document track.

The evaluation must use at least 100 held-out cases that were authored and
adjudicated independently of the reference injected into the prompt. It must test:

- Guam/CNMI orthography choices;
- vocabulary and grammar;
- multi-turn teaching and correction;
- source conflicts and citations;
- abstention when evidence is absent;
- cultural sensitivity and child suitability;
- retrieval eligibility and historical leakage;
- latency, cost, provider failures, and fallback behavior;
- images/documents separately from text.

No model is promoted until both reviewers approve critical language behavior and
the integrated application suite passes. Routing should be enabled behind a model
flag with an immediate rollback path.

## Phase 5 — family platform improvements

After trust foundations are in place:

- build a clear daily family learning loop;
- support household profiles and shared goals without exposing private activity;
- let learners choose or understand Guam/CNMI usage;
- show why an answer is trusted in learner-friendly language;
- add source correction and community feedback workflows;
- simplify overlapping learning surfaces;
- add frontend component/integration coverage and improve bundle splitting;
- measure retention, lesson completion, corrected misconceptions, and review
  quality—not only chat volume.

## Release gates and rollback

Every public release that changes language content, retrieval, corpus version, or
model must record:

- source-registry version;
- corpus version and checksum;
- canonical vocabulary version;
- model and prompt version;
- evaluation run ID and reviewer decision;
- feature flag and rollback owner;
- known limitations shown to learners.

Production rollback must independently support the previous model and previous
corpus. A model rollback cannot compensate for a bad corpus, and a corpus rollback
must not require a redeploy.

## Definition of done

The program is complete only when HåfaGPT can answer, for every beginner-facing
language claim: who said it, where it came from, what regional standard it uses,
whether HåfaGPT may use it, who reviewed it, when it was reviewed, and what happens
if the source or community decision changes.
