# Tutor and application experience acceptance — 2026-10-16

Execution owner: Codex, authorized by Leon. Comprehensive named journeys with focused implementation slices; no claim to cover every possible case.

## Product and verified baseline

HåfaGPT helps families and community learners understand Chamorro school material and continue learning through Tutor, Today, lessons, vocabulary, activities and saved progress. Translation is accuracy-sensitive. Sources: README.md, PRODUCT_UI_AUDIT.md, api/documentation/PROJECT_REVIEW_2026.md, Brain-Dump/work/shimizu-tech/hafa-gpt.md, and the reviewed T3 audit thread.

Baseline: main da576913 contains #78 send recovery. During this task #82 merged as4b18315 (persistence receipts) and #79 merged as7627bb5 (photo candidate disabled). #79 b2288b9 translation, #80 d8cbf95 layout and #81 e9ed56e polish remain open. Original checkout has unrelated dirty lifecycle files; preserved. Runtime uses an isolated worktree, local chamorro_rag PostgreSQL and Clerk development instance. Production data is not a test fixture.

Experience brief: parents should see what a school page says and what action it requires, with readable sources and uncertainty, without navigating repeated controls or resending a completed request. Learners should find their next activity and retain progress. Preserve existing Chamorro content and cultural identity. Compact mobile composer and message actions, readable desktop column, visible keyboard focus and reachable touch targets. Progress appears in the same reply position; theme transitions must not delay input and respect reduced motion.

## Scenarios

Each case is required for its implementation slice unless marked optional. Broad app regression cases remain release-audit coverage; they do not imply that an unchanged game or admin surface was implemented by the tutor PR. Each result needs final tested commit, fixture, observable outcome, saved-outcome check and evidence. Default state not_run. Desktop uses T3 preview; iOS uses Safari simulator. Physical iPhone and Android emulator checks are additional dimensions, blocked by unavailable hardware/SDK. Native-speaker language acceptance is independent from engineering acceptance.

| ID | Journey and steps | Expected visible and saved outcome | Coverage | State |
|---|---|---|---|---|
| T01 | Guest opens Tutor, activates composer with keyboard, signs in | Understandable sign-in, no lost draft, correct account | Desktop/iOS | not_run |
| T02 | Signed-in text send, reload saved conversation | One complete saved exchange, no false error or duplication | Desktop/iOS | not_run |
| T03 | Send photo, interrupt stream, switch app and return | Progress, recovered saved response, no resend/duplicate usage | Desktop/iOS | not_run |
| T04 | Send then reload/navigate while pending | Request/outcome stays discoverable and no false unsent claim | Desktop/iOS | not_run |
| T05 | Stop on a different API worker, then send again | Honest cancel status; next send unaffected; other accounts cannot cancel | API multiworker + UI | not_run |
| T06 | Switch task, reopen history, change account | Correct per-account conversation task, keyboard menu, no leakage | Desktop/iOS | not_run |
| T07 | Open long reply, sources and actions; type with keyboard open | Composer/actions reachable, scroll unobstructed, focus preserved | Desktop/iOS | not_run |
| T08 | Light/dark and reduced motion during navigation/chat | Consistent readable surfaces, instant controls, stable content | Desktop/iOS | not_run |
| P01 | Translate reviewed school fixture and worksheet reconstruction | Complete ordered transcript coverage, privacy and negation guards; timing recorded | API + mobile UI | not_run |
| P02 | Original worksheet and varied real notices reviewed by speaker | Meaning accepted against trusted references | Original upload/native review | blocked |
| A01 | Today starts a practice activity and returns | Clear next action and preserved activity context | Desktop/iOS | not_run |
| A02 | Complete lesson and reload progress | Completion agrees across activity and saved progress | Desktop/iOS | not_run |
| A03 | Flashcards/review then quiz/review | Reachable controls, accurate displayed scoring and persisted result | Desktop/iOS | not_run |
| A04 | Dictionary lookup and story reading/audio | Correct content, navigation and available playback/recovery | Desktop/iOS | not_run |
| A05 | Complete representative reading and non-reading games | Clear controls, completion and saved result where supported | Desktop/iOS | not_run |
| A06 | Settings/progress/history; sign-out/sign-in | Account-scoped saved outcomes and understandable recovery | Desktop/iOS | not_run |
| A07 | Non-admin denied; local admin inspects users/settings/audio review | Correct access boundaries and intact reviewed-audio workflow | Desktop + mobile layout | not_run |

## Execution and retained failures

Execution is in progress; the comprehensive plan is not complete. Desktop and responsive browser results do not establish native iOS keyboard or background behavior.

- T02: local signed-in text send, full reload and DB verification passed on the integration build through a8316e4. Conversation cd9dfd52-ef95-4c5d-9989-d43ecb1ecf3f has one saved exchange, one distinct pending ID and nonempty reply. Native iOS remains blocked.
- T04: real send followed by full page reload before completion passed through a8316e4. Conversation 7cc45e13-b019-45a8-a06d-48391fbfcd21 / pending_1792157696608_0slpd7kw1 showed recovery progress, then the complete reply; pending pointer cleared. DB status complete/registered=true and exactly one matching transcript row. An earlier browser harness attempt failed before POST and is excluded.
- T05: failed on 9c084a6 against the local three-worker API. Pending_1792158347515_anys8awdb was acknowledged by Stop but remained in source retrieval for minutes. UI honestly retained pending tracking. A separate backend fix and affected retest are required.
- T06/T07: 320×740 browser task menu fits at x=21..277, Escape closes it and restores button focus. Selecting Translate updates the URL and the account-scoped chat_intent preference. Reopening the same route without a query restores Translate after Clerk loads. No horizontal overflow. Native keyboard is blocked.
- A02: desktop Greetings lesson completed through 14 cards and a 5-question quiz. UI showed 100%, +35 XP; local DB records 14 flashcards, best score100 and completed=true. Learn reopened as 1/21 completed; 390px topic view retained completion. This is functional acceptance, not independent language validation.
- A04 partial: dictionary search → entry → back retained ?q=håfa. Story paragraphs, English reveal and Continue worked at390px. Story completion/audio/native playback still pending.
- Retained environment failures: Clerk development SDK intermittently timed out while loading after HMR/full reload; a later reload loaded the account and transcript. iOS agent-device opened Safari after boot readiness but snapshot requests repeatedly timed out. The owned simulator was shut down; native gestures, keyboard, lock/return and physical-device coverage remain blocked.

Only the local Clerk test fixture and localhost chamorro_rag database were used. Local daily usage was temporarily reset for that fixture; its original count8 must be restored after QA. No production customer records were modified.

## Engineering, review and release gates

Each PR: full scripts/check.sh, current-head CI, material findings resolved, final changed-code review, and affected interaction retests. CodeRabbit SUCCESS when rate-limited/skipped is not a review. Repository rules have no mandatory reviewer count; documented independent review may serve as advisory fallback, with actual status reported. No branch-rule bypass or bulk dismissal of unread reviews. Release verification maps merge commits to API/web availability and checks affected behavior separately.

## Resources

Lifecycle session 01a1447a-1f6e-7763-bfa5-d0fe9bcd91e1. Owned local stack and tab recorded through dev-lifecycle. Shared database/model/network services and borrowed simulator left untouched. Clean owned runtime after QA and preserve blocked work with exact continuation evidence.
