import { describe, expect, it } from 'vitest';
import { daySpan, fillDailySeries, formatDayKey, guamToday, periodDays } from './adminDailySeries';

type Usage = { date: string; chat_count: number };
type Growth = { date: string; total_users: number; new_users: number };

describe('admin daily series', () => {
  it('shows idle days as zero instead of bridging them', () => {
    const rows: Usage[] = [{ date: '2026-10-05', chat_count: 7 }, { date: '2026-10-08', chat_count: 3 }];
    const series = fillDailySeries(rows, 7, date => ({ date, chat_count: 0 }), '2026-10-08');
    expect(series.map(row => [row.date, row.chat_count])).toEqual([
      ['2026-10-02', 0], ['2026-10-03', 0], ['2026-10-04', 0], ['2026-10-05', 7],
      ['2026-10-06', 0], ['2026-10-07', 0], ['2026-10-08', 3],
    ]);
  });

  it('carries cumulative totals forward across days without sign-ups', () => {
    const rows: Growth[] = [
      { date: '2026-09-20', total_users: 4, new_users: 1 },
      { date: '2026-10-02', total_users: 5, new_users: 1 },
    ];
    const series = fillDailySeries(rows, 3, (date, previous) => ({ date, total_users: previous?.total_users ?? 0, new_users: 0 }), '2026-10-03');
    expect(series).toEqual([
      { date: '2026-10-01', total_users: 4, new_users: 0 },
      { date: '2026-10-02', total_users: 5, new_users: 1 },
      { date: '2026-10-03', total_users: 5, new_users: 0 },
    ]);
  });

  it('extends to the newest row when the API is ahead of the local clock', () => {
    const series = fillDailySeries([{ date: '2026-10-10', chat_count: 1 }], 2, date => ({ date, chat_count: 0 }), '2026-10-09');
    expect(series.map(row => row.date)).toEqual(['2026-10-09', '2026-10-10']);
  });

  it('formats date-only keys without shifting the day', () => {
    expect(formatDayKey('2026-10-05')).toBe('Oct 5');
    expect(formatDayKey('2026-10-05T00:00:00')).toBe('Oct 5');
  });

  it('uses Guam time for today and maps periods to day counts', () => {
    expect(guamToday(new Date('2026-10-29T15:30:00Z'))).toBe('2026-10-30');
    expect([periodDays('7d'), periodDays('30d'), periodDays('90d')]).toEqual([7, 30, 90]);
  });

  it('counts inclusive day spans', () => {
    expect(daySpan('2026-10-05', '2026-10-05')).toBe(1);
    expect(daySpan('2026-09-30', '2026-10-02')).toBe(3);
  });
});
