import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateConversation, useTopicConversations } from './useConversationsQuery';

const auth = vi.hoisted(() => ({
  isSignedIn: true,
  userId: 'user-1' as string | null,
  getToken: vi.fn(async () => 'test-token'),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => auth,
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('connected conversation queries', () => {
  beforeEach(() => {
    auth.isSignedIn = true;
    auth.userId = 'user-1';
    auth.getToken.mockClear();
    vi.unstubAllGlobals();
  });

  it('requests a bounded, owner-authenticated topic preview', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return {
        ok: true,
        json: async () => ({
          conversations: [
            { id: 'conv-1', learning_topic_id: 'greetings' },
            { id: 'conv-2', learning_topic_id: 'family' },
            { id: 'legacy-without-topic' },
          ],
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useTopicConversations('greetings', 3), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([
      { id: 'conv-1', learning_topic_id: 'greetings' },
    ]));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/conversation-records/topics/greetings?limit=3');
    expect(init?.headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('persists the canonical topic ID only when a topic started the chat', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return {
        ok: true,
        json: async () => ({
          id: 'conv-1',
          title: 'Practice greetings',
          learning_topic_id: 'greetings',
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    await result.current.mutateAsync({
      title: 'Practice greetings',
      learningTopicId: 'greetings',
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      title: 'Practice greetings',
      learning_topic_id: 'greetings',
    });
  });
});
