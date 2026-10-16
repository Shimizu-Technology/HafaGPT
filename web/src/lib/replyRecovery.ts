/**
 * After a dropped connection, ask the API what happened to a reply instead of
 * assuming it was lost. The server keeps writing and saving replies after a
 * phone disconnects, so most "failures" are complete replies waiting to load.
 */
export type ReplyStatus = 'running' | 'complete' | 'failed' | 'cancelled' | 'interrupted' | 'not_found';
export type RecoveryOutcome = Exclude<ReplyStatus, 'running'> | 'timed_out';
export type RecoveryPhase = 'checking' | 'waiting' | 'offline';

interface RecoveryOptions {
  /** Resolve the server status; throw only for transient problems worth retrying. */
  check: (signal: AbortSignal) => Promise<ReplyStatus>;
  signal: AbortSignal;
  onPhase?: (phase: RecoveryPhase) => void;
  pollMs?: number;
  /** A check that never settles (stalled sign-in refresh, half-open socket) counts as offline. */
  checkTimeoutMs?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
}

const abortError = () => new DOMException('Recovery stopped', 'AbortError');

/** Run one check with its own abort signal, cancelled on timeout or when recovery stops. */
function checkWithTimeout(
  check: (signal: AbortSignal) => Promise<ReplyStatus>, ms: number, outer: AbortSignal,
): Promise<ReplyStatus> {
  const controller = new AbortController();
  const stop = () => controller.abort();
  outer.addEventListener('abort', stop, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Status check timed out'));
    }, ms);
  });
  return Promise.race([check(controller.signal), timeout]).finally(() => {
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
  check, signal, onPhase, pollMs = 3000, checkTimeoutMs = 15000, maxBackoffMs = 15000, timeoutMs = 10 * 60 * 1000,
  wait = waitOrWake, now = Date.now,
}: RecoveryOptions): Promise<RecoveryOutcome> {
  const startedAt = now();
  let delay = 0;
  let backoff = pollMs;
  onPhase?.('checking');
  for (;;) {
    if (delay) await wait(delay, signal);
    if (signal.aborted) throw abortError();
    try {
      const status = await checkWithTimeout(check, checkTimeoutMs, signal);
      if (signal.aborted) throw abortError();
      if (status !== 'running') return status;
      onPhase?.('waiting');
      delay = pollMs;
      backoff = pollMs;
    } catch {
      if (signal.aborted) throw abortError();
      onPhase?.('offline');
      delay = backoff;
      backoff = Math.min(backoff * 2, maxBackoffMs);
    }
    if (now() - startedAt >= timeoutMs) return 'timed_out';
  }
}
