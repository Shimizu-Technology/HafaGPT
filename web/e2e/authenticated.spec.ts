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

test('authenticated learner can choose a focused practice activity', async ({ page }) => {
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
    if (url.pathname === '/api/vocabulary/categories') {
      await route.fulfill({
        json: {
          total_words: 10_350,
          categories: [{
            id: 'greetings',
            title: 'Greetings & Basics',
            icon: 'G',
            description: 'Essential greetings',
            word_count: 106,
          }],
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: 'Not mocked in authenticated browser test' } });
  });

  await page.goto('/flashcards');
  await expect(page.getByRole('heading', { name: 'Flashcards' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guided decks' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Dictionary' }).click();
  await expect(page.getByText('Random practice from 10,350 dictionary words.')).toBeVisible();

  await page.goto('/quiz');
  await expect(page.getByRole('heading', { name: 'Quizzes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Beginner' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Advanced' }).click();
  await expect(page.getByRole('heading', { name: 'Choose advanced quizzes' })).toBeVisible();

  await page.goto('/practice');
  await expect(page.getByRole('heading', { name: 'Conversation practice' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Meeting Someone New/ })).toBeVisible();
  await expect.poll(async () => page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
});
