import { isConnectionFailure } from './sendErrors';

/**
 * After a dropped connection, ask the API what happened to a reply instead of
 * assuming it was lost. The server keeps writing and saving replies after a
 * phone disconnects, so most "failures" are complete replies waiting to load.
 */
export type ReplyStatus = 'running' | 'complete' | 'failed' | 'cancelled' | 'interrupted' | 'not_found';
/** `unavailable`: the status service kept failing, so the outcome is unknown. */
export type RecoveryOutcome = Exclude<ReplyStatus, 'running'> | 'timed_out' | 'unavailable';
export type RecoveryPhase = 'checking' | 'waiting' | 'offline' | 'stopping';

interface RecoveryOptions {
  /** Resolve the server status; throw only for transient problems worth retrying. */
  check: (signal: AbortSignal) => Promise<ReplyStatus>;
  signal: AbortSignal;
  onPhase?: (phase: RecoveryPhase) => void;
  pollMs?: number;
  /** A check that never settles (stalled sign-in refresh, half-open socket) counts as offline. */
  checkTimeoutMs?: number;
  /** The server registers a request shortly after it arrives; keep asking before calling it lost. */
  notFoundGraceMs?: number;
  /** Consecutive server or sign-in errors before giving up as `unavailable`. */
  maxStatusErrors?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
}

const abortError = () => new DOMException('Recovery stopped', 'AbortError');

class StatusCheckTimeout extends Error {
  constructor() {
    super('Status check timed out');
    this.name = 'StatusCheckTimeout';
  }
}

/** Run one check with its own abort signal, cancelled on timeout or when recovery stops. */
function checkWithTimeout(
  check: (signal: AbortSignal) => Promise<ReplyStatus>, ms: number, outer: AbortSignal,
): Promise<ReplyStatus> {
  const controller = new AbortController();
  let rejectAbort!: (reason: DOMException) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const stop = () => { controller.abort(); rejectAbort(abortError()); };
  outer.addEventListener('abort', stop, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new StatusCheckTimeout());
    }, ms);
  });
  return Promise.race([check(controller.signal), timeout, aborted]).finally(() => {
    clearTimeout(timer);
    outer.removeEventListener('abort', stop);
  });
}

/** Sleep, waking early when the page becomes visible or the device reconnects. */
export function waitOrWake(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(abortError()); return; }
    const finish = () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', finish);
      signal.removeEventListener('abort', onAbort);
      resolve();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') finish(); };
    const onAbort = () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', finish);
      reject(abortError());
    };
    const timer = setTimeout(finish, ms);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', finish);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function waitForReplyOutcome({
  check, signal, onPhase, pollMs = 3000, checkTimeoutMs = 15000, notFoundGraceMs = 20000, maxStatusErrors = 4,
  maxBackoffMs = 15000, timeoutMs = 10 * 60 * 1000, wait = waitOrWake, now = Date.now,
}: RecoveryOptions): Promise<RecoveryOutcome> {
  const startedAt = now();
  let delay = 0;
  let backoff = pollMs;
  let statusErrors = 0;
  onPhase?.('checking');
  for (;;) {
    if (delay) await wait(delay, signal);
    if (signal.aborted) throw abortError();
    try {
      const status = await checkWithTimeout(check, checkTimeoutMs, signal);
      if (signal.aborted) throw abortError();
      statusErrors = 0;
      backoff = pollMs;
      delay = pollMs;
      if (status === 'not_found' && now() - startedAt < notFoundGraceMs) {
        onPhase?.('checking');
      } else if (status !== 'running') {
        return status;
      } else {
        onPhase?.('waiting');
      }
    } catch (error) {
      if (signal.aborted) throw abortError();
      if (!(error instanceof StatusCheckTimeout) && !isConnectionFailure(error)) {
        // The server answered with an error (or sign-in failed): retrying
        // forever would show a misleading "waiting for connection".
        statusErrors += 1;
        if (statusErrors >= maxStatusErrors) return 'unavailable';
      }
      onPhase?.('offline');
      delay = backoff;
      backoff = Math.min(backoff * 2, maxBackoffMs);
    }
    if (now() - startedAt >= timeoutMs) return 'timed_out';
  }
}
