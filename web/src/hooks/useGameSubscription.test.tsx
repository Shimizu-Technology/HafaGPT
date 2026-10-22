import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGameSubscription } from './useGameSubscription';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isSignedIn: true, isLoaded: true, userId: 'game-learner', sessionId: 'game-session', getToken: async () => 'test-token' }),
  useSession: () => ({ session: { id: 'game-session' } }),
  useUser: () => ({ user: { id: 'game-learner', publicMetadata: {} } }),
}));
let increments: URL[];
let lost: boolean;
let legacy: boolean;
let used: number;
beforeEach(() => {
  increments = []; lost = false; legacy = false; used = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = new URL(String(input));
    if (url.pathname.includes('/usage/increment/')) {
      increments.push(url); used = 1;
      if (lost) { lost = false; throw new Error('Lost approval'); }
      return Response.json({ success: true, new_count: 1, dispatch_token: legacy ? undefined : 'game-dispatch' });
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
