import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_STREAMING_BASE_URL || 'http://127.0.0.1:4178';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'streaming.spec.ts',
  outputDir: 'test-results/streaming',
  use: { baseURL, serviceWorkers: 'block', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'streaming-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'streaming-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_STREAMING_BASE_URL ? undefined : {
    command: 'npx vite --config e2e/streaming-fixture/vite.config.ts',
    url: `${baseURL}/e2e/streaming-fixture/`,
    reuseExistingServer: false,
  },
});
