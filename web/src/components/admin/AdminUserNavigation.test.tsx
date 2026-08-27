import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUserDetail } from './AdminUserDetail';
import { AdminUsers } from './AdminUsers';

const adminUser = {
  user_id: 'user/ada',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  image_url: null,
  is_premium: true,
  is_whitelisted: false,
  is_banned: false,
  role: null,
  plan_name: 'premium',
  subscription_status: 'active',
  created_at: '2026-08-01T00:00:00Z',
  last_sign_in: '2026-08-20T00:00:00Z',
  last_activity: '2026-08-21T00:00:00Z',
  total_conversations: 3,
  total_messages: 12,
  total_quizzes: 4,
  total_games: 5,
  today_chat: 0,
  today_games: 0,
  today_quizzes: 0,
  skill_level: 'beginner',
  learning_goal: 'all',
  onboarding_completed: true,
};

const mocks = vi.hoisted(() => ({
  useAdminUsers: vi.fn(),
  useAdminUser: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock('../../hooks/useAdminQuery', () => ({
  useAdminUsers: (...args: unknown[]) => mocks.useAdminUsers(...args),
  useAdminUser: (...args: unknown[]) => mocks.useAdminUser(...args),
  useUpdateUser: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
  useResetOnboarding: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
  useUpdateUserPreferences: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

vi.mock('./AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe('restorable admin user navigation', () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset();
    mocks.useAdminUsers.mockReturnValue({
      data: { users: [adminUser], total: 21, page: 2, per_page: 20, total_pages: 2 },
      isLoading: false,
      error: null,
    });
    mocks.useAdminUser.mockReturnValue({ data: adminUser, isLoading: false, error: null });
  });

  it('restores search and page state and carries the exact list context into detail', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users?page=2&search=ada']}>
        <AdminUsers />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(mocks.useAdminUsers).toHaveBeenCalledWith(2, 20, 'ada');
    expect(screen.getByRole('textbox', { name: 'Search users' })).toHaveValue('ada');
    fireEvent.click(screen.getAllByText('Ada Lovelace')[0]);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/admin/users/user%2Fada?return_to=%2Fadmin%2Fusers%3Fpage%3D2%26search%3Dada',
    );
  });

  it('writes a debounced search to the URL and resets pagination', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users?page=2']}>
        <AdminUsers />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Search users' }), {
      target: { value: 'ada' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/users?search=ada');
    });
    expect(mocks.useAdminUsers).toHaveBeenLastCalledWith(1, 20, 'ada');
  });

  it('repairs an out-of-range user-list page using the last known page', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users?page=99&search=ada']}>
        <AdminUsers />
      </MemoryRouter>,
    );

    expect(mocks.useAdminUsers).toHaveBeenCalledWith(99, 20, 'ada');
    expect(mocks.useAdminUsers).toHaveBeenLastCalledWith(2, 20, 'ada');
  });

  it('returns from detail to the validated list context', () => {
    render(
      <MemoryRouter initialEntries={[
        '/admin/users/user%2Fada?return_to=%2Fadmin%2Fusers%3Fpage%3D2%26search%3Dada',
      ]}>
        <Routes>
          <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
          <Route path="/admin/users" element={<p>Restored user list</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to Users' }));
    expect(screen.getByText('Restored user list')).toBeInTheDocument();
  });

  it('rejects an external detail return target', () => {
    render(
      <MemoryRouter initialEntries={[
        '/admin/users/user%2Fada?return_to=https%3A%2F%2Fevil.example',
      ]}>
        <Routes>
          <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
          <Route path="/admin/users" element={<p>Safe user list</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to Users' }));
    expect(screen.getByText('Safe user list')).toBeInTheDocument();
  });

  it('preserves the validated list return when a user detail is unavailable', () => {
    mocks.useAdminUser.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('offline'),
    });

    render(
      <MemoryRouter initialEntries={[
        '/admin/users/user%2Fada?return_to=%2Fadmin%2Fusers%3Fpage%3D2%26search%3Dada',
      ]}>
        <Routes>
          <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
          <Route path="/admin/users" element={<p>Restored after detail error</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '← Back to Users' }));
    expect(screen.getByText('Restored after detail error')).toBeInTheDocument();
  });
});
