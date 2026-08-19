import { expect, test, type Page } from '@playwright/test';

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

test('public learner can reach the dictionary and search it', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Learn a little Chamorro every day.' })).toBeVisible();

  await page.getByRole('link', { name: /Search the dictionary/i }).click();
  await expect(page).toHaveURL(/\/vocabulary$/);
  await expect(page.getByRole('heading', { name: 'Vocabulary' })).toBeVisible();

  await page.getByPlaceholder('Search all Chamorro words...').fill('guåhu');
  await expect(page.getByText('guåhu', { exact: true })).toBeVisible();
  await expect(page.getByText('I; me', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('translation shortcut selects translation intent without sending a message', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/chat?intent=translate');
  await expect(page).toHaveURL(/\/chat\?intent=translate$/);
  await expect(page.getByRole('button', { name: 'Translate this sentence' })).toBeVisible();
  await expect(page.getByPlaceholder('Sign in to chat...')).toBeVisible();
  await expect(page.getByRole('button', { name: /Send message/i })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('public learner can open stories and protected games fail closed', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  await page.goto('/stories');
  await expect(page.getByRole('heading', { name: 'Chamorro Stories' })).toBeVisible();

  await page.goto('/games');
  await expect(page.getByRole('heading', { name: 'Learning Games' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Free Account' })).toBeVisible();
  await expect(page.getByText('Sign in to access Learning Games')).toBeVisible();
  expect(errors).toEqual([]);
});

test('critical pages fit the viewport without horizontal overflow', async ({ page }) => {
  const errors = monitorRuntimeErrors(page);

  for (const path of ['/', '/vocabulary', '/stories', '/chat?intent=translate']) {
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
