import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { guamDateKey, msUntilGuamMidnight, useWordOfTheDay } from './useVocabularyQuery';

// Guam is UTC+10 all year: 2026-11-04 23:50 in Guam is 2026-11-04 13:50 UTC.
const BEFORE_MIDNIGHT = Date.UTC(2026, 10, 4, 13, 50, 0);

function wordFor(date: string) {
  return { chamorro: date === '2026-11-04' ? 'Nuebi' : 'Hånum', english: 'word', part_of_speech: '', example: null, category: 'x', date };
}

describe('word of the day follows the Guam calendar', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(BEFORE_MIDNIGHT);
    fetchMock = vi.fn(async () => Response.json(wordFor(guamDateKey())));
    vi.stubGlobal('fetch', fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('computes the Guam date and the time to Guam midnight', () => {
    expect(guamDateKey(BEFORE_MIDNIGHT)).toBe('2026-11-04');
    expect(msUntilGuamMidnight(BEFORE_MIDNIGHT)).toBe(10 * 60 * 1000);
    expect(guamDateKey(BEFORE_MIDNIGHT + 10 * 60 * 1000)).toBe('2026-11-05');
  });

  it('replaces yesterday\'s word at Guam midnight without a remount', async () => {
    const { result } = renderHook(() => useWordOfTheDay(), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.chamorro).toBe('Nuebi');

    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60 * 1000 - 1); });
    expect(result.current.data?.chamorro).toBe('Nuebi');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(1_001); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.chamorro).toBe('Hånum');
    expect(result.current.data?.date).toBe('2026-11-05');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('revalidates when a sleeping tab becomes visible after midnight', async () => {
    const { result } = renderHook(() => useWordOfTheDay(), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.date).toBe('2026-11-04');

    // The device slept: the clock moved on but the timer never ran.
    vi.setSystemTime(BEFORE_MIDNIGHT + 60 * 60 * 1000);
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.date).toBe('2026-11-05');
  });

  it('does not refetch on resume when the date has not changed', async () => {
    renderHook(() => useWordOfTheDay(), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
