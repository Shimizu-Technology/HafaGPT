import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategoryWordPages, useVocabularyWordById } from './useVocabularyQuery';


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

describe('whole-category search', () => {
  afterEach(() => vi.unstubAllGlobals());
  const clientWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
  it('sends the search to the API and keeps query-specific pagination', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const offset = new URL(url).searchParams.get('offset');
      return { ok: true, json: async () => ({ words: [{ chamorro: `word-${offset}`, definition: 'water', part_of_speech: '', examples: [] }], total: 2, category_total: 70, category: { id: 'greetings' } }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCategoryWordPages('greetings', 'water', 1), { wrapper: clientWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).searchParams.get('q'))).toEqual(['water', 'water']);
    expect(result.current.hasNextPage).toBe(false);
  });
  it('falls back to the entire category when a rolling deploy uses the older API', async () => {
    const word = (chamorro: string, definition: string) => ({ chamorro, definition, part_of_speech: '', examples: [] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ words: [word('first', 'hello')], total: 2, category: { id: 'greetings' } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ words: [word('last', 'thank you')], total: 2 }) }));
    const { result } = renderHook(() => useCategoryWordPages('greetings', 'thank you', 1), { wrapper: clientWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].words.map(word => word.chamorro)).toEqual(['last']);
    expect(result.current.data?.pages[0].total).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
