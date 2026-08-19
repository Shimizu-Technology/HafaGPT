import { expect, test } from '@playwright/test';

test('authenticated learner can reach learning settings', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/promo/status') {
      await route.fulfill({
        json: {
          active: false,
          end_date: null,
          message: null,
          theme: 'default',
          theme_active: false,
          theme_end_date: null,
        },
      });
      return;
    }
    if (url.pathname === '/api/xp/me') {
      await route.fulfill({
        json: {
          total_xp: 0,
          level: 1,
          xp_to_next_level: 100,
          daily_goal_minutes: 10,
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: 'Not mocked in authenticated browser test' } });
  });

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('Choose how HåfaGPT should support you')).toBeVisible();
  await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
});
