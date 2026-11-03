import { expect, test } from '@playwright/test';

// A signed-out learner can explore the tutor; an account is needed only to send. Public, no accounts.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/promo/status', route => route.fulfill({ json: { active: false, theme: 'default', theme_active: false } }));
});

test('wide guest tutor starts near the top and its only heading is the page h1', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/chat');
  const firstStarter = page.getByRole('group', { name: 'Example prompts' }).getByRole('button').first();
  await expect(firstStarter).toBeVisible();
  const top = await firstStarter.evaluate(el => el.getBoundingClientRect().top);
  expect(top).toBeLessThanOrEqual(180);
  // No welcome heading outranks or competes with the page title.
  const headings = await page.locator('h1:visible, h2:visible, h3:visible').evaluateAll(nodes => nodes.map(node => ({
    tag: node.tagName, text: node.textContent?.trim(), size: Number.parseFloat(getComputedStyle(node).fontSize),
  })));
  expect(headings).toEqual([expect.objectContaining({ tag: 'H1', text: 'Tutor' })]);
  await expect(page.getByRole('heading', { name: 'How can I help?' })).toHaveCount(0);
});

test('a guest switches tasks without a sign-in dialog, and a starter fills the composer', async ({ page }) => {
  await page.goto('/chat');
  const tasks = page.getByRole('group', { name: 'Tutor task' });
  const composer = page.getByLabel('Message input');
  await expect(composer).toHaveAttribute('placeholder', 'Ask about a word, grammar, or Guam…');
  await tasks.getByRole('button', { name: 'Translate', exact: true }).click();
  await expect(page).toHaveURL(/\/chat\?intent=translate$/);
  await expect(tasks.getByRole('button', { name: 'Translate', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(composer).toHaveAttribute('placeholder', 'Paste a phrase, message, or notice…');
  await expect(page.getByText('Paste a phrase or notice, or try a short translation.')).toBeVisible();
  await tasks.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start guided practice' })).toBeVisible();
  await expect(page.locator('.cl-modalContent, [role="dialog"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Practice a short conversation about family.' }).click();
  await expect(composer).toHaveValue('Practice a short conversation about family.');
  await expect(composer).toBeFocused();
  await expect(page.locator('.cl-modalContent, [role="dialog"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Send message/i })).toBeEnabled();
});

test('a typed guest draft is kept for sign-in, including across the reload that ends it', async ({ page }) => {
  await page.goto('/chat?intent=translate');
  const composer = page.getByLabel('Message input');
  await composer.fill('Please translate our school closure notice.');
  // Clerk finishes sign-in with a full page load back to this URL.
  await page.reload();
  await expect(page.getByLabel('Message input')).toHaveValue('Please translate our school closure notice.');
  await expect(page.getByRole('group', { name: 'Tutor task' }).getByRole('button', { name: 'Translate', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
