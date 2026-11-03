import { expect, test, type Page } from '@playwright/test';

// The signed-out Home leads with the Chamorro greeting and one live public word. No accounts.
const WORD = {
  word_id: 'word-1',
  chamorro: 'Nuebi',
  english: 'Nine',
  part_of_speech: '',
  example: null,
  category: 'numbers',
  date: '2026-11-04',
  trust: {
    level: 'source_backed',
    label: 'Source-backed',
    summary: 'This word matches a HåfaGPT canonical entry supported by named references.',
    sources: [{ name: 'revised_and_updated_chamorro_dictionary.json' }],
    independentlyReviewed: false,
  },
};

async function mockPublicApis(page: Page, wordHandler?: Parameters<Page['route']>[1]) {
  await page.route('**/api/promo/status', route => route.fulfill({ json: { active: false, theme: 'default', theme_active: false } }));
  await page.route('**/api/audio/manifest', route => route.fulfill({ json: { words: {} } }));
  await page.route('**/api/vocabulary/word-of-the-day', wordHandler ?? (route => route.fulfill({ json: WORD })));
}

test('Home greets in Chamorro, keeps its one h1, and shows today\'s word with its source label', async ({ page }) => {
  await mockPublicApis(page);
  await page.goto('/');

  const greeting = page.getByText('Håfa Adai', { exact: true }).first();
  await expect(greeting).toBeVisible();
  await expect(greeting).toHaveClass(/font-chamorro/);
  await expect(greeting).toHaveAttribute('lang', 'ch');
  await expect(page.locator('h1:visible')).toHaveText('Learn a little Chamorro every day.');

  const card = page.getByRole('region', { name: "Today's word" });
  await expect(card.getByText('Nuebi')).toHaveClass(/font-chamorro/);
  await expect(card.getByText('Nuebi')).toHaveAttribute('lang', 'ch');
  await expect(card.getByText('Nine')).not.toHaveAttribute('lang', 'ch');
  await expect(card.getByText('Nine')).toBeVisible();
  await expect(card.getByRole('button', { name: /source-backed/i })).toBeVisible();
  await expect(card.getByRole('link', { name: /see the full entry/i })).toHaveAttribute('href', '/words/word-1');

  // The existing actions stay.
  await expect(page.getByRole('button', { name: 'Start learning free' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ask or translate', exact: true })).toBeVisible();
});

test('audio starts only when Hear it is tapped, and no account dialog opens', async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on('request', request => {
    if (/\.mp3(\?|$)|\/api\/tts/.test(request.url())) mediaRequests.push(request.url());
  });
  await mockPublicApis(page);
  await page.goto('/');
  const card = page.getByRole('region', { name: "Today's word" });
  await expect(card.getByText('Nuebi')).toBeVisible();
  await page.waitForTimeout(500);
  expect(mediaRequests).toEqual([]);

  await card.getByRole('button', { name: 'Hear it: Nuebi' }).click();
  await expect(card.getByRole('button', { name: /Nuebi/ }).first()).toBeVisible();
  await expect(page.locator('.cl-modalContent, [role="dialog"]')).toHaveCount(0);
});

test('the word card holds its height while the word loads', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await mockPublicApis(page, async route => {
    await held;
    await route.fulfill({ json: WORD });
  });
  await page.goto('/');
  const card = page.getByRole('region', { name: "Today's word" });
  await expect(card).toHaveAttribute('aria-busy', 'true');
  const below = page.getByRole('heading', { name: 'Public learning tools' });
  const measure = async () => ({
    card: (await card.boundingBox())!.height,
    below: (await below.boundingBox())!.y,
  });
  const loading = await measure();
  release();
  await expect(card.getByText('Nuebi')).toBeVisible();
  await expect(card).toHaveAttribute('aria-busy', 'false');
  expect(await measure()).toEqual(loading);
});

test('an unavailable word leaves a retry and the dictionary instead of a blank card', async ({ page }) => {
  await mockPublicApis(page, route => route.fulfill({ status: 500, body: 'unavailable' }));
  await page.goto('/');
  const card = page.getByRole('region', { name: "Today's word" });
  await expect(card.getByText("Today's word is not loading right now.")).toBeVisible();
  await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(card.getByRole('link', { name: /open the dictionary/i })).toHaveAttribute('href', '/vocabulary');
});

test('the Home hero does not scroll sideways on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await mockPublicApis(page, route => route.fulfill({ json: { ...WORD, chamorro: "Na'fåna i addeng-mu!", english: 'Show your foot!' } }));
  await page.goto('/');
  await expect(page.getByText("Na'fåna i addeng-mu!")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
