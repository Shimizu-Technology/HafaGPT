import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVocabularyWordById } from './useVocabularyQuery';


describe('stable vocabulary record query', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the encoded stable ID and caches the exact response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        word_id: 'word/id',
        chamorro: 'hånum',
        definition: 'water',
        part_of_speech: 'n.',
        examples: [],
      }),
    }));

    const { result } = renderHook(
      () => useVocabularyWordById('word/id'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/vocabulary/words/word%2Fid',
    );
    expect(result.current.data?.chamorro).toBe('hånum');
    expect(queryClient.getQueryData(['vocabulary', 'word-id', 'word/id']))
      .toEqual(result.current.data);
  });

  it('surfaces a missing stable record without retrying', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const { result } = renderHook(
      () => useVocabularyWordById('missing'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Dictionary word not found'));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
