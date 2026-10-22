import { expect, test } from '@playwright/test';

test('Saved decks is readable on phones and practice keeps its source on return', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/flashcards');
  const saved = page.getByRole('link', { name: 'Saved decks', exact: true });
  await expect(saved).toBeVisible();
  expect((await saved.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
  await expect(page).toHaveURL(/source=dictionary/);
  await page.getByRole('link', { name: /Greetings/ }).click();
  await expect(page).toHaveURL(/type=dictionary/);
  await expect(page.getByRole('button', { name: /Save this (set|deck)/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to flashcard decks', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dictionary', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Saved decks', exact: true }).click();
  await expect(page).toHaveURL(/\/flashcards\/my-decks$/);
});

test('legacy save failure retains exact cards, retries and opens the actual saved deck', async ({ page }) => {
  const title = 'Family practice with a very long deck title that everyone can read in full on a phone';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/vocabulary/flashcards/pr4-legacy?*', route => route.fulfill({ json: {
    cards: [{ source_id: 'pr4-test', front: 'PR4 fixture prompt', back: 'PR4 fixture meaning', example: null }],
    total: 1, category: { id: 'pr4-legacy', title, icon: '', description: '' },
  } }));
  const payloads: unknown[] = [];
  await page.route('**/api/flashcards/decks', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    payloads.push(route.request().postDataJSON());
    if (payloads.length === 1) return route.fulfill({ status: 503, json: { detail: 'Controlled save failure' } });
    return route.continue();
  });
  await page.goto('/flashcards/pr4-legacy?type=custom');
  await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Save this set', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your cards are still here');
  await page.getByRole('button', { name: 'Try saving again', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Deck saved.');
  expect(payloads).toHaveLength(2);
  expect(payloads[1]).toEqual(payloads[0]);
  await page.getByRole('link', { name: 'Review saved deck', exact: true }).click();
  await expect(page.getByText('PR4 fixture prompt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show the meaning of PR4 fixture prompt', exact: true }).click();
  await page.getByRole('button', { name: 'Good I remembered', exact: true }).click();
  await expect(page.getByText('Review saved. You finished this deck.')).toBeVisible();
});
