import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIncrementUsage, useUsage } from './useSubscription';

const auth = vi.hoisted(() => ({ isSignedIn: true, userId: 'learner-a', sessionId: 'session-a', getToken: vi.fn<() => Promise<string | null>>() }));
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth, useSession: () => ({ session: null }), useUser: () => ({ user: null }) }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usage account ownership', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); auth.userId = 'learner-a'; auth.sessionId = 'session-a'; auth.isSignedIn = true;
    auth.getToken.mockReset().mockResolvedValue('token-a');
  });
  it('does not reuse previous learner usage while the next account loads', async () => {
    const next = deferred<Response>();
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{"chat_count":9}')).mockReturnValue(next.promise);
    const { result, rerender } = renderHook(() => useUsage(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.chat_count).toBe(9));
    auth.userId = 'learner-b'; auth.sessionId = 'session-b'; auth.getToken.mockResolvedValue('token-b'); rerender();
    expect(result.current.data).toBeUndefined();
    await act(async () => next.resolve(new Response('{"chat_count":1}')));
    await waitFor(() => expect(result.current.data?.chat_count).toBe(1));
    expect(transport.mock.calls[1][1]?.headers).toEqual({ Authorization: 'Bearer token-b' });
  });
  it('rejects an increment queued before a different account becomes active', async () => {
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"success":true}'));
    const { result, rerender } = renderHook(() => useIncrementUsage(), { wrapper: wrapper() });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.mutateAsync('chat').catch(error => error); });
    auth.userId = 'learner-b'; auth.sessionId = 'session-b'; rerender();
    expect(await pending).toMatchObject({ name: 'AbortError' }); expect(transport).not.toHaveBeenCalled();
  });
  it('rejects a token resolved after the usage owner switches', async () => {
    const token = deferred<string>(); auth.getToken.mockReturnValue(token.promise);
    const transport = vi.spyOn(globalThis, 'fetch');
    const { result, rerender } = renderHook(() => useIncrementUsage(), { wrapper: wrapper() });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.mutateAsync('chat').catch(error => error); });
    await waitFor(() => expect(auth.getToken).toHaveBeenCalledOnce());
    auth.userId = 'learner-b'; auth.sessionId = 'session-b'; rerender(); token.resolve('token-b');
    expect(await pending).toMatchObject({ name: 'AbortError' }); expect(transport).not.toHaveBeenCalled();
  });
  it('does not increment usage with a missing signed-in token', async () => {
    auth.getToken.mockResolvedValue(null); const transport = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useIncrementUsage(), { wrapper: wrapper() });
    await expect(result.current.mutateAsync('chat')).rejects.toThrow('Sign in again'); expect(transport).not.toHaveBeenCalled();
  });
});
