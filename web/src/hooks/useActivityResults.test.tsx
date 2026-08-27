import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameResultRecord, useTopicActivityResults } from './useActivityResults';

const auth = vi.hoisted(() => ({
  userId: 'user-1',
  getToken: vi.fn(async () => 'token'),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: auth.getToken,
    isSignedIn: true,
    userId: auth.userId,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('activity result record hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('loads an exact owner-scoped game record', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'result-1', concept_ids: [] }),
    } as Response);

    const { result } = renderHook(() => useGameResultRecord('result-1'), { wrapper });

    await waitFor(() => expect(result.current.data?.id).toBe('result-1'));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/activity-results/games/result-1'),
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('bounds topic previews at the requested count', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { result } = renderHook(() => useTopicActivityResults('greetings', 3), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/activity-results/topics/greetings?limit=3'),
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('clamps topic preview counts before calling the API', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { result } = renderHook(() => useTopicActivityResults('greetings', 99), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/activity-results/topics/greetings?limit=10'),
      { headers: { Authorization: 'Bearer token' } },
    );
  });
});
