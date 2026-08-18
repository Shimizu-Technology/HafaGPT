# HåfaGPT Child and Family Privacy Product Gate

**Reviewed:** August 18, 2026 (Guam)

**Scope:** Phase 1 and Phase 2 learning personalization

**Status:** product/engineering gate; not a legal-compliance certification

## Decision

HåfaGPT may improve learning for families without creating named child profiles
or collecting a child's age, school, classroom, or other unnecessary identity
data. During these phases, a parent or guardian owns and supervises any account
used with a child under 13. Capability preferences describe how the experience
should work; they do not describe or identify a child.

Do not market HåfaGPT as a child-account platform or as COPPA compliant until a
qualified privacy/legal review has approved the account model, consent flow,
notices, vendor terms, retention schedule, and deletion verification.

## Data inventory

| Data | Purpose | System/processors | Phase 1 rule |
|---|---|---|---|
| Account name/email and account metadata | authentication and saved continuity | Clerk | caregiver-owned account; no child profile fields |
| Conversations, messages, citations, and feedback | provide grounded tutoring and preserve history | Neon, Render, selected AI/search providers | never send message or source text to product analytics |
| Uploaded images/documents and generated file references | answer an explicit request | S3, Render, selected AI providers | warn against sensitive child/school documents; no analytics content |
| Flashcard, lesson, quiz, and game progress | scheduling and learner continuity | Neon | stable concept IDs; no answer text in the new attempt ledger |
| `learning_attempts` | reproduce learning recommendations | Neon | concept ID, activity type, boolean success, coarse duration, source, timestamp only |
| Page views and allowlisted product events | understand feature use and reliability | PostHog | session replay and DOM autocapture disabled; no chat/form/upload text |
| Error and operational logs | security and reliability | Render, Netlify, Sentry where configured | do not intentionally log message bodies or credentials |
| Subscription records | access control and payment state | Clerk, Stripe | no child-specific billing identity |

## Learning-attempt allowlist

The only PostHog learning event in this phase is
`learning_activity_completed`. Its properties are limited in code to:

- `concept_id` — an allowlisted stable topic identifier such as
  `v1:topic:greetings`;
- `activity_type` — an application-owned identifier such as
  `game:memory_match`;
- `success` — a boolean outcome;
- `duration_bucket` — `under_2m`, `2_to_5m`, `over_5m`, or `unknown`;
- `source` — `lesson` or `today`.

Question text, answers, translations, chat messages, source passages, names,
school/classroom identifiers, exact activity duration, and uploaded content are
not allowed. URL query strings and fragments are stripped before an analytics
event is sent, so lesson or game context cannot leak through a page URL. The
first-party database stores the same minimal attempt plus the account ID needed
to produce that account's plan.

## Retention and deletion

- Account and learning records currently remain while the account is active;
  HåfaGPT does not yet claim a fixed per-table retention schedule.
- Deleting a Clerk account triggers database cleanup for conversations/logs,
  results, usage, feedback, flashcard state/decks, XP, and topic progress.
  `learning_attempts` are deleted by database cascade with their game results.
- Individual conversation deletion removes the conversation from the user's
  active history; permanent account deletion is the full database cleanup path.
- Provider backups may retain encrypted copies until their normal backup
  expiration.
- Before any child-directed account launch, verify deletion end to end across
  Clerk, Neon, object storage, PostHog, error logs, AI-provider retention, and
  backups, and publish a concrete retention schedule.

## Processor and product checks still required

1. Confirm current data-processing/retention terms for Clerk, Neon, Render,
   Netlify, S3, PostHog, Sentry, Stripe, OpenAI/OpenRouter/model providers,
   ElevenLabs, and Brave Search.
2. Verify that account deletion removes owned S3 objects and analytics profiles,
   not only relational rows.
3. Decide whether a family needs multiple private learner spaces. Do not infer
   this from ages or names.
4. If named child profiles are ever proposed, design verifiable parental
   consent, parent access/deletion, collection notices, and age-appropriate
   defaults before implementation.
5. Review public privacy copy whenever processors, event properties, or
   retention behavior changes.

## Phase 2 personalization boundary

Allowed preferences are learner mode (`self`, `with_child`, `helping_family`),
reading support, Chamorro confidence, learning goal, and preferred session
length. They must be optional, editable, and safely defaulted. Do not add date
of birth, child name, school, classroom, teacher, address, or student ID.

The metadata-backed preference keys are stored in the caregiver-owned Clerk
account's client-writable preference metadata and normalized against code
allowlists every time they are read:

| Key | Allowed values | Safe default |
|---|---|---|
| `learner_mode` | `self`, `with_child`, `helping_family` | `self` |
| `reading_support` | `audio_pictures`, `short_text_audio`, `independent` | `short_text_audio` |
| `skill_level` | `beginner`, `intermediate`, `advanced` | `beginner` |
| `learning_goal` | `conversation`, `culture`, `family`, `travel`, `all` | `all` |

Preferred session length is stored only as `user_xp.daily_goal_minutes` (`5`,
`10`, `15`, or `20`; safe default `10`) because that first-party record also
owns the tracked minute counter and completion reward. Legacy
`daily_session_minutes` Clerk metadata is left recoverable but is no longer read
or written, avoiding a non-atomic duplicate preference across providers.

These values are personalization hints, never authorization or identity data.
“Skip for now” writes the safe metadata defaults above, writes the 10-minute
default to the XP goal record, and marks onboarding complete. Because the
metadata is client-writable, unrecognized values must never be trusted by the
planner, analytics, or API; they fall back to these defaults.

## Release checklist

- [ ] No named child, age, school, or classroom field was introduced.
- [ ] New analytics properties are present in the code allowlist and this file.
- [ ] DOM autocapture and session replay remain disabled.
- [ ] Account deletion covers every new first-party table.
- [ ] Privacy Policy processor and data descriptions still match production.
- [ ] A qualified reviewer has approved any claim beyond the caregiver-
  supervised family account described here.
