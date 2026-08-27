import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTopicWorkspace } from './useLearningPath';

const auth = vi.hoisted(() => ({
  isSignedIn: true,
  userId: 'user_a' as string | null,
  getToken: vi.fn(async () => `token-${auth.userId}`),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => auth,
}));

describe('useTopicWorkspace', () => {
  beforeEach(() => {
    auth.isSignedIn = true;
    auth.userId = 'user_a';
    auth.getToken.mockClear();
  });

  it('uses an account-scoped cache key when the signed-in user changes', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const owner = (init?.headers as Record<string, string>).Authorization;
      return {
        ok: true,
        json: async () => ({ owner }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useTopicWorkspace('greetings'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ owner: 'Bearer token-user_a' });
    });

    auth.userId = 'user_b';
    rerender();

    await waitFor(() => {
      expect(result.current.data).toEqual({ owner: 'Bearer token-user_b' });
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(['learning', 'workspace', 'user_a', 'greetings']))
      .toEqual({ owner: 'Bearer token-user_a' });
    expect(queryClient.getQueryData(['learning', 'workspace', 'user_b', 'greetings']))
      .toEqual({ owner: 'Bearer token-user_b' });
  });
});
