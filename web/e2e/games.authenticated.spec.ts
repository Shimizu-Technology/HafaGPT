import { expect, test } from '@playwright/test';

// These journeys use the configured Clerk development account and API.
// Paid generation is deliberately unavailable; reading help is an explicit UI path.
test.beforeEach(async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/api/tts*', route => route.fulfill({ status: 503, json: { detail: 'Test: pronunciation unavailable' } }));
});

test('Sound Match retains a committed result after a lost acknowledgement and retries once', async ({ page }) => {
  const attempts: Record<string, unknown>[] = [];
  let resultId = '';
  await page.route('**/api/games/results', async route => {
    attempts.push(route.request().postDataJSON());
    const response = await route.fetch();
    if (attempts.length === 1) {
      expect(response.status()).toBe(200);
      resultId = (await response.json()).id;
      await route.fulfill({ status: 503, json: { detail: 'Test: acknowledgement lost after commit' } });
    } else await route.fulfill({ response });
  });
  await page.goto('/games/sound-match');
  await page.getByRole('button', { name: 'Start Game', exact: true }).click();
  for (let round = 1; round <= 10; round++) {
    await page.getByRole('button', { name: 'A grown-up read it to me' }).click();
    await page.locator('main button[aria-label]').first().click();
    await page.getByRole('button', { name: round === 10 ? 'See results' : 'Next round', exact: true }).click();
  }
  await expect(page.getByRole('alert')).toContainText('hasn’t saved');
  await expect(page.getByRole('button', { name: 'Play again' })).toBeDisabled();
  await page.getByRole('link', { name: 'More games' }).click();
  await expect(page.getByRole('dialog', { name: 'Keep your result' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep result' }).click();
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByText('Result saved', { exact: true })).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  await page.goto('/games/results/' + resultId);
  await expect(page.getByText(String(attempts[0].score), { exact: true })).toBeVisible();
});

for (const game of ['falling', 'catch']) {
  test(`${game} defaults to stationary Relaxed play and records a completed zero-score round`, async ({ page }) => {
    await page.goto('/games/' + game);
    await expect(page.getByRole('button', { name: 'Relaxed', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Start Game', exact: true }).click();
    const saved = page.waitForResponse(response => response.url().endsWith('/api/games/results') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Finish round' }).click();
    const response = await saved;
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ score: 0, moves: 0 });
    await expect(page.getByText('Result saved', { exact: true })).toBeVisible();
  });
}

test('Wordle submits a truthful zero-star loss with visible and announced letter states', async ({ page }) => {
  await page.goto('/games');
  await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('wordle-')) localStorage.removeItem(key); });
  await page.goto('/games/wordle');
  await page.getByRole('button', { name: 'Start Practice' }).click();
  const input = page.getByRole('textbox', { name: 'Type your guess' });
  await input.fill('ZZZZZ');
  await input.press('Enter');
  await expect(page.getByRole('img', { name: 'Row 1, position 1: Z, not in the word', exact: true })).toBeVisible();
  const saved = page.waitForResponse(response => response.url().endsWith('/api/games/results') && response.request().method() === 'POST');
  for (let row = 1; row < 6; row++) { await input.fill('ZZZZZ'); await input.press('Enter'); }
  expect(await (await saved).json()).toMatchObject({ score: 0, stars: 0 });
  await expect(page.getByText('Result saved', { exact: true })).toBeVisible();
});
