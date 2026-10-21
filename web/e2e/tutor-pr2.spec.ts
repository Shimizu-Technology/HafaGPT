import { test, expect } from '@playwright/test';
import { clerk, clerkSetup } from '@clerk/testing/playwright';

// Opt-in real local API + dedicated database; never run against production.
test.skip(!process.env.PR2_QA, 'Requires dedicated PR2 local API and Clerk development fixture');
test.describe.configure({ mode: 'serial' });
const api = 'http://127.0.0.1:8731';
const output = process.env.PR2_OUTPUT || 'test-results';
test.beforeAll(async () => { await clerkSetup(); });
for (const width of [1440, 390, 360]) for (const theme of ['light', 'dark']) test.describe(`${width} ${theme}`, () => {
  test.use({ viewport: { width, height: width === 1440 ? 900 : width === 390 ? 844 : 740 }, isMobile: width !== 1440, hasTouch: width !== 1440 });
  test(`Tutor recovery and navigation ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90000);
    page.on('pageerror', error => console.log('PAGE_ERROR', error.message));
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 390 ? 844 : 740 });
    await page.emulateMedia({ colorScheme: theme as 'light' | 'dark', reducedMotion: 'reduce' });
    await page.goto('/chat');
    await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
    await page.evaluate(async () => {
      await (window as unknown as { Clerk: { user: { update: (data: unknown) => Promise<void> } } }).Clerk.user.update({ unsafeMetadata: { onboarding_completed: true } });
    });
    await page.reload();
    await page.evaluate(t => { localStorage.setItem('theme', t); document.documentElement.classList.toggle('dark', t === 'dark'); }, theme);
    if (await page.getByRole('button', { name: 'New chat', exact: true }).isVisible()) await page.getByRole('button', { name: 'New chat', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('Please explain this school note.');
    await page.getByRole('link', { name: 'Library', exact: true }).click();
    await page.getByRole('link', { name: 'Tutor', exact: true }).click();
    await expect(input).toHaveValue('Please explain this school note.');
    await page.screenshot({ path: `${output}/draft-${width}-${theme}.png` });
    // Actual API reservation; prevent only stream delivery before registration.
    let logicalId = '';
    page.on('request', request => {
      if (request.url().includes('/api/usage/increment/chat?')) logicalId = new URL(request.url()).searchParams.get('logical_send_id') || '';
    });
    await page.route('**/api/chat/stream', route => route.abort('failed'));
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Send again', exact: true })).toBeVisible({ timeout: 30000 });
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue('Please explain this school note.');
    await page.screenshot({ path: `${output}/recovered-${width}-${theme}.png` });
    const token = await page.evaluate(async () => (window as unknown as { Clerk: { session: { getToken: () => Promise<string> } } }).Clerk.session.getToken());
    const headers = { Authorization: `Bearer ${token}` };
    const status = await page.request.post(`${api}/api/chat/reconcile/${logicalId}`, { headers });
    expect((await status.json()).status).toBe('retryable');
    const usageBefore = await (await page.request.get(`${api}/api/usage/today`, { headers })).json();
    await page.unroute('**/api/chat/stream');
    await page.getByRole('button', { name: 'Send again', exact: true }).click();
    await expect(page.getByText('Synthetic saved reply for the school note.', { exact: false }).first()).toBeVisible();
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue('');
    const usageAfter = await (await page.request.get(`${api}/api/usage/today`, { headers })).json();
    expect(usageAfter.chat_count).toBe(usageBefore.chat_count + 1);
    const finalStatus = await page.request.post(`${api}/api/chat/reconcile/${logicalId}`, { headers });
    expect((await finalStatus.json()).status).toBe('complete');
    await page.getByRole('button', { name: /Sources \(/ }).last().click();
    await expect(page.getByText('Reviewed vocabulary', { exact: false })).toBeVisible();
    await expect(page.getByText('Sources from Guam and the Northern Mariana Islands', { exact: false })).toBeVisible();
    await page.keyboard.press('Tab');
    await page.screenshot({ path: `${output}/saved-${width}-${theme}.png` });
    // A full reload loads exactly one persisted exchange and no sensitive draft.
    await page.reload();
    await expect(page.getByText('Synthetic saved reply for the school note.', { exact: false })).toHaveCount(1);
    await expect(input).toHaveValue('');
    await input.fill('Private note to clear at sign out');
    await page.getByRole('link', { name: 'Library', exact: true }).click();
    await clerk.signOut({ page });
    await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
    await page.getByRole('link', { name: 'Tutor', exact: true }).click();
    await expect(input).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

for (const kind of ['newer typing', 'background completion']) test(`Tutor preserves ${kind} across send navigation`, async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/chat');
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
  const input = page.getByRole('textbox', { name: 'Message input' });
  await expect(input).toBeVisible();
  if (await page.getByRole('button', { name: 'New chat', exact: true }).isVisible()) await page.getByRole('button', { name: 'New chat', exact: true }).click();
  let deliver!: () => void;
  let ready!: () => void;
  const serverSaved = new Promise<void>(resolve => { ready = resolve; });
  const gate = new Promise<void>(resolve => { deliver = resolve; });
  await page.route('**/api/chat/stream', async route => {
    const response = await route.fetch();
    ready();
    await gate;
    await route.fulfill({ response }).catch(() => {});
  });
  await input.fill('A note sent before leaving.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await serverSaved;
  if (kind === 'newer typing') {
    await input.fill('Keep this second unsent note');
    deliver();
    await expect(page.getByText('Synthetic saved reply for the school note.', { exact: false })).toBeVisible();
    await expect(input).toHaveValue('Keep this second unsent note');
    await page.getByRole('link', { name: 'Library', exact: true }).click();
    await page.getByRole('link', { name: 'Tutor', exact: true }).click();
    await expect(input).toHaveValue('Keep this second unsent note');
  } else {
    await page.getByRole('link', { name: 'Library', exact: true }).click();
    deliver();
    await page.getByRole('link', { name: 'Tutor', exact: true }).click();
    await expect(page.getByText('Synthetic saved reply for the school note.', { exact: false })).toBeVisible();
    await expect(input).toHaveValue('');
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  await input.focus();
  expect(await input.evaluate(element => element.getBoundingClientRect().width > 100)).toBe(true);
  await page.screenshot({ path: `${output}/${kind.replaceAll(' ', '-')}-390-large-text.png` });
});

test('Tutor bounds offline checking and recovers after reconnecting', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/chat');
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
  const input = page.getByRole('textbox', { name: 'Message input' });
  await expect(input).toBeVisible();
  let disconnected = false;
  await page.route('**/api/chat/reconcile/*', route => disconnected ? route.abort('failed') : route.continue());
  await page.route('**/api/chat/stream', route => { disconnected = true; return route.abort('failed'); });
  await input.fill('Keep my note while the connection is down');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check again', exact: true })).toBeVisible({ timeout: 65000 });
  await expect(page.getByRole('button', { name: 'Start over', exact: true })).toBeVisible();
  await expect(input).toHaveValue('Keep my note while the connection is down');
  await page.screenshot({ path: `${output}/offline-bounded-390.png` });
  disconnected = false;
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeEnabled({ timeout: 15000 });
  await expect(input).toHaveValue('Keep my note while the connection is down');
});
