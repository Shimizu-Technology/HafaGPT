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

test('existing saved decks expose the full long title on phones and desktop', async ({ page }) => {
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
