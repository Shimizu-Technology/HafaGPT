import { defineConfig, devices, type Project } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const hasAuthenticatedTestConfig = Boolean(
  process.env.CLERK_SECRET_KEY
  && process.env.CLERK_PUBLISHABLE_KEY
  && process.env.E2E_CLERK_USER_EMAIL,
);

const projects: Project[] = [
  {
    name: 'desktop-chromium',
    testIgnore: /authenticated\.spec\.ts/,
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'mobile-chromium',
    testIgnore: /authenticated\.spec\.ts/,
    use: { ...devices['Pixel 7'] },
  },
];

if (hasAuthenticatedTestConfig) {
  projects.push(
    {
      name: 'authenticated-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'authenticated-chromium',
      testMatch: /authenticated\.spec\.ts/,
      dependencies: ['authenticated-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.clerk/user.json',
      },
    },
  );
}

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects,
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
