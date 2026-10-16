import { describe, expect, it, vi } from 'vitest';
import { waitForReplyOutcome, type ReplyStatus } from './replyRecovery';

function harness(results: Array<ReplyStatus | Error>) {
  let clock = 0;
  const waits: number[] = [];
  const check = vi.fn(async () => {
    const next = results.shift();
    if (next instanceof Error) throw next;
    return next ?? 'running';
  });
  const wait = vi.fn(async (ms: number) => { waits.push(ms); clock += ms; });
  return { check, wait, waits, now: () => clock };
}

describe('waitForReplyOutcome', () => {
  it('returns a saved reply on the first check without waiting', async () => {
    const { check, wait, now } = harness(['complete']);
    const phases: string[] = [];
    await expect(waitForReplyOutcome({ check, wait, now, signal: new AbortController().signal, onPhase: phase => phases.push(phase) }))
      .resolves.toBe('complete');
    expect(wait).not.toHaveBeenCalled();
    expect(phases).toEqual(['checking']);
  });

  it('keeps polling while the server is still writing the reply', async () => {
    const { check, wait, waits, now } = harness(['running', 'running', 'failed']);
    const phases: string[] = [];
    await expect(waitForReplyOutcome({ check, wait, now, signal: new AbortController().signal, onPhase: phase => phases.push(phase) }))
      .resolves.toBe('failed');
    expect(waits).toEqual([3000, 3000]);
    expect(phases).toEqual(['checking', 'waiting', 'waiting']);
  });

  it('backs off while offline and resumes normal polling after reconnecting', async () => {
    const offline = new TypeError('Load failed');
    const { check, wait, waits, now } = harness([offline, offline, offline, 'running', 'complete']);
    const phases: string[] = [];
    await expect(waitForReplyOutcome({ check, wait, now, signal: new AbortController().signal, onPhase: phase => phases.push(phase), maxBackoffMs: 10000 }))
      .resolves.toBe('complete');
    expect(waits).toEqual([3000, 6000, 10000, 3000]);
    expect(phases).toEqual(['checking', 'offline', 'offline', 'offline', 'waiting']);
  });

  it('reports an unknown request so the composer can offer a resend', async () => {
    const { check, wait, now } = harness(['not_found']);
    await expect(waitForReplyOutcome({ check, wait, now, signal: new AbortController().signal })).resolves.toBe('not_found');
  });

  it('stops waiting after the time limit', async () => {
    const { check, wait, now } = harness([]);
    await expect(waitForReplyOutcome({ check, wait, now, signal: new AbortController().signal, timeoutMs: 9000 }))
      .resolves.toBe('timed_out');
    expect(check).toHaveBeenCalledTimes(4);
  });

  it('retries a status check that never settles instead of waiting forever', async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const check = vi.fn(() => (++calls === 1 ? new Promise<ReplyStatus>(() => undefined) : Promise.resolve('complete' as const)));
      const phases: string[] = [];
      const outcome = waitForReplyOutcome({
        check, signal: new AbortController().signal, onPhase: phase => phases.push(phase),
        checkTimeoutMs: 1000, wait: async () => undefined,
      });
      await vi.advanceTimersByTimeAsync(1000);
      await expect(outcome).resolves.toBe('complete');
      expect(phases).toEqual(['checking', 'offline']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects promptly when the learner stops or leaves', async () => {
    const controller = new AbortController();
    const check = vi.fn(async () => { controller.abort(); return 'running' as const; });
    await expect(waitForReplyOutcome({ check, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(check).toHaveBeenCalledTimes(1);
  });
});
