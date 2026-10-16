# Stop during reference lookup

HåfaGPT parents and learners need Stop to finish reliably while Tutor checks Chamorro sources. Live three-worker QA on the preceding implementation found a recorded Stop remaining pending for several minutes during synchronous retrieval. Source inspection found unbounded embedding requests and database operations inside `get_rag_context` → `ChamorroRAG.create_context`, with cancellation checked only around the whole retrieval call.

This change keeps retrieval synchronous and request scoped. OpenAI embedding calls use a five-second timeout and no SDK retry. PostgreSQL connections, query/lock execution, and pool acquisition have five-second limits. The dedicated heartbeat, status, and Stop connections use the same limits. A fifteen-second reference-lookup budget and cancellation checks stop additional lookup lanes or retries once the current bounded operation returns. An embedding completion checks Stop before proceeding to vector SQL. Lexical/history connections and cursors close on success, timeout, or cancellation. Connection retries reuse the existing SQLAlchemy engine and its stale-connection check rather than creating abandoned pools.

These are I/O limits and cooperative checkpoints, not a promise that Python can interrupt every blocking operation instantly. Local embedding CPU work remains cooperative. Existing canonical/card references, source governance, uncertainty prompts, and the disabled photo-streaming rollout are preserved. No schema change or provider configuration change is required.

## Acceptance

Execution owner: Codex. Base `7627bb5` (`#79` merged); isolated branch `codex/cancellable-retrieval-20261016`.

| Case | Expected outcome | Status |
|---|---|---|
| Stop during embedding/retrieval | No subsequent SQL/provider call after cancellation; one saved stopped exchange | Unit regression passed; live multiworker retest pending |
| Slow/failed SQL | Cursor and exact owned connection close; no semantic fallback after Stop | Unit regression, local read-only statement deadline/connection-disappearance test, and dedicated tracker helper timeout on an owned advisory lock passed |
| Concurrent learners | Cancellation/deadline scope never leaks to another request/thread | Unit regression passed |
| Slow vector source | Governed canonical evidence survives; no invented source support | Unit regression passed |
| Engineering gate | Full repository checks pass on final head | Passed: API 862 passed/10 skipped; web 540 passed; source routing 33/33; vocab/audio synchronization, lint, typecheck, production/PWA/bundle build passed |
| Real mobile/desktop Stop | Progress resolves to exact saved outcome; next send works without duplicate usage | Root executes on integrated build; pending |

Content-free `CHAT_REQUEST registered` and `CHAT_REQUEST stop` logs include the worker PID and pending ID so multiworker QA can demonstrate that Stop reached a different process. Logs contain no prompt, reply, attachment, or authentication token.
