import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatbot } from './useChatbot';
import { ConnectionLostError } from '../lib/sendErrors';
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'learner' }, isLoaded: true }),
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true, userId: 'learner', sessionId: 'session' }),
}));
const callbacks = () => ({ onRequestStarted: vi.fn(), onChunk: vi.fn(), onMetadata: vi.fn(), onDone: vi.fn(), onError: vi.fn(), onCancelled: vi.fn() });
beforeEach(() => vi.restoreAllMocks());
describe('logical send transport', () => {
  it.each(['json', 'file'])('keeps one send identity across %s retries', async kind => {
    const files = kind === 'file' ? [new File(['fixture'], 'note.txt', { type: 'text/plain' })] : undefined;
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));
    const { result } = renderHook(() => useChatbot());
    for (const dispatchToken of ['dispatch-old', 'dispatch-new']) {
      const handlers = callbacks();
      await act(async () => {
        await expect(result.current.sendMessageStream('School note', 'english', 'conv-1', handlers, files, undefined, undefined, undefined, undefined,
          { id: 'tutor_logical_123', dispatchToken })).rejects.toBeInstanceOf(ConnectionLostError);
      });
      const body = fetch.mock.calls[fetch.mock.calls.length - 1]![1]!.body;
      const payload = body instanceof FormData ? Object.fromEntries(body) : JSON.parse(String(body));
      expect(payload.pending_id).toBe('tutor_logical_123');
      expect(payload.logical_send_id).toBe('tutor_logical_123');
      expect(payload.dispatch_token).toBe(dispatchToken);
      expect(handlers.onRequestStarted).toHaveBeenCalledWith('tutor_logical_123');
      expect(handlers.onError).not.toHaveBeenCalled();
    }
  });
  it('reconciles through the atomic fence instead of inferring unsent from a status 404', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'retryable' }));
    const { result } = renderHook(() => useChatbot());
    await expect(result.current.checkReplyStatus('tutor_logical_123')).resolves.toBe('retryable');
    expect(fetch.mock.calls[0][0]).toContain('/api/chat/reconcile/tutor_logical_123');
    expect(fetch.mock.calls[0][1]?.method).toBe('POST');
  });
});
