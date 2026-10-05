import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatbot } from './useChatbot';

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'learner' } }),
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const callbacks = () => ({ onChunk: vi.fn(), onMetadata: vi.fn(), onDone: vi.fn(), onError: vi.fn(), onCancelled: vi.fn() });

function streamResponse() {
  const text = 'data: {"type":"done","response_time":0.1}\n\ndata: [DONE]\n\n';
  return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(text)); controller.close(); } }));
}

describe('tutor intent transport', () => {
  beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('sends the selected task and curriculum topic with streaming JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(streamResponse());
    const { result } = renderHook(() => useChatbot());
    await act(async () => result.current.sendMessageStream('Try greetings', 'english', 'conv-1', callbacks(), undefined, 'beginner', 'practice', 'greetings'));
    const options = fetchMock.mock.calls[0][1]!;
    expect(JSON.parse(options.body as string)).toMatchObject({ intent: 'practice', learning_topic_id: 'greetings', skill_level: 'beginner' });
  });

  it('preserves the task for file uploads and ordinary non-streaming requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(streamResponse());
    const { result } = renderHook(() => useChatbot());
    await act(async () => result.current.sendMessageStream('Translate this', 'english', 'conv-1', callbacks(), [new File(['sample'], 'note.txt', { type: 'text/plain' })], 'beginner', 'translate', 'greetings'));
    const body = fetchMock.mock.calls[0][1]!.body as FormData;
    expect(body.get('intent')).toBe('translate');
    expect(body.get('learning_topic_id')).toBe('greetings');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ response: 'Example', mode: 'english' })));
    await act(async () => result.current.sendMessage('Explain this', 'english', 'conv-1', undefined, 'explain', 'greetings'));
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toMatchObject({ intent: 'explain', learning_topic_id: 'greetings' });
  });
});
