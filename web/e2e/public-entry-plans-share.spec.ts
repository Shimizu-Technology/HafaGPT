import { expect, test, type Page } from '@playwright/test';
const fixture = {
  share_id: 'public-test', title: 'A shared school note', created_at: '2026-10-22T00:00:00Z', view_count: 1,
  messages: [
    { id: 1, role: 'user', content: 'Please help me understand this school note.', sources: [], file_urls: [{ url: '/test-note.svg', filename: 'note.svg', content_type: 'image/svg+xml' }] },
    { id: 2, role: 'assistant', content: 'This is a safe English reading fixture.\n\n- Bring a notebook.\n- Ask the teacher for help.\n\n> Keep this note for tomorrow.\n\nUse `notebook` as a reminder.\n\n| Item | Day |\n| --- | --- |\n| Notebook | Monday |', sources: [], used_rag: false, used_web_search: false },
  ],
};
async function mockApi(page: Page) {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/api/share/')) return route.fulfill({ json: fixture });
    if (path === '/api/promo/status') return route.fulfill({ json: { active: false, theme: 'default', theme_active: false } });
    return route.fulfill({ json: {} });
  });
  await page.route('**/test-note.svg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="1800"><rect width="300" height="1800" fill="white"/><text x="20" y="60">Safe school note fixture</text></svg>' }));
}
test.beforeEach(async ({ page }) => { await mockApi(page); });
for (const theme of ['light', 'dark'] as const) {
  test(`compact plans show actual price, limits, terms and one action each (${theme})`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem('theme', theme), theme);
    await page.goto('/pricing');
    const summary = page.getByRole('region', { name: 'Plans at a glance' });
    await expect(summary).toBeVisible();
    const free = summary.getByRole('article', { name: 'Free' });
    const premium = summary.getByRole('article', { name: 'Premium' });
    for (const text of ['$0', '8 AI chat messages per day', '10 learning games per day', '5 quizzes per day']) await expect(free).toContainText(text);
    for (const text of ['$2.99', '$23.88/year', 'Unlimited']) await expect(premium).toContainText(text);
    await expect(free.getByRole('button')).toHaveCount(1);
    await expect(premium.getByRole('button')).toHaveCount(1);
    await expect(page.getByText(/cancel anytime/i)).toBeVisible();
    await expect(page.getByText(/helps cover AI and hosting costs/i)).toBeVisible();
    await expect(page.locator('main')).toContainText('midnight (Guam time)');
  });
  test(`public body text is readable (${theme})`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem('theme', theme), theme);
    await page.goto('/support');
    await page.locator('summary').filter({ hasText: 'How accurate is the AI tutor?' }).click();
    await expect(page.getByText(/retrieves from governed Chamorro references/)).toHaveCSS('font-size', '16px');
    await page.goto('/share/public-test');
    const messages = page.getByRole('region', { name: 'Conversation messages' });
    await expect(messages.getByText('Please help me understand this school note.')).toHaveCSS('font-size', '16px');
    for (const selector of ['p', 'li', 'code', 'th', 'td']) for (const el of await messages.locator(selector).all()) expect(await el.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  });
}
for (const status of [404, 410, 403]) {
  test(`share ${status} offers fresh-link guidance and safe exit without retry`, async ({ page }) => {
    await page.route('**/api/share/**', (route) => route.fulfill({ status, json: {} }));
    await page.goto('/share/missing');
    await expect(page.getByRole('alert')).toContainText(/ask.*sender.*fresh link/i);
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Go to HåfaGPT', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });
}
for (const failure of ['500', 'offline']) {
  test(`temporary share ${failure} can retry and read the conversation`, async ({ page }) => {
    let requests = 0;
    let recovering = false;
    await page.route('**/api/share/**', (route) => {
      requests += 1;
      if (!recovering) return failure === 'offline' ? route.abort('internetdisconnected') : route.fulfill({ status: 500, json: {} });
      return route.fulfill({ json: fixture });
    });
    await page.goto('/share/temporary');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    recovering = true;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible();
    expect(requests).toBeGreaterThanOrEqual(2);
  });
}
test('Home discloses the account step and links Translate, Support and Plans', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start learning free' })).toHaveAccessibleDescription(/free account needed/i);
  const translate = page.getByRole('link', { name: 'Ask or translate', exact: true });
  await expect(translate).toHaveAccessibleDescription(/free account needed/i);
  await translate.click();
  await expect(page).toHaveURL(/\/chat\?intent=translate$/);
  await expect(page.getByPlaceholder('Sign in to chat...')).toBeVisible();
  await expect(page.getByRole('button', { name: /send message/i })).toBeDisabled();
  for (const name of ['Support', 'Plans']) {
    await page.goto('/');
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
});
test('tall share image keeps Close in landscape bounds and restores keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto('/share/public-test');
  const trigger = page.getByRole('button', { name: 'Open image note.svg' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const close = page.getByRole('button', { name: 'Close image preview' });
  await expect(close).toBeFocused();
  const box = await close.boundingBox();
  expect(box?.y).toBeGreaterThanOrEqual(0);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(360);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('public cards stay still on hover and reduced-motion plan actions stay immediate', async ({ page }) => {
  await page.goto('/');
  const dictionary = page.getByRole('link', { name: /Search the dictionary/ });
  await dictionary.hover();
  await expect(dictionary.locator('svg').last()).toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pricing');
  const duration = await page.getByRole('button', { name: 'Sign Up & Upgrade' }).evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(duration).toBeLessThanOrEqual(0.001);
});
