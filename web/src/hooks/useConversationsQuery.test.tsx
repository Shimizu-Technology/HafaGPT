import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateConversation, useTopicConversations, useInitUserData, useConversationMessages, useConversation, useUpdateConversationTitle } from './useConversationsQuery';

const auth = vi.hoisted(() => ({
  isSignedIn: true,
  userId: 'user-1' as string | null,
  getToken: vi.fn<() => Promise<string | null>>(async () => 'test-token'),
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
    auth.getToken.mockReset().mockResolvedValue('test-token');
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}

describe('private conversation ownership', () => {
  beforeEach(() => {
    auth.isSignedIn = true; auth.userId = 'user-1';
    auth.getToken.mockReset().mockResolvedValue('test-token');
    vi.unstubAllGlobals();
  });

  it('does not show cached init, messages or record data to the next owner', async () => {
    const next = deferred<Response>();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      conversations: [{ id: 'conv-a', title: 'Private A' }], messages: [{ id: 1, content: 'Message A' }], id: 'conv-a', title: 'Private A',
    }) }).mockImplementationOnce(async () => ({ ok: true, json: async () => ({ conversations: [{ title: 'Private A' }] }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = makeWrapper();
    const { result, rerender } = renderHook(() => ({ init: useInitUserData(null), messages: useConversationMessages('conv-a'), record: useConversation('conv-a') }), { wrapper });
    await waitFor(() => expect(result.current.init.data?.conversations[0].title).toBe('Private A'));
    await waitFor(() => expect(result.current.messages.data?.[0].content).toBe('Message A'));
    await waitFor(() => expect(result.current.record.data?.title).toBe('Private A'));
    fetchMock.mockReturnValue(next.promise);
    auth.userId = 'user-2'; rerender();
    expect(result.current.init.data).toBeUndefined();
    expect(result.current.messages.data).toBeUndefined();
    expect(result.current.record.data).toBeUndefined();
    await act(async () => next.resolve({ ok: true, json: async () => ({ conversations: [], messages: [], id: 'conv-b' }) } as Response));
    await waitFor(() => expect(result.current.init.data?.conversations).toEqual([]));
  });

  it('requires a token for private reads and mutations', async () => {
    auth.getToken.mockResolvedValue(null);
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => ({ query: useInitUserData(null), create: useCreateConversation() }), { wrapper });
    await waitFor(() => expect(result.current.query.isError).toBe(true));
    await expect(result.current.create.mutateAsync({ title: 'A' })).rejects.toThrow('Sign in again');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects mutation token work that resolves after switching account', async () => {
    const token = deferred<string>(); auth.getToken.mockReturnValue(token.promise);
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = makeWrapper();
    const { result, rerender } = renderHook(() => useCreateConversation(), { wrapper });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.mutateAsync({ title: 'A' }).catch(error => error); });
    await waitFor(() => expect(auth.getToken).toHaveBeenCalledOnce());
    auth.userId = 'user-2'; rerender();
    token.resolve('token-a');
    expect(await pending).toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not transfer a queued mutation to an account switched before token acquisition', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'wrong-b', title: 'A' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = makeWrapper();
    const { result, rerender } = renderHook(() => useCreateConversation(), { wrapper });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.mutateAsync({ title: 'A' }).catch(error => error); });
    auth.userId = 'user-2'; rerender();
    expect(await pending).toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts a mutation on unmount and prevents its late result from changing cache', async () => {
    const response = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(response.promise); vi.stubGlobal('fetch', fetchMock);
    const { wrapper, queryClient } = makeWrapper();
    const original = { conversations: [{ id: 'conv-a', title: 'Original' }], messages: [], active_conversation_id: null };
    queryClient.setQueryData(['init', null, 'user-1'], original);
    const { result, unmount } = renderHook(() => useUpdateConversationTitle(), { wrapper });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.mutateAsync({ conversationId: 'conv-a', title: 'Late' }).catch(error => error); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    unmount();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    response.resolve({ ok: true } as Response);
    expect(await pending).toMatchObject({ name: 'AbortError' });
    expect(queryClient.getQueryData(['init', null, 'user-1'])).toEqual(original);
  });

  it('updates only the current owner cache after creation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'new-a', title: 'A' }) })));
    const { wrapper, queryClient } = makeWrapper();
    const original = { conversations: [], messages: [], active_conversation_id: null };
    queryClient.setQueryData(['init', null, 'user-1'], original);
    queryClient.setQueryData(['init', null, 'user-2'], original);
    const { result } = renderHook(() => useCreateConversation(), { wrapper });
    await result.current.mutateAsync({ title: 'A' });
    expect(queryClient.getQueryData(['init', null, 'user-1'])).toMatchObject({ conversations: [{ id: 'new-a' }] });
    expect(queryClient.getQueryData(['init', null, 'user-2'])).toEqual(original);
  });
});
