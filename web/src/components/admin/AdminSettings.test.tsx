import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSettings } from './AdminSettings';

const adminSettingsMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  data: {
    settings: {
      promo_enabled: { value: 'true' },
      promo_end_date: { value: '2026-12-31' },
      promo_title: { value: 'Unlimited learning' },
      theme: { value: 'christmas' },
      theme_enabled: { value: 'false' },
      theme_end_date: { value: '2026-01-06' },
    },
  },
}));

vi.mock('../../hooks/useAdminQuery', () => ({
  useAdminSettings: () => ({
    data: adminSettingsMocks.data,
    isLoading: false,
    error: null,
  }),
  useUpdateAdminSettings: () => ({
    mutateAsync: adminSettingsMocks.mutateAsync,
    isPending: false,
  }),
}));

vi.mock('./AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AdminSettings seasonal theme controls', () => {
  beforeEach(() => {
    adminSettingsMocks.mutateAsync.mockReset();
    adminSettingsMocks.mutateAsync.mockResolvedValue({ success: true });
  });

  it('saves seasonal visuals independently from promotional access', async () => {
    const user = userEvent.setup();
    render(<AdminSettings />);

    const seasonalToggle = screen.getByRole('switch', { name: 'Enable seasonal effects' });
    expect(seasonalToggle).toHaveAttribute('aria-checked', 'false');

    await user.click(seasonalToggle);
    await user.clear(screen.getByLabelText('Seasonal Theme End Date'));
    expect(screen.getByRole('alert')).toHaveTextContent(/choose an end date/i);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();

    await user.type(screen.getByLabelText('Seasonal Theme End Date'), '2099-01-06');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(adminSettingsMocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promo_enabled: 'true',
          theme: 'christmas',
          theme_enabled: 'true',
          theme_end_date: '2099-01-06',
        }),
      );
    });
  });
});
