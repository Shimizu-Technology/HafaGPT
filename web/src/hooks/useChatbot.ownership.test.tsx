import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelledError, useChatbot } from './useChatbot';
import { ConnectionLostError } from '../lib/sendErrors';

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

  it.each([503, 'offline'] as const)('recovers an ordinary live Stop when acknowledgement fails with %s', async failure => {
    const body = new ReadableStream<Uint8Array>();
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(body));
    if (failure === 'offline') transport.mockRejectedValueOnce(new TypeError('Load failed'));
    else transport.mockResolvedValueOnce(new Response('{}', { status: failure }));
    const { result } = renderHook(() => useChatbot());
    const stream = callbacks();
    let sending!: Promise<unknown>;
    act(() => { sending = result.current.sendMessageStream('A', 'english', 'conv-a', stream).catch(error => error); });
    await waitFor(() => expect(transport).toHaveBeenCalledOnce());
    await act(async () => { await result.current.cancelMessage(); expect(await sending).toBeInstanceOf(ConnectionLostError); });
    expect(stream.onCancelled).not.toHaveBeenCalled();
    expect(stream.onError).not.toHaveBeenCalled();
  });

  it('detaches on navigation without sending a server Stop or cancellation receipt', async () => {
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new ReadableStream<Uint8Array>()));
    const { result } = renderHook(() => useChatbot());
    const stream = callbacks();
    let sending!: Promise<unknown>;
    act(() => { sending = result.current.sendMessageStream('A', 'english', 'conv-a', stream).catch(error => error); });
    await waitFor(() => expect(transport).toHaveBeenCalledOnce());
    await act(async () => { await result.current.cancelMessage(false); expect(await sending).toBeInstanceOf(CancelledError); });
    expect(transport).toHaveBeenCalledOnce();
    expect(stream.onCancelled).not.toHaveBeenCalled();
  });

  it('publishes a content-free request identifier before the fetch can be interrupted', async () => {
    const started = vi.fn();
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      expect(started).toHaveBeenCalledWith(expect.stringMatching(/^pending_/));
      return completedStream();
    });
    const { result } = renderHook(() => useChatbot());
    await act(async () => result.current.sendMessageStream('A', 'english', 'conv-a', { ...callbacks(), onRequestStarted: started }));
    expect(transport).toHaveBeenCalledOnce();
  });

  it('passes an unsaved completion warning without discarding the generated answer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('data: {"type":"chunk","content":"Useful answer"}\n\ndata: {"type":"done","response_time":0.1,"saved":false,"save_warning":"Keep this page open"}\n\ndata: [DONE]\n\n'));
    const { result } = renderHook(() => useChatbot());
    const stream = callbacks();
    await act(async () => result.current.sendMessageStream('A', 'english', 'conv-a', stream));
    expect(stream.onChunk).toHaveBeenCalledWith('Useful answer', 'Useful answer');
    expect(stream.onDone).toHaveBeenCalledWith(0.1, false, 'Keep this page open');
    expect(stream.onError).not.toHaveBeenCalled();
  });

  it('flushes a stopped answer and passes its failed-save receipt without reporting a saved cancellation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('data: {"type":"chunk","content":"Partial useful answer"}\n\ndata: {"type":"cancelled","content":"[Message was cancelled by user]","saved":false,"save_warning":"Stopped reply could not be saved"}\n\n'));
    const { result } = renderHook(() => useChatbot());
    const stream = callbacks();
    await act(async () => {
      await expect(result.current.sendMessageStream('A', 'english', 'conv-a', stream)).rejects.toBeInstanceOf(CancelledError);
    });
    expect(stream.onChunk).toHaveBeenCalledWith('Partial useful answer', 'Partial useful answer');
    expect(stream.onChunk.mock.invocationCallOrder[0]).toBeLessThan(stream.onCancelled.mock.invocationCallOrder[0]);
    expect(stream.onCancelled).toHaveBeenCalledExactlyOnceWith(false, 'Stopped reply could not be saved');
    expect(stream.onDone).not.toHaveBeenCalled();
    expect(stream.onError).not.toHaveBeenCalled();
  });

  it('does not dispatch recovery or Stop with a token refreshed after the learner changes', async () => {
    const token = deferred<string>();
    auth.getToken.mockReturnValue(token.promise);
    const transport = vi.spyOn(globalThis, 'fetch');
    const { result, rerender } = renderHook(() => useChatbot());
    const check = result.current.checkReplyStatus('pending_owner_a').catch(error => error);
    const stop = result.current.cancelPendingReply('pending_owner_a');
    auth.userId = 'learner-b'; auth.sessionId = 'session-b'; rerender();
    await act(async () => token.resolve('token-b'));
    expect(await check).toBeInstanceOf(CancelledError);
    expect(await stop).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });

  it('bounds a Stop whose sign-in token never refreshes', async () => {
    vi.useFakeTimers();
    try {
      auth.getToken.mockReturnValue(new Promise(() => {}));
      const transport = vi.spyOn(globalThis, 'fetch');
      const { result } = renderHook(() => useChatbot());
      const stop = result.current.cancelPendingReply('pending_owner_a');
      await act(async () => vi.advanceTimersByTimeAsync(4001));
      expect(await stop).toBe(false);
      expect(transport).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
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
