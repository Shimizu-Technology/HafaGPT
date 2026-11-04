import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { guamDateKey, msUntilGuamMidnight, resetServerClockOffset, useWordOfTheDay } from './useVocabularyQuery';

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
    resetServerClockOffset();
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

describe('word of the day when the device clock disagrees with the API', () => {
  const MINUTE = 60 * 1000;
  // Guam is UTC+10: 23:56 on 2026-11-04 in Guam is 13:56 UTC.
  const SERVER_BEFORE_MIDNIGHT = Date.UTC(2026, 10, 4, 13, 56, 0);
  let serverMs: () => number;
  let fetchMock: ReturnType<typeof vi.fn>;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  /** The device clock runs `deviceAheadMs` ahead of the API's. */
  function setUp(deviceAheadMs: number, { reportsTime = true } = {}) {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(SERVER_BEFORE_MIDNIGHT + deviceAheadMs);
    serverMs = () => Date.now() - deviceAheadMs;
    fetchMock = vi.fn(async () => Response.json({
      ...wordFor(guamDateKey(serverMs())),
      ...(reportsTime ? { server_time: new Date(serverMs()).toISOString() } : {}),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  afterEach(() => {
    resetServerClockOffset();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps today\'s word and turns over at the API\'s midnight when the device is five minutes fast', async () => {
    setUp(5 * MINUTE);
    const { result } = renderHook(() => useWordOfTheDay(), { wrapper });
    // The device already says 2026-11-05, so it first asks for that day.
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.chamorro).toBe('Nuebi');
    expect(result.current.data?.date).toBe('2026-11-04');

    // Four minutes later the API is still on 11-04 and nothing was refetched or replaced.
    await act(async () => { await vi.advanceTimersByTimeAsync(3 * MINUTE + 30_000); });
    expect(result.current.data?.chamorro).toBe('Nuebi');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.date).toBe('2026-11-05');
    expect(result.current.data?.chamorro).toBe('Hånum');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows the new day\'s word without waiting for a slow device to reach midnight', async () => {
    setUp(-5 * MINUTE);
    vi.setSystemTime(Date.UTC(2026, 10, 4, 14, 2, 0) - 5 * MINUTE); // API 00:02 on 11-05, device 23:57 on 11-04
    const { result } = renderHook(() => useWordOfTheDay(), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.date).toBe('2026-11-05');
    expect(result.current.data?.chamorro).toBe('Hånum');

    // The device reaches its own midnight three minutes later: no flicker back, no second request.
    const seen: Array<string | undefined> = [];
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * MINUTE); });
    seen.push(result.current.data?.chamorro);
    expect(seen).toEqual(['Hånum']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps asking until an API that does not report its time turns over', async () => {
    setUp(5 * MINUTE, { reportsTime: false });
    const { result } = renderHook(() => useWordOfTheDay(), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    // The device is on 11-05, the API still serves 11-04: that word is shown, not an error.
    expect(result.current.data?.date).toBe('2026-11-04');
    expect(result.current.isError).toBe(false);

    await act(async () => { await vi.advanceTimersByTimeAsync(10 * MINUTE); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    expect(result.current.data?.date).toBe('2026-11-05');
    expect(result.current.data?.chamorro).toBe('Hånum');
  });

  it('does not blank the card while the next day\'s word loads', async () => {
    setUp(0);
    const { result } = renderHook(() => useWordOfTheDay(), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    fetchMock.mockImplementationOnce(() => new Promise(() => {}));
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * MINUTE + 1_001); });
    expect(result.current.data?.chamorro).toBe('Nuebi');
    expect(result.current.isPending).toBe(false);
  });
});

describe('the Guam date does not depend on the device time zone', () => {
  const originalZone = process.env.TZ;
  afterEach(() => {
    if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone;
  });

  it.each(['Pacific/Guam', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Pacific/Auckland', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'UTC'])('%s', (zone) => {
    process.env.TZ = zone;
    // 23:59:59 on 2026-11-04 in Guam is 13:59:59 UTC; one second later it is 2026-11-05.
    const lastSecond = Date.UTC(2026, 10, 4, 13, 59, 59);
    expect(guamDateKey(lastSecond)).toBe('2026-11-04');
    expect(guamDateKey(lastSecond + 1_000)).toBe('2026-11-05');
    expect(msUntilGuamMidnight(lastSecond)).toBe(1_000);
    expect(msUntilGuamMidnight(lastSecond + 1_000)).toBe(24 * 60 * 60 * 1000);
  });
});
