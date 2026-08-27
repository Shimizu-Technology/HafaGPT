import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCuratedConceptId } from '../data/conceptEvidence';
import { useRecordLessonExposure } from './useConceptEvidence';


const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: mocks.getToken }),
}));


const queryClient = new QueryClient();
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRecordLessonExposure', () => {
  beforeEach(() => {
    queryClient.clear();
    mocks.getToken.mockReset();
    mocks.getToken.mockResolvedValue('test-token');
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
      await result.current.mutateAsync({ topicId: 'greetings/family?', conceptIds });
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/learning/lessons/greetings%2Ffamily%3F/exposures',
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

  it('rejects when the authenticated session has no token', async () => {
    mocks.getToken.mockResolvedValue(null);
    const { result } = renderHook(() => useRecordLessonExposure(), { wrapper });

    await expect(result.current.mutateAsync({
      topicId: 'greetings',
      conceptIds: [getCuratedConceptId('greetings', 0)],
    })).rejects.toThrow('Authentication required');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces a rejected evidence response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const { result } = renderHook(() => useRecordLessonExposure(), { wrapper });

    await expect(result.current.mutateAsync({
      topicId: 'greetings',
      conceptIds: [getCuratedConceptId('greetings', 0)],
    })).rejects.toThrow('Failed to record lesson evidence');
  });
});
