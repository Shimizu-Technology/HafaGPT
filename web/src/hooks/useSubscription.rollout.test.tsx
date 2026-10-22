import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubscription } from './useSubscription';
import { useChatbot } from './useChatbot';
import { forgetPreparingSend, preparingSends } from '../lib/pendingReply';

const auth = vi.hoisted(() => ({ isSignedIn: true, isLoaded: true, userId: 'rollout-learner', sessionId: '', getToken: async () => 'test-token' }));
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => auth,
  useSession: () => ({ session: { id: auth.sessionId } }),
  useUser: () => ({ isSignedIn: true, isLoaded: true, user: { id: auth.userId, publicMetadata: {}, unsafeMetadata: {} } }),
}));
let sequence = 0;
let now: number;
let keyed: boolean;
let missingToken: boolean;
let unavailable: number;
let increments: URL[];
let streams: Record<string, unknown>[];
let probes: string[];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function mount() {
  return renderHook(() => ({ subscription: useSubscription(), chat: useChatbot() }), { wrapper: wrapper() });
}
const handlers = () => ({ onRequestStarted: vi.fn(), onChunk: vi.fn(), onMetadata: vi.fn(), onDone: vi.fn(), onError: vi.fn(), onCancelled: vi.fn() });
beforeEach(() => {
  auth.sessionId = `rollout-session-${++sequence}`;
  now = 1_800_000_000_000; keyed = true; missingToken = false; unavailable = 404;
  increments = []; streams = []; probes = []; localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.includes('/reconcile/')) {
      probes.push(url.pathname);
      return keyed ? Response.json({ status: 'retryable' }) : new Response('{}', { status: unavailable });
    }
    if (url.pathname.includes('/usage/increment/')) {
      increments.push(url);
      return Response.json({ success: true, new_count: increments.length,
        dispatch_token: keyed && !missingToken && url.searchParams.has('logical_send_id') ? 'dispatch-test' : undefined });
    }
    if (url.pathname === '/api/chat/stream') {
      streams.push(JSON.parse(String(init?.body)));
      return new Response('data: {"type":"chunk","content":"Saved rollout reply"}\n\ndata: {"type":"done","saved":true}\n\ndata: [DONE]\n\n');
    }
    return Response.json(url.pathname.endsWith('/promo/status') ? { active: false } : { chat_count: 0, chat_limit: 8 });
  });
});
afterEach(() => vi.restoreAllMocks());

async function send(result: ReturnType<typeof mount>['result'], id: string) {
  const callbacks = handlers();
  await act(async () => {
    const approval = await result.current.subscription.reserveUse('chat', id);
    expect(approval.success).toBe(true);
    await result.current.chat.sendMessageStream('Note', 'english', 'conv-a', callbacks,
      undefined, undefined, undefined, undefined, undefined,
      approval.dispatch_token ? { id, dispatchToken: approval.dispatch_token } : undefined);
  });
  expect(callbacks.onError).not.toHaveBeenCalled();
  expect(callbacks.onDone).toHaveBeenCalledOnce();
}

describe('Tutor rolling API deployment', () => {
  it.each([404, 405])('uses one legacy approval and stream when reconcile returns %s; caches across remounts', async status => {
    keyed = false; unavailable = status;
    const first = mount();
    await send(first.result, 'tutor_rollout_001');
    first.unmount();
    const second = mount();
    await send(second.result, 'tutor_rollout_002');
    expect(probes).toHaveLength(1);
    expect(increments).toHaveLength(2);
    expect(increments.every(url => !url.search)).toBe(true);
    expect(streams).toHaveLength(2);
    for (const stream of streams) {
      expect(stream.logical_send_id).toBeUndefined();
      expect(stream.dispatch_token).toBeUndefined();
      expect(stream.pending_id).toMatch(/^pending_/);
    }
    expect(preparingSends(auth.userId)).toEqual([]);
  });
  it('defaults to the keyed protocol on a new API', async () => {
    const { result } = mount();
    await send(result, 'tutor_rollout_keyed');
    expect(increments).toHaveLength(1);
    expect(increments[0].searchParams.get('logical_send_id')).toBe('tutor_rollout_keyed');
    expect(streams[0]).toMatchObject({ logical_send_id: 'tutor_rollout_keyed', pending_id: 'tutor_rollout_keyed', dispatch_token: 'dispatch-test' });
  });
  it('reuses an already charged tokenless success rather than incrementing twice', async () => {
    missingToken = true;
    const { result } = mount();
    await send(result, 'tutor_rollout_ignored_key');
    expect(increments).toHaveLength(1);
    expect(increments[0].searchParams.has('logical_send_id')).toBe(true);
    expect(streams[0].logical_send_id).toBeUndefined();
    expect(preparingSends(auth.userId)).toEqual([]);
  });
  it('re-probes after 30 seconds even with intervening legacy sends and handles rollback', async () => {
    keyed = false;
    const { result } = mount();
    await send(result, 'tutor_rollout_first');
    keyed = true; now += 20_000;
    await send(result, 'tutor_rollout_cached');
    expect(probes).toHaveLength(1);
    now += 11_000;
    await send(result, 'tutor_rollout_upgraded');
    expect(streams[2].dispatch_token).toBe('dispatch-test');
    keyed = false;
    await send(result, 'tutor_rollout_rollback');
    expect(probes).toHaveLength(3);
    expect(streams[3].dispatch_token).toBeUndefined();
    expect(increments).toHaveLength(4);
  });
  it('does not share an unavailable capability with a different signed-in session', async () => {
    keyed = false;
    const { result, rerender } = mount();
    await send(result, 'tutor_rollout_old_session');
    auth.sessionId = `another-session-${sequence}`; keyed = true; rerender();
    await send(result, 'tutor_rollout_new_session');
    expect(probes).toHaveLength(2);
    expect(streams[1].dispatch_token).toBe('dispatch-test');
  });
  it('does not downgrade a previously approved keyed send after its preparing pointer cleared', async () => {
    const { result } = mount();
    await send(result, 'tutor_rollout_dispatched');
    forgetPreparingSend(auth.userId, 'tutor_rollout_dispatched');
    expect(preparingSends(auth.userId)).toEqual([]);
    keyed = false;
    await act(async () => {
      await expect(result.current.subscription.reserveUse('chat', 'tutor_rollout_dispatched', true)).resolves.toMatchObject({ status: 'reservation_pending' });
    });
    expect(increments).toHaveLength(1);
    expect(streams).toHaveLength(1);
  });
  it('never downgrades an unresolved keyed approval, even when another send cached legacy support', async () => {
    const { result } = mount();
    const original = vi.mocked(globalThis.fetch).getMockImplementation()!;
    const lost = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const response = await original(input, init);
      if (String(input).includes('/usage/increment/chat?logical_send_id=tutor_rollout_lost')) throw new TypeError('Lost approval response');
      return response;
    });
    await act(async () => { await expect(result.current.subscription.reserveUse('chat', 'tutor_rollout_lost')).rejects.toThrow('Lost approval'); });
    expect(increments).toHaveLength(1);
    keyed = false;
    await act(async () => {
      await expect(result.current.subscription.reserveUse('chat', 'tutor_rollout_lost')).resolves.toMatchObject({ status: 'reservation_pending' });
    });
    expect(increments).toHaveLength(1);
    await send(result, 'tutor_rollout_fresh_during_rollback');
    const checks = probes.length;
    await act(async () => {
      await expect(result.current.subscription.reserveUse('chat', 'tutor_rollout_lost')).resolves.toMatchObject({ status: 'reservation_pending' });
    });
    expect(probes).toHaveLength(checks + 1);
    expect(increments).toHaveLength(2);
    expect(preparingSends(auth.userId)).toContain('tutor_rollout_lost');
    keyed = true; lost.mockImplementation(original);
    await send(result, 'tutor_rollout_lost');
    expect(streams[streams.length - 1]?.dispatch_token).toBe('dispatch-test');
  });
  it.each([401, 500])('does not treat HTTP %s as absence of protocol support', async status => {
    keyed = false; unavailable = status;
    const { result } = mount();
    await act(async () => { await expect(result.current.subscription.reserveUse('chat', 'tutor_rollout_unavailable')).rejects.toMatchObject({ status }); });
    expect(increments).toHaveLength(0);
  });
});
