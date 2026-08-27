import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizResultDetail } from './useQuizQuery';


const mocks = vi.hoisted(() => ({ userId: 'user_1' }));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: async () => 'test-token',
    isSignedIn: true,
    userId: mocks.userId,
  }),
}));


describe('quiz query ownership', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    mocks.userId = 'user_1';
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 'result_1',
        category_id: 'greetings',
        category_title: 'Greetings & Basics',
        score: 1,
        total: 1,
        percentage: 100,
        time_spent_seconds: 10,
        created_at: '2026-08-28T00:00:00Z',
        learning_topic_id: 'greetings',
        learning_source: 'lesson',
        assessment_id: 'v1:lesson:greetings:embedded-quiz',
        answers: [],
      }),
    })));
  });

  it('keeps protected result records in user-scoped cache entries', async () => {
    const { result, rerender } = renderHook(
      () => useQuizResultDetail('result_1'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    mocks.userId = 'user_2';
    rerender();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    expect(queryClient.getQueryState(['quizResult', 'user_1', 'result_1'])).toBeDefined();
    expect(queryClient.getQueryState(['quizResult', 'user_2', 'result_1'])).toBeDefined();
  });
});
