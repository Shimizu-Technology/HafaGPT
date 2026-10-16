import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResumedReply } from './useResumedReply';
import { readPendingReply, rememberPendingReply } from '../lib/pendingReply';
import type { ReplyStatus } from '../lib/replyRecovery';

const pointer = () => ({ pendingId: 'pending_fixture_a', conversationId: 'conv-a', priorQuestions: 0, createdAt: Date.now() });
const options = () => ({
  ownerId: 'owner-a', conversationId: 'conv-a',
  check: vi.fn<(id: string, signal: AbortSignal) => Promise<ReplyStatus>>().mockResolvedValue('complete'),
  load: vi.fn(async () => true), cancel: vi.fn(async () => true),
});

describe('resuming tutor replies after reload or route return', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('locks immediately on entry, loads the saved reply, then clears only its pointer', async () => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options();
    let finish!: (status: ReplyStatus) => void;
    handlers.check.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useResumedReply(handlers));
    expect(result.current.pending).toBe(true);
    expect(result.current.notice).toBe('Checking your earlier reply…');
    await act(async () => finish('complete'));
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(handlers.load).toHaveBeenCalledWith(expect.objectContaining({ pendingId: 'pending_fixture_a', conversationId: 'conv-a' }), expect.any(AbortSignal));
    expect(readPendingReply('owner-a', 'conv-a')).toBeNull();
  });

  it('preserves an unconfirmed outcome and offers checking rather than duplicate resend', async () => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options(); handlers.load.mockResolvedValue(false);
    const { result } = renderHook(() => useResumedReply(handlers));
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    expect(result.current.pending).toBe(true);
    expect(result.current.notice).toMatch(/saved copy could not be loaded/);
    expect(readPendingReply('owner-a', 'conv-a')).not.toBeNull();
    handlers.load.mockResolvedValue(true);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.pending).toBe(false));
  });

  it('does not read another learner’s pointer or complete their asynchronous recovery', async () => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options();
    let finish!: (status: ReplyStatus) => void;
    handlers.check.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { result, rerender } = renderHook(({ ownerId }) => useResumedReply({ ...handlers, ownerId }), { initialProps: { ownerId: 'owner-a' } });
    rerender({ ownerId: 'owner-b' });
    expect(result.current.pending).toBe(false);
    await act(async () => finish('complete'));
    expect(handlers.load).not.toHaveBeenCalled();
    expect(readPendingReply('owner-a', 'conv-a')).not.toBeNull();
  });

  it.each([true, false])('keeps reconciling a resumed reply after Stop acknowledgement=%s', async confirmed => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options();
    handlers.check.mockImplementation(() => new Promise(() => {}));
    handlers.cancel.mockResolvedValue(confirmed);
    const { result } = renderHook(() => useResumedReply(handlers));
    await act(async () => result.current.stop());
    expect(result.current.pending).toBe(true);
    expect(result.current.notice).toMatch(confirmed ? /Stop requested/ : /Couldn’t confirm Stop/);
    expect(readPendingReply('owner-a', 'conv-a')).not.toBeNull();
  });

  it('releases a known failed terminal request without claiming it was saved or retrying forever', async () => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options(); handlers.check.mockResolvedValue('failed'); handlers.load.mockResolvedValue(false);
    const { result } = renderHook(() => useResumedReply(handlers));
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.notice).toMatch(/ended without a confirmed saved copy/);
    expect(result.current.canRetry).toBe(false);
    expect(readPendingReply('owner-a', 'conv-a')).toBeNull();
  });

  it.each([false, true])('waits through missing-status registration grace and checks the transcript before releasing (saved=%s)', async saved => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      rememberPendingReply('owner-a', pointer());
      const handlers = options(); handlers.check.mockResolvedValue('not_found'); handlers.load.mockResolvedValue(saved);
      const { result } = renderHook(() => useResumedReply(handlers));
      await act(async () => { await vi.advanceTimersByTimeAsync(19000); });
      expect(result.current.pending).toBe(true);
      expect(handlers.load).not.toHaveBeenCalled();
      expect(readPendingReply('owner-a', 'conv-a')).not.toBeNull();
      await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
      expect(handlers.load).toHaveBeenCalledOnce();
      expect(result.current.pending).toBe(false);
      expect(result.current.canRetry).toBe(false);
      expect(result.current.notice).toBe(saved ? undefined : 'Your earlier reply ended without a confirmed saved copy. You can send another message.');
      expect(readPendingReply('owner-a', 'conv-a')).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it.each(['interrupted', 'cancelled'] as const)('keeps a stale-heartbeat %s locked until a later saved outcome is confirmed', async status => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options(); handlers.check.mockResolvedValue(status); handlers.load.mockResolvedValue(false);
    const { result } = renderHook(() => useResumedReply(handlers));
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    expect(result.current.pending).toBe(true);
    expect(result.current.notice).toMatch(/may still be finishing/);
    expect(readPendingReply('owner-a', 'conv-a')).not.toBeNull();
    handlers.check.mockResolvedValue('complete'); handlers.load.mockResolvedValue(true);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(readPendingReply('owner-a', 'conv-a')).toBeNull();
  });

  it('allows Stop again after a transient failure without discarding the pending pointer', async () => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options();
    handlers.check.mockImplementation(() => new Promise(() => {}));
    handlers.cancel.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { result } = renderHook(() => useResumedReply(handlers));
    await act(async () => result.current.stop());
    expect(result.current.notice).toMatch(/Couldn’t confirm Stop/);
    expect(result.current.pending).toBe(true);
    await act(async () => result.current.stop());
    expect(handlers.cancel).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toMatch(/Stop requested/);
    expect(result.current.pending).toBe(true);
    expect(readPendingReply('owner-a', 'conv-a')).not.toBeNull();
  });

  it('lets a live new-conversation send keep ownership when its route becomes stable', () => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options();
    const { result } = renderHook(() => useResumedReply({ ...handlers, isLive: () => true }));
    expect(result.current.pending).toBe(false);
    expect(handlers.check).not.toHaveBeenCalled();
    expect(readPendingReply('owner-a', 'conv-a')).not.toBeNull();
  });
});
