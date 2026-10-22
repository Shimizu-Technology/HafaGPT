import { expect, test } from '@playwright/test';

test('dictionary outage keeps the query and retries to genuine results', async ({ page }) => {
  let unavailable = true;
  await page.route('**/api/vocabulary/search?*', route => route.fulfill(unavailable
    ? { status: 503, json: { detail: 'Controlled test outage' } }
    : { json: { query: 'known', total: 1, results: [{ word_id: 'fixture', chamorro: 'Test entry', definition: 'Recovered test definition', part_of_speech: '', examples: [] }] } }));
  await page.goto('/vocabulary?q=known');
  await expect(page.getByRole('alert')).toContainText('Dictionary search is unavailable', { timeout: 20_000 });
  await expect(page.getByRole('textbox', { name: 'Search all Chamorro words' })).toHaveValue('known');
  await expect(page.getByText(/No words found/)).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Recovered test definition')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('category outage preserves the search and has a usable retry', async ({ page }) => {
  let unavailable = true;
  await page.route('**/api/vocabulary/categories/greetings?*', route => route.fulfill(unavailable
    ? { status: 503, json: { detail: 'Controlled test outage' } }
    : { json: { category: { id: 'greetings', title: 'Test category', icon: '', description: '' }, total: 1, category_total: 1, words: [{ word_id: 'fixture', chamorro: 'Test entry', definition: 'Recovered category definition', part_of_speech: '', examples: [] }] } }));
  await page.goto('/vocabulary/greetings?q=known');
  await expect(page.getByRole('alert')).toContainText('Dictionary words are unavailable', { timeout: 20_000 });
  await expect(page.getByRole('textbox')).toHaveValue('known');
  unavailable = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Recovered category definition')).toBeVisible();
});

test('Library descriptions stay readable and reflow with enlarged text', async ({ page }) => {
  await page.goto('/library');
  const descriptions = page.locator('main a span.block + span');
  await expect(descriptions).toHaveCount(6);
  const sizes = await descriptions.evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).fontSize)));
  expect(sizes.every(size => size >= 16)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  const main = await page.locator('main').evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(main.scroll).toBeLessThanOrEqual(main.width + 1);
});
