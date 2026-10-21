import { expect, test } from '@playwright/test';

const topicPath = '/learning/greetings';
const context = 'topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings';

// Deterministic read fixtures; the full local QA uses the dedicated real API/DB.
test.beforeEach(async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/promo/status') return route.fulfill({ json: { active: false, theme: 'default', theme_active: false } });
    if (path === '/api/usage/today') return route.fulfill({ json: { chat_count: 0, game_count: 0, quiz_count: 0, chat_limit: 10, game_limit: 10, quiz_limit: 10, is_premium: false } });
    if (path.startsWith('/api/usage/increment/')) return route.fulfill({ json: { success: true } });
    if (path === '/api/learning/progress') return route.fulfill({ json: { topics: [], total_topics: 21, completed_topics: 0 } });
    if (path === '/api/learning/workspaces/greetings') return route.fulfill({ json: {
      topic: { id: 'greetings', title: 'Greetings & Basics', description: 'Learn greetings', icon: '', estimated_minutes: 5, flashcard_category: 'greetings', quiz_category: 'greetings', level: 'beginner' },
      progress: { topic_id: 'greetings', started_at: null, completed_at: null, best_quiz_score: null, flashcards_viewed: 0, last_activity_at: null },
      lesson_id: 'greetings', flashcard_category: 'greetings', quiz_category: 'greetings', suggested_game_ids: ['memory', 'scramble'], scenario_ids: ['meeting-someone'], story_ids: ['hafa-adai-maria'],
    } });
    if (path.includes('/conversation-records/topics/') || path.includes('/activity-results/topics/')) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { detail: 'Read fixture outside navigation scenario' } });
  });
});

for (const surface of [
  { path: '/learn/greetings', back: 'Back to topic' },
  { path: '/games/memory', back: 'Back to topic' },
  { path: '/flashcards/greetings', back: 'Back to learning path' },
  { path: '/stories/hafa-adai-maria', back: 'Back to stories' },
  { path: '/practice/meeting-someone', back: 'Back to conversation scenarios' },
]) {
  test(`destination Back removes the activity return circle: ${surface.path}`, async ({ page }) => {
    await page.goto('/learning');
    // Native link navigation, not a synthetic history-state fixture.
    await page.getByRole('link', { name: /Greetings & Basics/ }).first().click();
    await expect(page).toHaveURL(/\/learning\/greetings$/);
    const href = surface.path + '?' + (surface.path.startsWith('/learn') || surface.path.startsWith('/games') ? context : 'topic=greetings&return_to=%2Flearning%2Fgreetings');
    const link = page.locator(`a[href^="${surface.path}?"]`).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(surface.path));
    const back = page.getByRole('button', { name: 'Back to topic', exact: true });
    // Other surfaces use their topic's full title as their destination label.
    const namedBack = surface.path.startsWith('/learn') || surface.path.startsWith('/games')
      ? back : page.getByRole('button', { name: 'Back to Greetings & Basics', exact: true });
    await expect(namedBack).toBeVisible();
    const activityIndex = await page.evaluate(() => history.state.idx);
    await namedBack.click();
    await expect(page).toHaveURL(/\/learning\/greetings$/);
    expect(await page.evaluate(() => history.state.idx)).toBe(activityIndex);
    await page.getByRole('button', { name: 'Back to learning path' }).click();
    await expect(page).toHaveURL(/\/learning$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/learning\/greetings$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/learning$/);
    if (surface.path === '/learn/greetings') {
      for (let round = 0; round < 3; round += 1) {
        await page.locator('a[href="/learning/greetings"]').first().click();
        await page.getByRole('link', { name: 'Start lesson', exact: true }).click();
        const childIndex = await page.evaluate(() => history.state.idx);
        await namedBack.click();
        await page.getByRole('button', { name: 'Back to learning path' }).click();
        await expect(page).toHaveURL(/\/learning$/);
        expect(await page.evaluate(() => history.state.idx)).toBe(childIndex);
      }
      // Native Back through these trips contains parents, never a returned lesson.
      for (let step = 0; step < 6; step += 1) {
        await page.goBack();
        await expect(page).not.toHaveURL(/\/learn\//);
      }
    }
    // A fresh contextual deep link also has a deterministic parent.
    await page.goto(href);
    await expect(namedBack).toBeVisible();
    await namedBack.click();
    await expect(page).toHaveURL(new RegExp(topicPath + '$'));
  });
}
