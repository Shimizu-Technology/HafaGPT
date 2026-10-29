import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAnalytics } from './AdminAnalytics';

const analyticsMocks = vi.hoisted(() => ({
  usage: { data: undefined as unknown, isLoading: false, isError: false },
  growth: { data: undefined as unknown, isLoading: false, isError: false },
}));

vi.mock('../../hooks/useAdminQuery', () => ({
  useUsageTrends: () => analyticsMocks.usage,
  useUserGrowth: () => analyticsMocks.growth,
  useFeatureUsage: () => ({ data: undefined, isLoading: false }),
  useAdvancedAnalytics: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('./AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const usage = (rows: unknown[]) => ({ period: '7d', window_end: '2026-10-30', data: rows, totals: { chat: 0, games: 0, quizzes: 0 } });

describe('AdminAnalytics data states', () => {
  beforeEach(() => {
    analyticsMocks.usage = { data: usage([{ date: '2026-10-29', chat_count: 3, game_count: 1, quiz_count: 0, active_users: 1 }]), isLoading: false, isError: false };
    analyticsMocks.growth = { data: { period: '7d', window_end: '2026-10-30', data: [] }, isLoading: false, isError: false };
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
