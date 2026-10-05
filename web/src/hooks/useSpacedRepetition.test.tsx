import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDueCards, useRecordReview, useSRSummary } from './useSpacedRepetition';
const auth = vi.hoisted(() => ({ userId: 'a' as string | null, isSignedIn: true, getToken: vi.fn<() => Promise<string | null>>() }));
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth }));
function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  auth.userId = 'a'; auth.isSignedIn = true;
  auth.getToken.mockReset().mockImplementation(async () => `token-${auth.userId}`);
});
describe('review account boundaries', () => {
  it.each([['due cards', useDueCards], ['review summary', useSRSummary]] as const)('does not show cached %s from another learner', async (_name, useStats) => {
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ owner: 'a' }) })
      .mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(() => useStats(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toEqual({ owner: 'a' }));
    auth.userId = 'b'; rerender();
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(finish).toBeDefined());
    await act(async () => { finish({ ok: true, json: async () => ({ owner: 'b' }) } as Response); });
    await waitFor(() => expect(result.current.data).toEqual({ owner: 'b' }));
  });
  it('rejects a review before posting when its token returns after an account switch', async () => {
    let finishToken!: (token: string) => void;
    auth.getToken.mockImplementationOnce(() => new Promise(resolve => { finishToken = resolve; }));
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(() => useRecordReview(), { wrapper: makeWrapper() });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.mutateAsync({ cardId: 'card', deckId: 'curated:greetings', quality: 4 }); });
    await waitFor(() => expect(finishToken).toBeDefined());
    auth.userId = 'b'; rerender();
    await act(async () => { finishToken('new-token'); await expect(pending).rejects.toThrow('Learning account changed'); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
