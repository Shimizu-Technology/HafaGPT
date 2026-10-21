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
