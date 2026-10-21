import { expect, test } from '@playwright/test';

// Requires an explicitly supplied disposable development admin, never a real account.
test.skip(!process.env.E2E_ADMIN_USER_ID, 'Set E2E_ADMIN_USER_ID to an isolated Clerk development admin');

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 740 }]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`audio fields remain readable at ${viewport.width}px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme });
      const mutations: string[] = [];
      await page.route('**/api/**', async route => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
          mutations.push(route.request().url());
          await route.fulfill({ status: 403, json: { detail: 'View-only admin QA' } });
        } else await route.continue();
      });
      await page.goto('/admin/audio');
      await expect(page.getByRole('heading', { name: 'Pronunciation studio' })).toBeVisible();
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), colorScheme);
      const search = page.getByRole('searchbox', { name: 'Find a word or phrase' });
      await search.fill('qa-no-match-pr7');
      const status = page.getByRole('combobox', { name: /Review status/ });
      await status.selectOption('needs_review');
      // Opening this local form does not submit or generate anything.
      await page.getByRole('button', { name: 'Add a pilot phrase' }).click();
      for (const control of [search, status, page.getByLabel('Chamorro text'), page.getByLabel('English meaning')]) {
        await expect(control).toBeVisible();
        expect(await control.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
      }
      await page.getByRole('button', { name: 'Add a pilot phrase' }).click();
      expect(mutations).toEqual([]);
    });
  }
}

test('detail identity stays inside a phone viewport with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const userId = process.env.E2E_ADMIN_USER_ID!;
  const longName = 'Alexandria'.repeat(12);
  await page.route(`**/api/admin/users/${userId}`, route => route.fulfill({ json: {
    user_id: userId, first_name: longName, last_name: 'Long family name',
    email: null, total_messages: 0, total_games: 0, total_quizzes: 0, total_conversations: 0,
  } }));
  await page.goto(`/admin/users/${userId}`);
  const heading = page.getByRole('heading', { level: 1, name: `${longName} Long family name` });
  await expect(heading).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
    document.documentElement.classList.add('dark');
  });
  const bounds = await heading.evaluate(element => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    viewport: innerWidth,
    textWidth: element.scrollWidth,
    width: element.clientWidth,
  }));
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
  expect(bounds.textWidth).toBeLessThanOrEqual(bounds.width);
});
