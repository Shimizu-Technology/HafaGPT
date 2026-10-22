import { expect, test } from '@playwright/test';

test('settings draft survives navigation and browser Back until deliberately discarded', async ({ page }) => {
  await page.goto('/settings');
  const choice = page.getByRole('button', { name: /Helping family/ });
  const wasSelected = await choice.getAttribute('aria-pressed') === 'true';
  const target = wasSelected ? /Learning with a child/ : /Helping family/;
  await page.getByRole('button', { name: target }).click();
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: target })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/Unsaved choices stay here/)).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('button', { name: target })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 740 }]) {
test(`existing saved decks expose the full long title at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  const title = 'Family practice for the school week with a very long saved deck title that everyone can read in full';
  await page.route('**/api/flashcards/decks?*', route => route.fulfill({ json: { decks: [{
    id: 'existing-deck', topic: 'test', title, total_cards: 10, cards_reviewed: 3, cards_due: 4,
    card_type: 'custom', created_at: '2026-10-22T00:00:00Z',
  }] } }));
  await page.goto('/flashcards/my-decks');
  const heading = page.getByRole('heading', { level: 3, name: title });
  await expect(heading).toBeVisible();
  const rendered = await heading.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth, whiteSpace: getComputedStyle(element).whiteSpace }));
  expect(rendered.whiteSpace).not.toBe('nowrap');
  expect(rendered.scroll).toBeLessThanOrEqual(rendered.width + 1);
});

}

for (const width of [1440, 390, 360]) {
  test(`Library listening description reflows with enlarged text at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Fixture only this browser's Clerk response; never mutate the shared dev user.
    await page.route('**/v1/client*', async route => {
      const response = await route.fetch();
      const body = await response.json();
      const enableListening = (value: unknown) => {
        if (!value || typeof value !== 'object') return;
        const record = value as Record<string, unknown>;
        if (record.object === 'user') record.unsafe_metadata = { ...(record.unsafe_metadata as object), reading_support: 'audio_pictures' };
        Object.values(record).forEach(enableListening);
      };
      enableListening(body);
      await route.fulfill({ response, json: body });
    });
    await page.goto('/library');
    const description = page.getByRole('region', { name: 'Listen and look first' }).locator('p');
    await expect(description).toBeVisible();
    expect(await description.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    const layout = await description.evaluate(element => ({ font: parseFloat(getComputedStyle(element).fontSize), width: element.clientWidth, scroll: element.scrollWidth }));
    expect(layout.font).toBeGreaterThanOrEqual(32);
    expect(layout.scroll).toBeLessThanOrEqual(layout.width + 1);
    const main = await page.locator('main').evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(main.scroll).toBeLessThanOrEqual(main.width + 1);
  });
}
