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

  it.each([true, false])('only releases a resumed reply after acknowledged Stop=%s', async confirmed => {
    rememberPendingReply('owner-a', pointer());
    const handlers = options();
    handlers.check.mockImplementation(() => new Promise(() => {}));
    handlers.cancel.mockResolvedValue(confirmed);
    const { result } = renderHook(() => useResumedReply(handlers));
    await act(async () => result.current.stop());
    expect(result.current.pending).toBe(!confirmed);
    expect(result.current.notice).toMatch(confirmed ? /Stop requested/ : /Couldn’t stop/);
    expect(readPendingReply('owner-a', 'conv-a') === null).toBe(confirmed);
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
