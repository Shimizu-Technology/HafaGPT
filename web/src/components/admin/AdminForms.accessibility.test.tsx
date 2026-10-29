import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsers } from './AdminUsers';
import { AdminUserDetail } from './AdminUserDetail';
import { AdminSettings } from './AdminSettings';

const mocks = vi.hoisted(() => ({ user: {
  user_id: 'user/fixture', first_name: null as string | null, last_name: null as string | null,
  email: 'fixture@example.com' as string | null,
}, settings: { settings: { promo_enabled: { value: 'true' }, promo_title: { value: 'Test banner' }, promo_end_date: { value: '2099-12-31' } } }, mutate: vi.fn() }));
vi.mock('../../hooks/useAdminQuery', () => ({
  useAdminUsers: () => ({ data: { users: [mocks.user], total: 21, total_pages: 2 }, isLoading: false }),
  useAdminUser: () => ({ data: mocks.user, isLoading: false }),
  useUpdateUser: () => ({ mutateAsync: mocks.mutate }),
  useResetOnboarding: () => ({ mutateAsync: mocks.mutate }),
  useUpdateUserPreferences: () => ({ mutateAsync: mocks.mutate }),
  useAdminSettings: () => ({ data: mocks.settings, isLoading: false }),
  useUpdateAdminSettings: () => ({ mutateAsync: mocks.mutate }),
}));
vi.mock('./AdminLayout', () => ({ AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
function mount(view: React.ReactNode) {
  return render(<MemoryRouter initialEntries={['/admin/users?search=fixture&page=2#users']}>{view}</MemoryRouter>);
}
beforeEach(() => {
  Object.assign(mocks.user, { first_name: null, last_name: null, email: 'fixture@example.com' });
  mocks.mutate.mockReset();
});
describe('admin form accessibility', () => {
  it('names both responsive action disclosures and exposes keyboard state without changing a user', async () => {
    const user = userEvent.setup();
    mount(<AdminUsers />);
    const toggles = screen.getAllByRole('button', { name: 'Actions for fixture@example.com' });
    expect(toggles).toHaveLength(2);
    for (const toggle of toggles) expect(toggle).toHaveAttribute('aria-expanded', 'false');
    toggles[0].focus();
    await user.keyboard('{Enter}');
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('link', { name: 'View Details' })[0]).toHaveAttribute('href',
      '/admin/users/user%2Ffixture?return_to=%2Fadmin%2Fusers%3Fsearch%3Dfixture%26page%3D2%23users');
    await user.click(screen.getAllByRole('button', { name: 'Cancel' })[0]);
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'false');
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it('offers real named record links in the table and phone card', () => {
    mount(<AdminUsers />);
    const links = screen.getAllByRole('link', { name: 'fixture@example.com' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href',
      '/admin/users/user%2Ffixture?return_to=%2Fadmin%2Fusers%3Fsearch%3Dfixture%26page%3D2%23users');
  });
  it.each([
    ['Ada', 'Lovelace', 'fixture@example.com', 'Ada Lovelace'],
    [null, null, 'fixture@example.com', 'fixture@example.com'],
    [' ', ' ', null, 'User details'],
    ['Alexandria'.repeat(12), 'Long family name', null, `${'Alexandria'.repeat(12)} Long family name`],
  ])('renders a meaningful detail heading for %s / %s', (first, last, email, heading) => {
    Object.assign(mocks.user, { first_name: first, last_name: last, email });
    mount(<AdminUserDetail />);
    expect(screen.getByRole('heading', { level: 1, name: heading! })).toBeInTheDocument();
  });
  it('associates preference labels with selects and cancels without saving', async () => {
    const user = userEvent.setup();
    mount(<AdminUserDetail />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Skill Level')).toHaveRole('combobox');
    expect(screen.getByLabelText('Learning Goal')).toHaveRole('combobox');
    await user.click(screen.getByText('Skill Level', { selector: 'label' }));
    expect(screen.getByLabelText('Skill Level')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it('associates promotional labels and preserves switch state without saving', async () => {
    const user = userEvent.setup();
    mount(<AdminSettings />);
    const toggle = screen.getByRole('switch', { name: 'Enable Promotional Period' });
    expect(screen.getByLabelText('Enable Promotional Period')).toBe(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByText('Enable Promotional Period', { selector: 'label' }));
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    for (const label of ['Promo End Date', 'Banner Title']) {
      const field = screen.getByLabelText(label);
      await user.click(screen.getByText(label, { selector: label === 'Promo End Date' ? 'span' : 'label' }));
      expect(field).toHaveFocus();
    }
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it('uses a section heading for banner preview and associates every field label', () => {
    const { container } = mount(<AdminSettings />);
    expect(screen.getByRole('heading', { level: 3, name: /Banner content preview/i })).toBeInTheDocument();
    for (const label of container.querySelectorAll('label')) expect(label.control).toBeTruthy();
  });
});
