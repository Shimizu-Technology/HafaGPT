import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect, useLayoutEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError, useAccountRequest } from './useAccountRequest';

const auth = vi.hoisted(() => ({
  isSignedIn: true, userId: 'learner-a', sessionId: 'session-a',
  getToken: vi.fn<() => Promise<string | null>>(),
}));
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}

describe('owned request status and layout cleanup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    auth.userId = 'learner-a'; auth.sessionId = 'session-a'; auth.isSignedIn = true;
    auth.getToken.mockReset().mockResolvedValue('token-a');
  });

  it.each([404, 413, 502])('retains HTTP %s and the safe existing message without reading the error body', async status => {
    const read = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('private error detail', { status }));
    const { result } = renderHook(() => useAccountRequest());
    const failure = await result.current.request('/owned/attachment', {}, read).catch(error => error);
    expect(failure).toBeInstanceOf(HttpError);
    if (!(failure instanceof HttpError)) throw failure;
    expect(failure.status).toBe(status);
    expect(failure.message).toBe('The request failed. Please try again.');
    expect(failure.message).not.toContain('private error detail');
    expect(read).not.toHaveBeenCalled();
  });

  it('aborts the old transport before the new owner layout phase or passive effects', async () => {
    const oldResponse = deferred<Response>();
    const transport = vi.spyOn(globalThis, 'fetch').mockReturnValue(oldResponse.promise);
    const read = vi.fn(async () => ({ private: 'A' }));
    const oldSignal = { current: undefined as AbortSignal | undefined };
    let passiveOwner = '';
    const phaseObservations: Array<{ aborted: boolean; passiveOwner: string }> = [];
    const { result, rerender } = renderHook(() => {
      const request = useAccountRequest();
      useLayoutEffect(() => {
        if (auth.userId === 'learner-b') {
          phaseObservations.push({ aborted: oldSignal.current?.aborted === true, passiveOwner });
          // Resolve the old response within the owner-change layout phase.
          oldResponse.resolve(new Response('{"private":"A"}'));
        }
      }, [request.ownerId]);
      useEffect(() => { passiveOwner = auth.userId; }, [request.ownerId]);
      return request;
    });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.request('/owned/a', {}, read).catch(error => error); });
    await waitFor(() => expect(transport).toHaveBeenCalledOnce());
    oldSignal.current = transport.mock.calls[0][1]?.signal as AbortSignal;
    expect(oldSignal.current.aborted).toBe(false);
    auth.userId = 'learner-b'; auth.sessionId = 'session-b'; rerender();
    expect(phaseObservations).toEqual([{ aborted: true, passiveOwner: 'learner-a' }]);
    expect(await pending).toMatchObject({ name: 'AbortError' });
    expect(read).not.toHaveBeenCalled();
  });
});
