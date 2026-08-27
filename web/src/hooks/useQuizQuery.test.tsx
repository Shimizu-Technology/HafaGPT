import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useQuizHistory,
  useQuizResultDetail,
  useQuizStats,
  useWeakAreas,
} from './useQuizQuery';


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

  it('does not show one account quiz stats while another account loads', async () => {
    let resolveSecondFetch: ((value: Response | PromiseLike<Response>) => void) | undefined;
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_quizzes: 3,
          average_score: 90,
          best_category: 'greetings',
          best_category_title: 'Greetings & Basics',
          best_category_percentage: 100,
          recent_results: [],
        }),
      } as Response)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecondFetch = resolve;
      }));

    const { result, rerender } = renderHook(() => useQuizStats(), { wrapper });
    await waitFor(() => expect(result.current.data?.total_quizzes).toBe(3));

    mocks.userId = 'user_2';
    rerender();

    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecondFetch?.({
        ok: true,
        json: async () => ({
          total_quizzes: 0,
          average_score: 0,
          best_category: null,
          best_category_title: null,
          best_category_percentage: null,
          recent_results: [],
        }),
      } as Response);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.data?.total_quizzes).toBe(0));
  });

  it('keeps quiz history in user-scoped cache entries after an account switch', async () => {
    let resolveSecondFetch: ((value: Response | PromiseLike<Response>) => void) | undefined;
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 'user_1_result' }],
          pagination: {
            page: 1,
            per_page: 20,
            total_count: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }),
      } as Response)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecondFetch = resolve;
      }));

    const { result, rerender } = renderHook(() => useQuizHistory(), { wrapper });
    await waitFor(() => expect(result.current.data?.pagination.total_count).toBe(1));

    mocks.userId = 'user_2';
    rerender();

    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecondFetch?.({
        ok: true,
        json: async () => ({
          results: [],
          pagination: {
            page: 1,
            per_page: 20,
            total_count: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        }),
      } as Response);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.data?.pagination.total_count).toBe(0));

    expect(queryClient.getQueryState(['quizHistory', 'user_1', 1, 20])).toBeDefined();
    expect(queryClient.getQueryState(['quizHistory', 'user_2', 1, 20])).toBeDefined();
  });

  it('keeps weak-area recommendations in user-scoped cache entries after an account switch', async () => {
    let resolveSecondFetch: ((value: Response | PromiseLike<Response>) => void) | undefined;
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          weak_areas: [{
            category_id: 'greetings',
            category_title: 'Greetings & Basics',
            avg_score: 40,
            attempt_count: 2,
            last_attempt: '2026-08-28T00:00:00Z',
            priority: 'high',
          }],
          has_weak_areas: true,
          recommendation: null,
        }),
      } as Response)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecondFetch = resolve;
      }));

    const { result, rerender } = renderHook(() => useWeakAreas(), { wrapper });
    await waitFor(() => expect(result.current.data?.has_weak_areas).toBe(true));

    mocks.userId = 'user_2';
    rerender();

    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecondFetch?.({
        ok: true,
        json: async () => ({
          weak_areas: [],
          has_weak_areas: false,
          recommendation: null,
        }),
      } as Response);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.data?.has_weak_areas).toBe(false));

    expect(queryClient.getQueryState(['weakAreas', 'user_1'])).toBeDefined();
    expect(queryClient.getQueryState(['weakAreas', 'user_2'])).toBeDefined();
  });
});
