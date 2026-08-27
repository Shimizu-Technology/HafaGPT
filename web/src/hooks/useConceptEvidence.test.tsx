import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCuratedConceptId } from '../data/conceptEvidence';
import { useRecordLessonExposure } from './useConceptEvidence';


vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));


const queryClient = new QueryClient();
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRecordLessonExposure', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        topic_id: 'greetings',
        lesson_id: 'v1:lesson:greetings:flashcards',
        recorded_concepts: 2,
      }),
    })));
  });

  it('sends only exact concept IDs to the topic-scoped endpoint', async () => {
    const conceptIds = [
      getCuratedConceptId('greetings', 0),
      getCuratedConceptId('greetings', 1),
    ];
    const { result } = renderHook(() => useRecordLessonExposure(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ topicId: 'greetings', conceptIds });
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/learning/lessons/greetings/exposures',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ concept_ids: conceptIds }),
      }),
    );
  });
});
