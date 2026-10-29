/**
 * Admin charts receive only the days that had activity. Plotting those rows
 * directly draws a line straight across idle days, as if learning happened
 * in between. These helpers lay the rows onto every day of the period
 * (Guam time, matching the API) and format date-only keys without a time
 * zone shift.
 */

const DAY_MS = 86_400_000;

/** Today's date in Guam as YYYY-MM-DD. */
export function guamToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Guam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function dayNumber(key: string): number {
  return Date.parse(`${key.slice(0, 10)}T00:00:00Z`) / DAY_MS;
}

function dayKey(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Every day from `days - 1` days before the last day through the last day.
 * The last day is today in Guam, or the newest row if the API is ahead.
 * `fill(date, previous)` builds a row for a day without data; `previous` is
 * the most recent real or filled row, for cumulative values.
 */
export function fillDailySeries<T extends { date: string }>(
  rows: readonly T[],
  days: number,
  fill: (date: string, previous: T | undefined) => T,
  today: string = guamToday(),
): T[] {
  const byDay = new Map(rows.map(row => [dayNumber(row.date), row]));
  const newest = rows.reduce((max, row) => Math.max(max, dayNumber(row.date)), dayNumber(today));
  const series: T[] = [];
  let previous: T | undefined;
  // Seed cumulative values from the newest real row before the window.
  for (const row of [...rows].sort((a, b) => dayNumber(a.date) - dayNumber(b.date))) {
    if (dayNumber(row.date) < newest - days + 1) previous = row;
  }
  for (let day = newest - days + 1; day <= newest; day += 1) {
    const row = byDay.get(day) ?? fill(dayKey(day), previous);
    series.push(row);
    previous = row;
  }
  return series;
}

/** Inclusive number of days from `first` to `last` (YYYY-MM-DD keys). */
export function daySpan(first: string, last: string): number {
  return Math.max(1, dayNumber(last) - dayNumber(first) + 1);
}

/** Number of days in an admin analytics period. */
export function periodDays(period: '7d' | '30d' | '90d'): number {
  return period === '7d' ? 7 : period === '90d' ? 90 : 30;
}

/** Format a YYYY-MM-DD key as written, independent of the viewer's time zone. */
export function formatDayKey(key: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return new Date(`${String(key).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}
