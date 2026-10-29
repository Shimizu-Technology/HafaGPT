import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAnalytics } from './AdminAnalytics';

const analyticsMocks = vi.hoisted(() => ({
  periods: [] as string[],
  usage: { data: undefined as unknown, isLoading: false, isError: false },
  growth: { data: undefined as unknown, isLoading: false, isError: false },
  feature: { data: undefined as unknown, isLoading: false, isError: false },
  advanced: { data: undefined as unknown, isLoading: false, isError: false },
}));

vi.mock('../../hooks/useAdminQuery', () => ({
  useUsageTrends: (period: string) => { analyticsMocks.periods.push(`usage:${period}`); return analyticsMocks.usage; },
  useUserGrowth: (period: string) => { analyticsMocks.periods.push(`growth:${period}`); return analyticsMocks.growth; },
  useFeatureUsage: () => analyticsMocks.feature,
  useAdvancedAnalytics: () => analyticsMocks.advanced,
}));

// Render the plotted days as a list so tests can read the chart's window.
vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const Empty = () => null;
  return {
    ResponsiveContainer: Pass, Tooltip: Empty, Legend: Empty, XAxis: Empty, YAxis: Empty, CartesianGrid: Empty,
    Line: Empty, Bar: Empty, Pie: Empty, Cell: Empty,
    LineChart: ({ data }: { data: { date: string }[] }) => <ol aria-label="Daily usage days">{data.map(day => <li key={day.date}>{day.date}</li>)}</ol>,
    BarChart: Empty, PieChart: Empty,
  };
});

vi.mock('./AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const usage = (rows: unknown[]) => ({ period: '7d', window_end: '2026-10-30', data: rows, totals: { chat: 0, games: 0, quizzes: 0 } });

describe('AdminAnalytics data states', () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    analyticsMocks.usage = { data: usage([{ date: '2026-10-29', chat_count: 3, game_count: 1, quiz_count: 0, active_users: 1 }]), isLoading: false, isError: false };
    analyticsMocks.growth = { data: { period: '7d', window_end: '2026-10-30', data: [] }, isLoading: false, isError: false };
    analyticsMocks.feature = { data: undefined, isLoading: false, isError: false };
    analyticsMocks.advanced = { data: undefined, isLoading: false, isError: false };
    analyticsMocks.periods = [];
  });

  it('plots only the measured span when an older API omits window_end', () => {
    analyticsMocks.usage = { data: { period: '30d', data: [
      { date: '2026-10-05', chat_count: 1, game_count: 0, quiz_count: 0, active_users: 1 },
      { date: '2026-10-08', chat_count: 2, game_count: 0, quiz_count: 0, active_users: 1 },
    ], totals: { chat: 3, games: 0, quizzes: 0 } }, isLoading: false, isError: false };
    render(<AdminAnalytics />);
    const days = [...screen.getByRole('list', { name: 'Daily usage days' }).querySelectorAll('li')].map(li => li.textContent);
    expect(days).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
  });

  it('switching period refetches both series for that period', () => {
    render(<AdminAnalytics />);
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(analyticsMocks.periods).toEqual(expect.arrayContaining(['usage:7d', 'growth:7d']));
  });

  it('plots the days the API counted, ending on its window_end', () => {
    // The browser is already on Nov 2 in Guam; the API's window still ends Oct 30.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-01T18:00:00Z'));
    render(<AdminAnalytics />);
    vi.useRealTimers();
    const days = screen.getByRole('list', { name: 'Daily usage days' }).querySelectorAll('li');
    expect(days).toHaveLength(30);
    expect(days[0]).toHaveTextContent('2026-10-01');
    expect(days[days.length - 1]).toHaveTextContent('2026-10-30');
  });

  it.each(['feature', 'advanced'] as const)('flags stale %s analytics after a failed refresh', (source) => {
    analyticsMocks[source] = { data: {}, isLoading: false, isError: true };
    render(<AdminAnalytics />);
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't refresh analytics.");
  });

  it('labels retained data as stale when a refresh fails', () => {
    analyticsMocks.usage = { ...analyticsMocks.usage, isError: true };
    render(<AdminAnalytics />);
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't refresh analytics. Showing the last data that loaded.");
  });

  it('treats a successful empty period as idle, not missing', () => {
    analyticsMocks.usage = { data: usage([]), isLoading: false, isError: false };
    render(<AdminAnalytics />);
    expect(screen.getByText('No chats, games, or quizzes in this period.')).toBeInTheDocument();
    expect(screen.queryByText(/couldn't be loaded/)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says usage could not be loaded when the first request fails', () => {
    analyticsMocks.usage = { data: undefined, isLoading: false, isError: true };
    render(<AdminAnalytics />);
    expect(screen.getByText("Usage data couldn't be loaded. Try another period or refresh.")).toBeInTheDocument();
  });

  it('marks the selected period for assistive technology', () => {
    render(<AdminAnalytics />);
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'false');
  });
});
