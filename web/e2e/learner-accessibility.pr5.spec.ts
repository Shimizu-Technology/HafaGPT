import { expect, test } from '@playwright/test';

// Read-only public flows use stable manifests and no generated speech.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/promo/status', route => route.fulfill({ json: { active: false, theme: 'default', theme_active: false } }));
  await page.route('**/api/audio/manifest', route => route.fulfill({ json: { words: {} } }));
});
for (const scheme of ['light', 'dark'] as const) {
  test(`200% text retains the full title and all primary destinations (${scheme})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/stories');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    const title = await heading.evaluate(el => ({ width: el.getBoundingClientRect().width, scroll: el.scrollWidth, client: el.clientWidth }));
    expect(title.width).toBeGreaterThan(200);
    expect(title.scroll).toBeLessThanOrEqual(title.client + 1);
    for (const name of ['Today', 'Tutor', 'Learn', 'Library']) {
      const destination = page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name, exact: true });
      const box = await destination.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(360);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await destination.focus(); await expect(destination).toBeFocused();
    }
  });
}

test('story quiz exposes selected answers and deliberate listening without autoplay', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  let speechRequests = 0;
  await page.route('**/api/tts', route => { speechRequests += 1; return route.fulfill({ status: 503, json: {} }); });
  await page.goto('/stories/hafa-adai-maria');
  await expect(page.getByRole('heading', { name: 'Read story', exact: true })).toBeVisible();
  expect(speechRequests).toBe(0);
  while (await page.getByRole('button', { name: 'Continue', exact: true }).count()) {
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  const takeQuiz = page.getByRole('button', { name: 'Take Quiz', exact: true });
  // Check emitted CSS, not only class strings: dynamic variant names can be purged.
  // Continue and Take Quiz share a position; clear the previous pointer hover.
  await page.mouse.move(0, 0);
  await expect.poll(() => takeQuiz.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(184, 55, 48)');
  await takeQuiz.click();
  const question = page.locator('#story-question');
  const group = page.getByRole('group', { name: await question.innerText(), exact: true });
  const answer = group.getByRole('button', { pressed: false }).first();
  await answer.focus(); await page.keyboard.press('Enter');
  await expect(group.getByRole('button', { pressed: true })).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: /Correct\.|Incorrect\./ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Hear it:/ }).first()).toBeVisible();
  expect(speechRequests).toBe(0);
});
