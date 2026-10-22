import { expect, test } from '@playwright/test';

// Public route orientation does not depend on paid services or learner records.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/promo/status', route => route.fulfill({ json: { active: false, theme: 'default', theme_active: false } }));
});

test('system appearance stays live until a visitor makes an explicit choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'Support', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#0f172a');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('meta[name="theme-color"]').last()).toHaveAttribute('content', '#0f172a');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`forward routes reset the real scroller and browser history restores it (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/support');
    const heading = page.getByRole('heading', { name: 'Support', exact: true });
    await expect(heading).toBeVisible();
    const about = page.getByRole('navigation', { name: 'Information' }).getByRole('link', { name: 'About', exact: true });
    await about.scrollIntoViewIfNeeded();
    const supportOffset = await page.locator('#root').evaluate(root => root.scrollTop);
    expect(supportOffset).toBeGreaterThan(100);
    await about.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('heading', { name: 'Our story', exact: true })).toBeFocused();
    await expect.poll(() => page.locator('#root').evaluate(root => root.scrollTop)).toBe(0);
    await page.locator('#root').evaluate(root => { root.scrollTop = 200; });
    await expect.poll(() => page.locator('#root').evaluate(root => root.scrollTop)).toBe(200);
    // Allow the browser scroll event to record this history entry.
    await page.waitForTimeout(100);
    await page.goBack();
    await expect(heading).toBeFocused();
    await expect.poll(() => page.locator('#root').evaluate(root => root.scrollTop)).toBeCloseTo(supportOffset, 0);
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Our story', exact: true })).toBeFocused();
    await expect.poll(() => page.locator('#root').evaluate(root => root.scrollTop)).toBe(200);
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`dictionary typing and category filters preserve phone scroll and focus (${colorScheme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    // Stable read fixtures keep the result height above the saved viewport.
    const words = Array.from({ length: 30 }, (_, i) => ({
      word_id: `fixture-${i}`, chamorro: 'håfa adai', definition: 'hello', part_of_speech: 'phrase', examples: [],
    }));
    await page.route('**/api/vocabulary/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/vocabulary/categories') return route.fulfill({ json: {
        total_words: 360, categories: Array.from({ length: 12 }, (_, i) => ({
          id: i ? `fixture-${i}` : 'greetings', title: 'Greetings', icon: 'G', description: 'Common greetings', word_count: 30,
        })),
      } });
      if (url.pathname === '/api/vocabulary/search') return route.fulfill({ json: { results: words, total: 30, query: url.searchParams.get('q') } });
      if (url.pathname === '/api/vocabulary/categories/greetings') return route.fulfill({ json: {
        category: { id: 'greetings', title: 'Greetings', icon: 'G', description: 'Common greetings' },
        words, total: 30, category_total: 30,
      } });
      return route.fulfill({ status: 404, json: {} });
    });
    for (const surface of [
      { path: '/vocabulary?q=ha', label: 'Search all Chamorro words', offset: 32 },
      { path: '/vocabulary/greetings', label: 'Search in Greetings', offset: 120 },
    ]) {
      await page.goto(surface.path);
      const input = page.getByRole('textbox', { name: surface.label });
      await expect(input).toBeVisible();
      await expect(page.getByRole('link', { name: 'håfa adai', exact: true }).first()).toBeVisible();
      await input.focus();
      await page.locator('#root').evaluate((root, offset) => { root.scrollTop = offset; }, surface.offset);
      await expect.poll(() => page.locator('#root').evaluate(root => root.scrollTop)).toBe(surface.offset);
      // Use actual keyboard events; typing creates same-path REPLACE entries.
      await page.keyboard.type('a');
      await expect(page).toHaveURL(/q=/);
      await expect(input).toBeFocused();
      await expect.poll(() => page.locator('#root').evaluate(root => root.scrollTop)).toBe(surface.offset);
      await page.keyboard.type('d');
      await expect(input).toBeFocused();
      await expect.poll(() => page.locator('#root').evaluate(root => root.scrollTop)).toBe(surface.offset);
      await expect(page.locator('html')).toHaveClass(colorScheme === 'dark' ? /dark/ : /^(?!.*dark)/);
      const back = page.getByRole('link', { name: surface.path.includes('/greetings') ? 'Back to dictionary' : 'Back to Today', exact: true });
      const box = await back.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
  });
}
