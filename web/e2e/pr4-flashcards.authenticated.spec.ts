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

test('lost save response retries the same committed deck after a double-click', async ({ page }) => {
  await page.route('**/api/vocabulary/flashcards/pr4-idempotency?*', route => route.fulfill({ json: {
    cards: [{ source_id: 'idempotency-fixture', front: 'Idempotency fixture prompt', back: 'Idempotency fixture meaning' }],
    total: 1, category: { id: 'pr4-idempotency', title: 'Idempotency fixture' },
  } }));
  const requests: { key: string | undefined; body: unknown }[] = [];
  let deckId = '';
  let apiOrigin = '';
  let release = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/flashcards/decks', async route => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();
    apiOrigin = new URL(request.url()).origin;
    requests.push({ key: request.headers()['idempotency-key'], body: request.postDataJSON() });
    if (requests.length === 1) {
      const response = await route.fetch(); // Real API and DB commit before dropping the response.
      expect(response.status()).toBe(200);
      deckId = (await response.json()).deck_id;
      await held;
      return route.abort('failed');
    }
    return route.continue();
  });
  await page.goto('/flashcards/pr4-idempotency?type=custom');
  await page.getByRole('button', { name: 'Save this set', exact: true }).dblclick();
  await expect.poll(() => deckId).not.toBe('');
  expect(requests).toHaveLength(1);
  release();
  await expect(page.getByRole('alert')).toContainText('couldn’t confirm the save');
  await page.getByRole('button', { name: 'Try saving again', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Review saved deck' })).toHaveAttribute('href', `/flashcards/my-deck/${deckId}`);
  expect(requests).toHaveLength(2);
  expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/);
  expect(requests[1]).toEqual(requests[0]);
  const saved = await page.evaluate(async ({ api, id }) => {
    const clerk = (window as unknown as { Clerk: { session: { getToken(): Promise<string> } } }).Clerk;
    const response = await fetch(`${api}/api/flashcards/decks`, { headers: { Authorization: `Bearer ${await clerk.session.getToken()}` } });
    const { decks } = await response.json();
    return decks.filter((deck: { id: string }) => deck.id === id).length;
  }, { api: apiOrigin, id: deckId });
  expect(saved).toBe(1);
});

test('concurrent deck requests reconcile once and reject changed payloads for the same key', async ({ page }) => {
  let apiOrigin = '';
  page.on('request', request => { if (request.url().includes('/api/flashcards/decks?')) apiOrigin = new URL(request.url()).origin; });
  await page.goto('/flashcards/my-decks');
  await expect.poll(() => apiOrigin).not.toBe('');
  const result = await page.evaluate(async api => {
    const clerk = (window as unknown as { Clerk: { user: { id: string }; session: { getToken(): Promise<string> } } }).Clerk;
    const headers = { Authorization: `Bearer ${await clerk.session.getToken()}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() };
    const body = { user_id: clerk.user.id, topic: 'pr4-concurrent', title: 'Concurrent save fixture', card_type: 'custom', cards: [{ front: 'Concurrent prompt', back: 'Concurrent meaning' }] };
    const save = async (payload = body) => {
      const response = await fetch(`${api}/api/flashcards/decks`, { method: 'POST', headers, body: JSON.stringify(payload) });
      return { status: response.status, data: await response.json() };
    };
    const concurrent = await Promise.all([save(), save()]);
    const changed = await save({ ...body, title: 'Different set with a reused key' });
    const response = await fetch(`${api}/api/flashcards/decks/${concurrent[0].data.deck_id}/cards`, { headers });
    const stored = await response.json();
    return { concurrent, changed, stored };
  }, apiOrigin);
  expect(result.concurrent.map(response => response.status)).toEqual([200, 200]);
  expect(result.concurrent[0].data.deck_id).toBe(result.concurrent[1].data.deck_id);
  expect(result.changed.status).toBe(409);
  expect(result.stored.cards).toHaveLength(1);
  expect(result.stored.title).toBe('Concurrent save fixture');
});
