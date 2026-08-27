import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCuratedConceptId } from '../data/conceptEvidence';
import { useSaveGameResult } from './useGamesQuery';


const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
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
});
