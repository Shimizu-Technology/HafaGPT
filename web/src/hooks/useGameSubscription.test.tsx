import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGameSubscription } from './useGameSubscription';

const account = vi.hoisted(() => ({ premium: false }));
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isSignedIn: true, isLoaded: true, userId: 'game-learner', sessionId: 'game-session', getToken: async () => 'test-token' }),
  useSession: () => ({ session: { id: 'game-session' } }),
  useUser: () => ({ user: { id: 'game-learner', publicMetadata: { is_premium: account.premium } } }),
}));
let increments: URL[];
let lost: boolean;
let legacy: boolean;
let used: number;
let denied: boolean;
beforeEach(() => {
  increments = []; lost = false; legacy = false; used = 0; denied = false; account.premium = false;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = new URL(String(input));
    if (url.pathname.includes('/usage/increment/')) {
      increments.push(url); used = 1;
      if (lost) { lost = false; throw new Error('Lost approval'); }
      return Response.json({ success: !denied, new_count: 1, dispatch_token: legacy || denied ? undefined : 'game-dispatch' });
    }
    return Response.json(url.pathname.endsWith('/promo/status') ? { active: false } : { game_count: used, game_limit: 1, is_premium: false });
  });
});
afterEach(() => vi.restoreAllMocks());
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(useGameSubscription, { wrapper }), client };
}
it('keeps a committed-but-lost approval keyed even when the refreshed allowance is exhausted', async () => {
  const { result, client } = mount();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  lost = true;
  await act(async () => { expect(await result.current.tryUse('game')).toBe(false); });
  await act(async () => { await client.invalidateQueries({ queryKey: ['usage-today'] }); });
  await waitFor(() => expect(result.current.getRemaining('game')).toBe(0));
  expect(result.current.canUse('game')).toBe(true);
  await act(async () => { expect(await result.current.tryUse('game')).toBe(true); });
  expect(increments).toHaveLength(2);
  const id = increments[0].searchParams.get('logical_send_id');
  expect(id).toMatch(/^[\da-f-]{36}$/);
  expect(increments[1].searchParams.get('logical_send_id')).toBe(id);
  expect(result.current.getRoundAttemptId()).toBe(id);
});
it('accepts a legacy game approval without issuing a second increment', async () => {
  legacy = true;
  const { result } = mount();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => { expect(await result.current.tryUse('game')).toBe(true); });
  expect(increments).toHaveLength(1);
  expect(result.current.startStatus.error).toBeNull();
});

it('preserves paid game access when a legacy usage API only knows its free counter', async () => {
  account.premium = true; denied = true;
  const { result } = mount();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => { expect(await result.current.tryUse('game')).toBe(true); });
  expect(increments).toHaveLength(1);
  expect(result.current.getRoundAttemptId()).toBe(increments[0].searchParams.get('logical_send_id'));
});
it('does not turn a genuine free-account denial into approval', async () => {
  denied = true;
  const { result } = mount();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => { expect(await result.current.tryUse('game')).toBe(false); });
  expect(result.current.startStatus.error).toBeNull();
});
