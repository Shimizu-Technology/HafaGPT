import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { expect, test as setup } from '@playwright/test';

setup.describe.configure({ mode: 'serial' });

const authFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '../playwright/.clerk/user.json');

setup('prepare an authenticated Clerk session', async ({ page }) => {
  await clerkSetup();
  await page.goto('/');
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
  });
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
