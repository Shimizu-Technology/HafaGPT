import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCuratedConceptId } from '../data/conceptEvidence';
import { useGameHistory, useGameStats, useSaveGameResult } from './useGamesQuery';
import { guamDay, loadTodaySession, saveTodaySession, withTodayStep } from '../lib/todaySession';
import type { TodayPlan } from '../lib/todayPlan';


const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  userId: 'user_1',
  token: vi.fn(async () => 'test-token'),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: mocks.token,
    isSignedIn: true,
    userId: mocks.userId,
  }),
}));

vi.mock('../lib/learningAnalytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/learningAnalytics')>();
  return { ...actual, captureLearningActivity: mocks.capture };
});


let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
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
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mocks.capture.mockReset();
    mocks.userId = 'user_1';
    mocks.token.mockReset().mockResolvedValue('test-token');
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => gameResult(),
    })));
  });

  function startTodayGame() {
    const to = '/games/memory?topic=greetings&category=greetings&source=today&return_to=%2F';
    const plan = { activities: [{ id: 'use-greetings', kind: 'play', title: 'Use Greetings', description: 'Practice', minutes: 3, to }] } as TodayPlan;
    saveTodaySession('user_1', { version: 1, day: guamDay(), plan, completed: [] });
    window.history.pushState({}, '', withTodayStep(to, 'use'));
  }

  it('finishes the planned Today game only after its result saves', async () => {
    startTodayGame();
    const { result } = renderHook(() => useSaveGameResult(), { wrapper });
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    await act(async () => {
      await expect(result.current.mutateAsync({ game_type: 'memory_match', category_id: 'greetings', score: 400 })).rejects.toThrow();
    });
    expect(loadTodaySession('user_1')?.completed).toEqual([]);
    await act(async () => {
      await result.current.mutateAsync({ game_type: 'memory_match', category_id: 'greetings', score: 400 });
    });
    expect(loadTodaySession('user_1')?.completed).toEqual(['use-greetings']);
  });

  it('finishes the original Today activity when the learner returns home while saving', async () => {
    startTodayGame();
    let finish: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useSaveGameResult(), { wrapper });
    let saving: Promise<unknown>;
    act(() => { saving = result.current.mutateAsync({ game_type: 'memory_match', category_id: 'greetings', score: 400 }); });
    await waitFor(() => expect(finish).toBeDefined());
    window.history.pushState({}, '', '/');
    await act(async () => {
      finish?.({ ok: true, json: async () => gameResult() } as Response);
      await saving;
    });
    expect(loadTodaySession('user_1')?.completed).toEqual(['use-greetings']);
  });

  it('does not finish the planned topic when settings switch the game category', async () => {
    startTodayGame();
    const { result } = renderHook(() => useSaveGameResult(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ game_type: 'memory_match', category_id: 'numbers', score: 400 });
    });
    expect(loadTodaySession('user_1')?.completed).toEqual([]);
    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string).learning_context).toBeUndefined();
  });

  it('keeps the launch provenance when navigation happens during token retrieval', async () => {
    startTodayGame();
    let releaseToken: ((token: string) => void) | undefined;
    mocks.token.mockImplementationOnce(() => new Promise(resolve => { releaseToken = resolve; }));
    const { result } = renderHook(() => useSaveGameResult(), { wrapper });
    let saving: Promise<unknown>;
    act(() => { saving = result.current.mutateAsync({ game_type: 'memory_match', category_id: 'greetings', score: 400 }); });
    await waitFor(() => expect(releaseToken).toBeDefined());
    window.history.pushState({}, '', '/games/memory?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings');
    await act(async () => { releaseToken?.('test-token'); await saving; });
    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string).learning_context.source).toBe('today');
    expect(loadTodaySession('user_1')?.completed).toEqual(['use-greetings']);
  });

  it('does not save the previous learner round if accounts change while obtaining a token', async () => {
    startTodayGame();
    let releaseToken: ((token: string) => void) | undefined;
    mocks.token.mockImplementationOnce(() => new Promise(resolve => { releaseToken = resolve; }));
    const { result, rerender } = renderHook(() => useSaveGameResult(), { wrapper });
    let saving: Promise<unknown>;
    act(() => { saving = result.current.mutateAsync({ game_type: 'memory_match', category_id: 'greetings', score: 400 }).catch(error => error); });
    await waitFor(() => expect(releaseToken).toBeDefined());
    mocks.userId = 'user_2';
    rerender();
    await act(async () => { releaseToken?.('other-token'); await saving; });
    expect(fetch).not.toHaveBeenCalled();
    expect(loadTodaySession('user_1')?.completed).toEqual([]);
  });

  it('rejects a pending token after the game unmounts before an account change', async () => {
    startTodayGame();
    let releaseToken: ((token: string) => void) | undefined;
    mocks.token.mockImplementationOnce(() => new Promise(resolve => { releaseToken = resolve; }));
    const { result, unmount } = renderHook(() => useSaveGameResult(), { wrapper });
    let saving: Promise<unknown>;
    act(() => { saving = result.current.mutateAsync({ game_type: 'memory_match', category_id: 'greetings', score: 400 }).catch(error => error); });
    await waitFor(() => expect(releaseToken).toBeDefined());
    unmount();
    mocks.userId = 'user_2';
    await act(async () => { releaseToken?.('other-token'); await saving; });
    expect(fetch).not.toHaveBeenCalled();
    expect(loadTodaySession('user_1')?.completed).toEqual([]);
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
