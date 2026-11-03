import { expect, test } from '@playwright/test';

test('streaming preserves reading position and Markdown nodes, then resumes following', async ({ page }) => {
  await page.goto('/e2e/streaming-fixture/');
  await page.getByLabel('Chunk delay').fill('70');
  await page.getByRole('button', { name: 'Send worksheet' }).click();
  const scroller = page.getByTestId('chat-messages');
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(500);
  const firstTable = await page.getByRole('table').first().elementHandle();
  const firstParagraph = await page.getByText('Read this page while the remaining answer arrives.').first().elementHandle();
  // Browser input creates a real touch target/identifier and exercises passive
  // listeners in desktop Chromium as well as the emulated phone viewport.
  const touchSession = await page.context().newCDPSession(page);
  const bounds = await scroller.boundingBox();
  if (!bounds) throw new Error('Missing scroll viewport');
  await touchSession.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + 100, id: 1 }],
  });
  await scroller.evaluate(element => { element.scrollTop = 100; });
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(100);
  // Wait for content to grow while the finger is down, then while reading history.
  const originalHeight = await scroller.evaluate(element => element.scrollHeight);
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight)).toBeGreaterThan(originalHeight + 100);
  expect(await scroller.evaluate(element => element.scrollTop)).toBe(100);
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touchSession.detach();
  await expect(page.getByTestId('fixture-status')).toHaveText(/Ready/);
  expect(await scroller.evaluate(element => element.scrollTop)).toBe(100);
  expect(await firstTable!.evaluate(element => element.isConnected)).toBe(true);
  expect(await firstParagraph!.evaluate(element => element.isConnected)).toBe(true);
  await expect(page.getByRole('table')).toHaveCount(3);
  await expect(page.getByRole('cell', { name: 'Complete translation for item 24', exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: 'Scroll to bottom' }).click();
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
  // A second exchange follows normally after explicit resume.
  await page.getByRole('button', { name: 'Send worksheet' }).click();
  await expect(page.getByTestId('fixture-status')).toHaveText(/Streaming/);
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Cancel response' }).click();
  await expect(page.getByText('Message cancelled')).toBeVisible();
});

test('answers read as a wide column with a readable evidence line and a calm wait state', async ({ page }) => {
  await page.goto('/e2e/streaming-fixture/answers.html');
  const evidence = page.getByRole('button', { name: /^From the dictionary: Revised Chamorro dictionary and Chamoru\.info dictionary$/ });
  await expect(evidence).toBeVisible();
  expect(Number.parseFloat(await evidence.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
  const none = page.getByRole('note', { name: 'Answer evidence: No dictionary reference for this answer' });
  expect(Number.parseFloat(await none.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
  await expect(none.locator('.lucide-sparkles')).toHaveCount(0);
  // Repeated passages of one book are listed once.
  await page.getByRole('button', { name: 'From references: Chamorro Grammar by Sandra Chung' }).click();
  await expect(page.getByText('Chamorro Grammar by Sandra Chung', { exact: true })).toHaveCount(1);
  const body = page.getByText(/^When you write a reply for a school notice/);
  expect(Number.parseFloat(await body.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  // The reading column is capped near 68 characters, not a 75% bubble.
  const width = await body.evaluate(el => el.getBoundingClientRect().width);
  const viewport = page.viewportSize()!.width;
  if (viewport >= 1024) expect(width).toBeGreaterThan(600);
  expect(width).toBeLessThanOrEqual(68 * 16);
  // Waiting: a steady status and opacity-only dots, never bounce.
  const status = page.getByRole('status');
  await expect(status).toHaveText('Checking the dictionary…');
  expect(await status.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  const animations = await page.locator('.thinking-dot').evaluateAll(dots => dots.map(dot => getComputedStyle(dot).animationName));
  expect(animations).toEqual(['thinking-dot', 'thinking-dot', 'thinking-dot']);
  expect(await page.content()).not.toMatch(/bounce/);
});

test('reduced motion keeps the waiting dots still and fully visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/e2e/streaming-fixture/answers.html');
  await page.waitForTimeout(100);
  const opacities = await page.locator('.thinking-dot').evaluateAll(dots => dots.map(dot => getComputedStyle(dot).opacity));
  expect(opacities).toEqual(['1', '1', '1']);
});
