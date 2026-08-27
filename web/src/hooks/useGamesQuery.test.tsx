import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCuratedConceptId } from '../data/conceptEvidence';
import { useGameHistory, useGameStats, useSaveGameResult } from './useGamesQuery';


const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  userId: 'user_1',
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: async () => 'test-token',
    isSignedIn: true,
    userId: mocks.userId,
  }),
}));

vi.mock('../lib/learningAnalytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/learningAnalytics')>();
  return { ...actual, captureLearningActivity: mocks.capture };
});


function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

function gameResult() {
  return {
    id: 'result-1',
    game_type: 'memory_match',
    category_id: 'greetings',
    score: 400,
    created_at: '2026-08-28T00:00:00Z',
  };
}

describe('useSaveGameResult concept context', () => {
  beforeEach(() => {
    mocks.capture.mockReset();
    mocks.userId = 'user_1';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => gameResult(),
    })));
  });

  it('nests exact concepts only inside a validated learning launch', async () => {
    window.history.pushState(
      {},
      '',
      '/games/memory?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings',
    );
    const concepts = [
      getCuratedConceptId('greetings', 0),
      getCuratedConceptId('greetings', 1),
    ];
    const { result } = renderHook(() => useSaveGameResult(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        game_type: 'memory_match',
        category_id: 'greetings',
        score: 400,
        stars: 3,
        concept_ids: concepts,
        client_attempt_id: '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678',
      });
    });

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      game_type: 'memory_match',
      category_id: 'greetings',
      score: 400,
      stars: 3,
      client_attempt_id: '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678',
      learning_context: {
        topic_id: 'greetings',
        source: 'topic',
        concept_ids: concepts,
      },
    });
    expect(mocks.capture).toHaveBeenCalledOnce();
  });

  it('drops concept IDs from an ordinary game-library result', async () => {
    window.history.pushState({}, '', '/games/memory');
    const { result } = renderHook(() => useSaveGameResult(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        game_type: 'memory_match',
        category_id: 'greetings',
        score: 400,
        concept_ids: [getCuratedConceptId('greetings', 0)],
      });
    });

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      game_type: 'memory_match',
      category_id: 'greetings',
      score: 400,
    });
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it('does not show one account game stats while another account loads', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const scopedWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    let resolveSecondFetch: ((value: Response | PromiseLike<Response>) => void) | undefined;
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_games: 3,
          average_score: 90,
          average_stars: 3,
          recent_results: [],
        }),
      } as Response)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecondFetch = resolve;
      }));

    const { result, rerender } = renderHook(() => useGameStats(), {
      wrapper: scopedWrapper,
    });
    await waitFor(() => expect(result.current.data?.total_games).toBe(3));

    mocks.userId = 'user_2';
    rerender();
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecondFetch?.({
        ok: true,
        json: async () => ({
          total_games: 0,
          average_score: 0,
          average_stars: 0,
          recent_results: [],
        }),
      } as Response);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.data?.total_games).toBe(0));
  });

  it('does not show one account game history while another account loads', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const scopedWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const pagination = {
      page: 1,
      per_page: 10,
      total_count: 1,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    };
    let resolveSecondFetch: ((value: Response | PromiseLike<Response>) => void) | undefined;
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [gameResult()], pagination }),
      } as Response)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecondFetch = resolve;
      }));

    const { result, rerender } = renderHook(() => useGameHistory(), {
      wrapper: scopedWrapper,
    });
    await waitFor(() => expect(result.current.data?.results).toHaveLength(1));

    mocks.userId = 'user_2';
    rerender();
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecondFetch?.({
        ok: true,
        json: async () => ({
          results: [],
          pagination: { ...pagination, total_count: 0, total_pages: 0 },
        }),
      } as Response);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.data?.results).toEqual([]));
  });
});
