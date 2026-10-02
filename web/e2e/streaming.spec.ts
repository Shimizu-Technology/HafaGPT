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
  await expect(page.getByRole('status')).toHaveText(/Ready/);
  expect(await scroller.evaluate(element => element.scrollTop)).toBe(100);
  expect(await firstTable!.evaluate(element => element.isConnected)).toBe(true);
  expect(await firstParagraph!.evaluate(element => element.isConnected)).toBe(true);
  await expect(page.getByRole('table')).toHaveCount(3);
  await expect(page.getByRole('cell', { name: 'Complete translation for item 24', exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: 'Scroll to bottom' }).click();
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
  // A second exchange follows normally after explicit resume.
  await page.getByRole('button', { name: 'Send worksheet' }).click();
  await expect(page.getByRole('status')).toHaveText(/Streaming/);
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Cancel response' }).click();
  await expect(page.getByText('Message cancelled')).toBeVisible();
});
