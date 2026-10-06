import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelledError, useChatbot } from './useChatbot';

const auth = vi.hoisted(() => ({
  userId: 'learner-a' as string | null,
  sessionId: 'session-a',
  isSignedIn: true,
  isLoaded: true,
  getToken: vi.fn<() => Promise<string | null>>(),
}));
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: auth.userId ? { id: auth.userId } : null, isLoaded: auth.isLoaded }),
  useAuth: () => auth,
}));
const callbacks = () => ({ onChunk: vi.fn(), onMetadata: vi.fn(), onDone: vi.fn(), onError: vi.fn(), onCancelled: vi.fn() });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function completedStream() {
  return new Response('data: {"type":"chunk","content":"Useful answer"}\n\ndata: {"type":"done","response_time":0.1}\n\ndata: [DONE]\n\n');
}

describe('tutor request ownership', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    auth.userId = 'learner-a'; auth.sessionId = 'session-a';
    auth.isSignedIn = true; auth.isLoaded = true;
    auth.getToken.mockReset().mockResolvedValue('token-a');
    localStorage.clear();
  });

  it.each(['missing', 'rejected'] as const)('never falls back to anonymous transport for a %s signed-in token', async failure => {
    if (failure === 'missing') auth.getToken.mockResolvedValue(null);
    else auth.getToken.mockRejectedValue(new Error('token unavailable'));
    const transport = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useChatbot());
    const stream = callbacks();
    await act(async () => {
      await expect(result.current.sendMessageStream('Private draft', 'english', 'conv-a', stream)).rejects.toThrow();
    });
    expect(transport).not.toHaveBeenCalled();
    expect(stream.onError).toHaveBeenCalledOnce();
    expect(result.current.loading).toBe(false);
  });

  it('rejects a token that completes after the owner changes without transport or stale callbacks', async () => {
    const token = deferred<string>();
    auth.getToken.mockReturnValueOnce(token.promise);
    const transport = vi.spyOn(globalThis, 'fetch');
    const { result, rerender } = renderHook(() => useChatbot());
    const stream = callbacks();
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.sendMessageStream('Draft A', 'english', 'conv-a', stream).catch(error => error); });
    auth.userId = 'learner-b'; auth.sessionId = 'session-b'; rerender();
    await act(async () => { token.resolve('token-a'); expect(await pending).toBeInstanceOf(CancelledError); });
    expect(transport).not.toHaveBeenCalled();
    expect(Object.values(stream).every(callback => callback.mock.calls.length === 0)).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('aborts and suppresses a late non-streaming response after unmount', async () => {
    const response = deferred<Response>();
    const transport = vi.spyOn(globalThis, 'fetch').mockReturnValue(response.promise);
    const { result, unmount } = renderHook(() => useChatbot());
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.sendMessage('Private draft').catch(error => error); });
    await waitFor(() => expect(transport).toHaveBeenCalledOnce());
    const signal = transport.mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    response.resolve(new Response(JSON.stringify({ response: 'Late answer', mode: 'english' })));
    expect(await pending).toBeInstanceOf(CancelledError);
  });

  it('does not let an old request finish or Stop notification clear a replacement request', async () => {
    const first = deferred<Response>(); const second = deferred<Response>(); const stop = deferred<Response>();
    const transport = vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(first.promise).mockReturnValueOnce(stop.promise).mockReturnValueOnce(second.promise)
      .mockResolvedValue(new Response('{}'));
    const { result } = renderHook(() => useChatbot());
    const oldCallbacks = callbacks(); const nextCallbacks = callbacks();
    let pendingA!: Promise<unknown>; let pendingB!: Promise<unknown>; let stopping!: Promise<void>;
    act(() => { pendingA = result.current.sendMessageStream('A', 'english', 'conv-a', oldCallbacks).catch(error => error); });
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    act(() => { stopping = result.current.cancelMessage(); });
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(true);
    act(() => { pendingB = result.current.sendMessageStream('B', 'english', 'conv-b', nextCallbacks).catch(error => error); });
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(3));
    await act(async () => { first.resolve(completedStream()); await pendingA; stop.resolve(new Response('{}')); await stopping; });
    expect(result.current.loading).toBe(true);
    expect(transport.mock.calls[2][1]?.signal?.aborted).toBe(false);
    expect(oldCallbacks.onDone).not.toHaveBeenCalled();
    expect(oldCallbacks.onCancelled).not.toHaveBeenCalled();
    await act(async () => { await result.current.cancelMessage(); second.resolve(completedStream()); expect(await pendingB).toBeInstanceOf(CancelledError); });
    expect(transport.mock.calls[2][1]?.signal?.aborted).toBe(true);
    expect(nextCallbacks.onCancelled).toHaveBeenCalledOnce();
    expect(result.current.loading).toBe(false);
    expect(transport.mock.calls[3][1]?.headers).toEqual({ Authorization: 'Bearer token-a' });
  });

  it('cancels an open reader on account change and drops its queued text batch', async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const cancelled = vi.fn();
    const body = new ReadableStream<Uint8Array>({ start(value) { controller = value; }, cancel: cancelled });
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));
    const { result, rerender } = renderHook(() => useChatbot());
    const stream = callbacks();
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.sendMessageStream('A', 'english', 'conv-a', stream).catch(error => error); });
    await waitFor(() => expect(transport).toHaveBeenCalledOnce());
    await act(async () => { controller.enqueue(new TextEncoder().encode('data: {"type":"chunk","content":"Queued A"}\n\n')); });
    auth.userId = 'learner-b'; auth.sessionId = 'session-b'; rerender();
    await act(async () => { expect(await pending).toBeInstanceOf(CancelledError); });
    expect(cancelled).toHaveBeenCalledOnce();
    expect(stream.onChunk).not.toHaveBeenCalled();
    expect(stream.onDone).not.toHaveBeenCalled();
    expect(stream.onCancelled).not.toHaveBeenCalled();
  });

  it('flushes all text before Done and retains the current owner token', async () => {
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(completedStream());
    const { result } = renderHook(() => useChatbot());
    const stream = callbacks();
    await act(async () => result.current.sendMessageStream('A', 'english', 'conv-a', stream));
    expect(stream.onChunk).toHaveBeenCalledWith('Useful answer', 'Useful answer');
    expect(stream.onChunk.mock.invocationCallOrder[0]).toBeLessThan(stream.onDone.mock.invocationCallOrder[0]);
    expect(transport.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer token-a' });
    expect(result.current.loading).toBe(false);
  });
  it.each([false, true])('uses the atomic endpoint and captured revision for an edit with files=%s', async withFiles => {
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(completedStream());
    const { result } = renderHook(() => useChatbot());
    const files = withFiles ? [new File(['fixture'], 'note.txt', { type: 'text/plain' })] : undefined;
    await act(async () => result.current.sendMessageStream('Edited question', 'english', 'conv-a', callbacks(), files, 'beginner', 'explain', undefined, { messageId: 42, revision: 'rev-original' }));
    expect(transport).toHaveBeenCalledOnce();
    expect(transport.mock.calls[0][0]).toContain('/api/conversations/conv-a/messages/42/regenerate');
    const body = transport.mock.calls[0][1]?.body;
    const revision = body instanceof FormData ? body.get('edit_revision') : JSON.parse(String(body)).edit_revision;
    expect(revision).toBe('rev-original');
  });

  it('does not fall back to appending when the atomic endpoint is unavailable', async () => {
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 404 }));
    const { result } = renderHook(() => useChatbot());
    await act(async () => {
      await expect(result.current.sendMessageStream('Edited question', 'english', 'conv-a', callbacks(), undefined, undefined, undefined, undefined, { messageId: 42, revision: 'rev-original' })).rejects.toThrow('Editing is temporarily unavailable');
    });
    expect(transport).toHaveBeenCalledOnce();
    expect(transport.mock.calls[0][0]).toContain('/regenerate');
  });

});
