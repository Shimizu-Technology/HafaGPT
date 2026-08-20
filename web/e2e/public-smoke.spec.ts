import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const legacyRecoveryModule = readFile(
  new URL('../public/stale-build-recovery.js', import.meta.url),
  'utf8',
);
const currentBuiltHtml = readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

const promoStatus = {
  active: false,
  end_date: null,
  message: null,
  theme: 'default',
  theme_active: false,
  theme_end_date: null,
};

async function mockPublicApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/promo/status') {
      await route.fulfill({ json: promoStatus });
      return;
    }

    if (url.pathname === '/api/vocabulary/categories') {
      await route.fulfill({
        json: {
          total_words: 10_000,
          categories: [
            {
              id: 'greetings',
              title: 'Greetings',
              icon: 'G',
              description: 'Common greetings',
              word_count: 24,
            },
          ],
        },
      });
      return;
    }

    if (url.pathname === '/api/vocabulary/categories/greetings') {
      await route.fulfill({
        json: {
          category: {
            id: 'greetings',
            title: 'Greetings & Basics',
            icon: 'G',
            description: 'Common greetings',
            word_count: 1,
          },
          total: 1,
          words: [
            {
              chamorro: 'håfa adai',
              part_of_speech: 'phrase',
              definition: 'hello',
              examples: [{ chamorro: 'Håfa adai, Maria!', english: 'Hello, Maria!' }],
            },
          ],
        },
      });
      return;
    }

    if (url.pathname === '/api/vocabulary/search') {
      await route.fulfill({
        json: {
          query: url.searchParams.get('q') || '',
          total: 1,
          results: [
            {
              chamorro: 'guåhu',
              part_of_speech: 'pronoun',
              definition: 'I; me',
              examples: [],
            },
          ],
        },
      });
      return;
    }

    if (url.pathname === '/api/vocabulary/word-of-the-day') {
      await route.fulfill({
        json: {
          chamorro: 'håfa adai',
          english: 'hello',
          part_of_speech: 'phrase',
          example: null,
          category: 'greetings',
          date: '2026-08-19',
        },
      });
      return;
    }

    if (url.pathname === '/api/usage/today') {
      await route.fulfill({
        json: {
          chat_count: 0,
          game_count: 0,
          quiz_count: 0,
          chat_limit: 5,
          game_limit: 5,
          quiz_limit: 5,
          is_premium: false,
        },
      });
      return;
    }

    if (url.pathname === '/api/homepage/data') {
      await route.fulfill({
        json: {
          streak: null,
          xp: null,
          quiz_stats: null,
          game_stats: null,
          weak_areas: null,
          sr_summary: null,
          recommended: null,
          all_progress: null,
        },
      });
      return;
    }

    if (url.pathname === '/api/stories/available') {
      await route.fulfill({
        json: {
          stories: [],
          total: 0,
          by_category: {},
          availability: {
            status: 'available',
            enabled: true,
            sourceName: 'Test source',
            sourceUrl: 'https://example.com',
            message: '',
          },
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { detail: 'Not mocked in public browser test' } });
  });
}

function monitorRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location().url;
      errors.push(`console: ${message.text()}${location ? ` (${location})` : ''}`);
    }
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await mockPublicApi(page);
});

test('pre-migration cached page recovers without clearing learner browser data', async ({ page }) => {
  const runtimeErrors = monitorRuntimeErrors(page);
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.setItem('hafagpt-recovery-sentinel', 'preserved');
    document.cookie = 'hafagpt-recovery-sentinel=preserved; path=/';
    const learnerCache = await caches.open('learner-data-sentinel');
    await learnerCache.put('/learner-data-sentinel', new Response('preserved'));
  });

  let legacyShellLoads = 0;
  await page.route(/\/\?legacy_profile=1/, async (route) => {
    legacyShellLoads += 1;
    if (legacyShellLoads === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/index-retired.js"></script></body></html>',
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: await currentBuiltHtml,
    });
  });
  await page.route('**/assets/index-retired.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: await legacyRecoveryModule,
    });
  });

  await page.goto('/?legacy_profile=1');

  await expect(page.getByRole('heading', { name: 'Learn a little Chamorro every day.' })).toBeVisible({ timeout: 6_000 });
  await expect(page).not.toHaveURL(/__hafagpt_recovery=/);
  expect(legacyShellLoads).toBe(2);
  await expect.poll(() => page.evaluate(async () => ({
    localStorage: localStorage.getItem('hafagpt-recovery-sentinel'),
    cookie: document.cookie.includes('hafagpt-recovery-sentinel=preserved'),
    learnerCache: (await caches.keys()).includes('learner-data-sentinel'),
    recoveryMarker: sessionStorage.getItem('hafagpt:stale-build-recovery'),
  }))).toEqual({
    localStorage: 'preserved',
    cookie: true,
    learnerCache: true,
    recoveryMarker: null,
  });
  expect(runtimeErrors).toEqual([]);
});

test('persistent pre-migration asset failure stops after one recovery attempt', async ({ page }) => {
  let legacyShellLoads = 0;
  await page.route(/\/\?legacy_profile=1/, async (route) => {
    legacyShellLoads += 1;
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/index-retired.js"></script></body></html>',
    });
  });
  await page.route('**/assets/index-retired.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: await legacyRecoveryModule,
    });
  });

  await page.goto('/?legacy_profile=1');

  await expect(page.getByRole('heading', { name: 'HåfaGPT could not start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page).toHaveURL(/__hafagpt_recovery=/);
  expect(legacyShellLoads).toBe(2);
});

test('stale entry asset recovers instead of leaving a blank page', async ({ page }) => {
  let simulatedMissingAsset = false;

  await page.route('**/assets/index-*.js', async (route) => {
    if (!simulatedMissingAsset) {
      simulatedMissingAsset = true;
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Stale SPA fallback</title>',
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Learn a little Chamorro every day.' })).toBeVisible();
  expect(simulatedMissingAsset).toBe(true);
  await expect.poll(() => page.evaluate(() => (
    sessionStorage.getItem('hafagpt:stale-build-recovery')
  ))).toBeNull();
  await expect(page).not.toHaveURL(/__hafagpt_recovery=/);
});

test('persistent entry failure stops after one recovery attempt', async ({ page }) => {
  await page.route('**/assets/index-*.js', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'text/plain',
      body: 'Retired application asset',
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'HåfaGPT could not start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page).toHaveURL(/__hafagpt_recovery=/);
});

test('persistent initial route failure stops after one recovery attempt', async ({ page }) => {
  await page.route('**/assets/HomePage-*.js', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'text/plain',
      body: 'Retired initial route asset',
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'HåfaGPT could not start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page).toHaveURL(/__hafagpt_recovery=/);
});

test('returning profile still starts when persistent browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Simulated unavailable profile storage', 'SecurityError');
      },
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Learn a little Chamorro every day.' })).toBeVisible({ timeout: 6_000 });
  await expect(page.locator('[data-hafagpt-startup-status]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-hafagpt-booted', 'true');

  await page.goto('/games');
  await expect(page.getByRole('heading', { name: 'We could not check your sign-in' })).toBeVisible({ timeout: 6_000 });
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
});

test('public learner can reach the dictionary and search it', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Learn a little Chamorro every day.' })).toBeVisible();

  await page.getByRole('link', { name: /Search the dictionary/i }).click();
  await expect(page).toHaveURL(/\/vocabulary$/);
  await expect(page.getByRole('heading', { name: 'Dictionary', exact: true })).toBeVisible();

  await page.getByPlaceholder('Search all Chamorro words...').fill('guåhu');
  await expect(page.getByText('guåhu', { exact: true })).toBeVisible();
  await expect(page.getByText('I; me', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Learn a little Chamorro every day.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('translation shortcut selects translation intent without sending a message', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/chat?intent=translate');
  await expect(page).toHaveURL(/\/chat\?intent=translate$/);
  await expect(page.getByRole('button', { name: 'Translate a message' })).toBeVisible();
  await expect(page.getByPlaceholder('Sign in to chat...')).toBeVisible();
  await expect(page.getByRole('button', { name: /Send message/i })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('chat empty state and composer remain readable on a narrow phone', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/chat?intent=translate');
  await expect(page.getByRole('heading', { name: 'How can I help?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Translate a message' })).toBeVisible();

  const composer = page.getByLabel('Message input');
  await expect(composer).toHaveAttribute('placeholder', 'Sign in to chat...');
  await expect(composer).toHaveCSS('font-size', '16px');
  await expect.poll(async () => page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('chat keeps its header gutter outside the scrollable messages viewport', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/chat');
  const spacing = await page.getByTestId('chat-messages-viewport').evaluate((viewport) => {
    const scroller = viewport.querySelector<HTMLElement>('[data-testid="chat-messages"]');
    if (!scroller) throw new Error('Messages scroller is missing');

    const viewportRect = viewport.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    return {
      gutter: scrollerRect.top - viewportRect.top,
      viewportPaddingTop: Number.parseFloat(getComputedStyle(viewport).paddingTop),
      scrollerPaddingTop: Number.parseFloat(getComputedStyle(scroller).paddingTop),
    };
  });

  expect(spacing.gutter).toBeGreaterThanOrEqual(20);
  expect(spacing.gutter).toBeCloseTo(spacing.viewportPaddingTop, 0);
  expect(spacing.scrollerPaddingTop).toBe(0);
  expect(errors).toEqual([]);
});

test('public learner can open stories and protected games fail closed', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/stories');
  await expect(page.getByRole('heading', { name: 'Chamorro stories' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Curated/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/games');
  await expect(page.getByRole('heading', { name: 'Learning Games' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Free Account' })).toBeVisible();
  await expect(page.getByText('Sign in to access Learning Games')).toBeVisible();
  expect(errors).toEqual([]);
});

test('dictionary category and story reader keep detail interactions accessible', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/vocabulary/greetings');
  await expect(page.getByRole('heading', { name: 'Greetings & Basics' })).toBeVisible();
  await expect(page.getByLabel('Search in Greetings & Basics')).toHaveCSS('font-size', '16px');
  await page.getByRole('button', { name: 'Show examples for håfa adai' }).click();
  await expect(page.getByText('Håfa adai, Maria!')).toBeVisible();

  await page.goto('/stories/hafa-adai-maria');
  await expect(page.getByRole('heading', { name: 'Read story' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Håfa Adai, Maria!' })).toBeVisible();
  await page.getByRole('button', { name: 'Håfa', exact: true }).click();
  await expect(page.getByText('what', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close word translation' }).click();

  await expect.poll(async () => page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('critical pages fit the viewport without horizontal overflow', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  for (const path of ['/', '/vocabulary', '/vocabulary/greetings', '/stories', '/stories/hafa-adai-maria', '/chat?intent=translate']) {
    await page.goto(path);
    await expect(page.locator('body')).toBeVisible();
    await expect.poll(async () => {
      try {
        return await page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth);
      } catch {
        return false;
      }
    }).toBe(true);
  }

  expect(errors).toEqual([]);
});
