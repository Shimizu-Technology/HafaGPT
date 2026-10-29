import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';

const stats = {
  total_users: 40, premium_users: 10, free_users: 30, whitelisted_users: 0,
  active_today: 3,
  total_conversations: 120, total_messages: 900, total_quiz_attempts: 50, total_game_plays: 70,
  new_users_this_week: { current: 5, previous: 8, change: -3, change_percent: -37.5 },
  active_users_this_week: { current: 17, previous: 12, change: 5, change_percent: 41.7 },
  messages_this_week: { current: 200, previous: 260, change: -60, change_percent: -23 },
};

vi.mock('../../hooks/useAdminQuery', () => ({
  useAdminStats: () => ({ data: stats, isLoading: false, error: null }),
  useAdminActivity: () => ({ data: { activities: [] } }),
}));

vi.mock('./AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const card = (title: string) => screen.getByText(title, { selector: 'p' }).parentElement as HTMLElement;

describe('AdminDashboard stats', () => {
  it('shows the weekly active count, not the daily one, with its change', () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    const active = card('Active this week');
    expect(within(active).getByText('17')).toBeInTheDocument();
    expect(within(active).queryByText('3')).not.toBeInTheDocument();
    expect(active).toHaveTextContent('+5 vs previous 7 days');
  });

  it('describes sign-ups in words beside the all-time total', () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    const total = card('Total users');
    expect(within(total).getByText('40')).toBeInTheDocument();
    expect(total).toHaveTextContent('5 new this week · 8 the week before');
    expect(total).not.toHaveTextContent('vs previous');
  });

  it('marks decreases in words and sign, not colour alone', () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    expect(card('Messages')).toHaveTextContent('-60 vs previous 7 days');
  });
});
