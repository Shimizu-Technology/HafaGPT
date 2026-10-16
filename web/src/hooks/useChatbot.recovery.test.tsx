import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatbot } from './useChatbot';
import { ConnectionLostError } from '../lib/sendErrors';

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'learner' }, isLoaded: true }),
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true, userId: 'learner', sessionId: 'session' }),
}));

const callbacks = () => ({ onChunk: vi.fn(), onMetadata: vi.fn(), onDone: vi.fn(), onError: vi.fn(), onCancelled: vi.fn(), onStatus: vi.fn() });
const encoder = new TextEncoder();

function sse(frames: string[], failure?: Error) {
  return new Response(new ReadableStream({
    start(controller) {
      frames.forEach(frame => controller.enqueue(encoder.encode(frame)));
      if (failure) controller.error(failure); else controller.close();
    },
  }));
}

async function send(result: { current: ReturnType<typeof useChatbot> }, handlers = callbacks()) {
  let failure: unknown;
  await act(async () => {
    await result.current.sendMessageStream('What does this say?', 'english', 'conv-1', handlers).catch(error => { failure = error; });
  });
  return { failure, handlers };
}

describe('tutor stream recovery transport', () => {
  beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('reports server progress without treating it as reply text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse([
      ': keep-alive\n\n',
      'data: {"type":"status","content":"Reading your photo…"}\n\n',
      'data: {"type":"chunk","content":"Hello"}\n\n',
      'data: {"type":"done","response_time":1}\n\n',
      'data: [DONE]\n\n',
    ]));
    const { result } = renderHook(() => useChatbot());
    const { failure, handlers } = await send(result);
    expect(failure).toBeUndefined();
    expect(handlers.onStatus).toHaveBeenCalledWith('Reading your photo…');
    expect(handlers.onDone).toHaveBeenCalled();
  });

  it('hands a dropped connection back for recovery instead of reporting a failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse(['data: {"type":"chunk","content":"Partial"}\n\n'], new TypeError('Load failed')));
    const { result } = renderHook(() => useChatbot());
    const { failure, handlers } = await send(result);
    expect(failure).toBeInstanceOf(ConnectionLostError);
    expect((failure as ConnectionLostError).pendingId).toMatch(/^pending_/);
    expect(handlers.onError).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('treats a stream that closes without finishing as a dropped connection', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse(['data: {"type":"chunk","content":"Partial"}\n\n']));
    const { result } = renderHook(() => useChatbot());
    const { failure } = await send(result);
    expect(failure).toBeInstanceOf(ConnectionLostError);
  });

  it('reports server rejections in plain language with the API detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ detail: 'Maximum 10 files allowed' }), { status: 400 }));
    const { result } = renderHook(() => useChatbot());
    const { failure, handlers } = await send(result);
    expect(failure).not.toBeInstanceOf(ConnectionLostError);
    expect(handlers.onError).toHaveBeenCalledWith('Maximum 10 files allowed');
  });

  it('checks an owned reply status and maps unknown requests to not found', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'complete', conversation_id: 'conv-1' })))
      .mockResolvedValueOnce(new Response('{"detail":"Request not found"}', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    const { result } = renderHook(() => useChatbot());
    await expect(result.current.checkReplyStatus('pending_abc_def')).resolves.toBe('complete');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/chat\/requests\/pending_abc_def$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer test-token' } });
    await expect(result.current.checkReplyStatus('pending_abc_def')).resolves.toBe('not_found');
    await expect(result.current.checkReplyStatus('pending_abc_def')).rejects.toThrow();
  });
});
