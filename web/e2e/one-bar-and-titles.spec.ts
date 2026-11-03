import { expect, test } from '@playwright/test';

// One primary bar on wide screens, and one real h1 per route. Public, no accounts.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/promo/status', route => route.fulfill({ json: { active: false, theme: 'default', theme_active: false } }));
  await page.route('**/api/audio/manifest', route => route.fulfill({ json: { words: {} } }));
});

const publicRoutes: Array<[string, string]> = [
  ['/', 'Learn a little Chamorro every day.'],
  ['/library', 'Library'],
  ['/pricing', 'Unlock Unlimited Learning'],
  ['/about', 'Why I built HåfaGPT'],
  ['/support', 'How can we help?'],
  ['/privacy', 'Privacy policy'],
  ['/chat', 'Tutor'],
  ['/no-such-page', "We couldn't find that page."],
];

for (const [route, title] of publicRoutes) {
  test(`${route} has one visible h1 and it is the page title`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    const headings = page.locator('h1:visible');
    await expect(headings).toHaveCount(1);
    await expect(headings).toHaveText(title);
  });
}

test('wide Home has one bar: theme and sign in live in the app bar, not a second row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const bar = page.locator('[data-app-bar]');
  await expect(bar.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle theme' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Sign In', exact: true }).filter({ visible: true })).toHaveCount(1);
  const top = await page.getByRole('heading', { level: 1 }).evaluate(el => el.getBoundingClientRect().top);
  expect(top).toBeLessThan(180);
});

test('the app bar does not shift while the account control loads in', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Hold the lazy account chunk so the bar can be measured before and after it arrives.
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/AuthButton-*.js', async route => {
    await held;
    await route.continue();
  });
  await page.goto('/');
  const bar = page.locator('[data-app-bar]');
  const measure = () => bar.evaluate(el => {
    const box = (node: Element | null) => {
      const r = node?.getBoundingClientRect();
      return r ? [r.x, r.y, r.width, r.height].map(Math.round) : null;
    };
    return {
      links: [...el.querySelectorAll('nav[aria-label="Primary"] a')].map(box),
      theme: box(el.querySelector('button[aria-label="Toggle theme"]')),
      settingsSlot: box(el.querySelector('[data-slot="settings"]')),
      accountSlot: box(el.querySelector('[data-slot="account"]')),
    };
  });
  await expect(bar.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Sign In', exact: true })).toHaveCount(0);
  const loading = await measure();
  release();
  await expect(bar.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  expect(await measure()).toEqual(loading);
  const sign = await bar.getByRole('button', { name: 'Sign In', exact: true }).boundingBox();
  const slot = loading.accountSlot!;
  expect(sign!.x).toBeGreaterThanOrEqual(slot[0]);
  expect(sign!.x + sign!.width).toBeLessThanOrEqual(slot[0] + slot[2] + 1);
});

// Covers the chrome only (app bar plus one contextual row) and control reachability.
// Starter position and the tutor heading hierarchy belong to PR C (WelcomeMessage).
test('wide tutor chrome is the app bar plus one contextual row, with every control reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/chat');
  await expect(page.getByText('Learn Chamorro for Free!')).toHaveCount(0);
  const header = page.getByTestId('chat-header');
  await expect(header).toBeVisible();
  const bottom = await header.evaluate(el => el.getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(140);
  const tasks = page.getByRole('group', { name: 'Tutor task' });
  const taskBox = await tasks.boundingBox();
  const headerBox = await header.boundingBox();
  expect(taskBox!.y).toBeGreaterThanOrEqual(headerBox!.y);
  expect(taskBox!.y + taskBox!.height).toBeLessThanOrEqual(headerBox!.y + headerBox!.height);
  await expect(page.getByText(/Free account needed to send/)).toBeVisible();
  for (const control of [
    page.locator('[data-app-bar]').getByRole('button', { name: 'Toggle theme' }),
    page.locator('[data-app-bar]').getByRole('button', { name: 'Sign In', exact: true }),
    page.getByRole('button', { name: 'Tutor options' }),
  ]) {
    await control.focus();
    await expect(control).toBeFocused();
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('phone keeps its own top header and bottom tabs, with no wide-screen duplicates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Toggle theme' }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Sign In', exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link')).toHaveCount(4);
  await page.goto('/chat');
  await expect(page.getByText('Learn Chamorro for Free!')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign In', exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Tutor task' })).toBeVisible();
});

test('the word label on a dictionary entry is not a second title', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/api/vocabulary/words/**', route => route.fulfill({ json: {
    word_id: 'w1', chamorro: 'håfa adai', definition: 'hello', part_of_speech: 'phrase', examples: [],
  } }));
  await page.goto('/words/w1');
  const headings = page.getByRole('heading', { level: 1 });
  await expect(headings).toHaveCount(1);
  await expect(headings).toHaveText('håfa adai');
  await expect(page.getByRole('heading', { name: 'håfa adai' })).toHaveCount(1);
});
