import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyLessonResume, loadLessonResume, saveLessonResume } from './lessonResume';

describe('lesson resume across revisits', () => {
  beforeEach(() => { window.localStorage.clear(); vi.useRealTimers(); });
  it('retains the actual card position for its learner only', () => {
    saveLessonResume('a', 'greetings', { ...emptyLessonResume(), step: 'flashcards', cardIndex: 3, viewed: [0, 1, 2, 3] });
    expect(loadLessonResume('a', 'greetings', 14).cardIndex).toBe(3);
    expect(loadLessonResume('b', 'greetings', 14).step).toBe('intro');
  });
  it('starts a new lesson when revisiting a saved completion on a later Guam day', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-05T01:00:00Z'));
    saveLessonResume('a', 'greetings', { ...emptyLessonResume(), step: 'complete', score: 80, saved: true });
    vi.setSystemTime(new Date('2026-10-06T01:00:00Z'));
    expect(loadLessonResume('a', 'greetings', 14).step).toBe('intro');
    vi.useRealTimers();
  });
  it('keeps an unsaved completion available for retry across days', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-05T01:00:00Z'));
    saveLessonResume('a', 'greetings', { ...emptyLessonResume(), step: 'complete', score: 80, saved: false });
    vi.setSystemTime(new Date('2026-10-06T01:00:00Z'));
    expect(loadLessonResume('a', 'greetings', 14)).toMatchObject({ step: 'complete', score: 80, saved: false });
    vi.useRealTimers();
  });
});

it('migrates legacy verb positions without crediting removed or unseen cards', () => {
  window.localStorage.clear();
  window.localStorage.setItem('hafagpt_lesson_resume_v1_a_verbs', JSON.stringify({
    ...emptyLessonResume(), step: 'flashcards', cardIndex: 5, viewed: [0, 1, 2, 3, 4, 5],
  }));
  expect(loadLessonResume('a', 'verbs', 7)).toMatchObject({
    step: 'flashcards', cardIndex: 3, viewed: [0, 1, 2, 3], cardOrderSignature: '0,1,3,5,7,8,9',
  });
});

it('keeps a legacy pending completion after the deck shrinks and never remaps new saves twice', () => {
  window.localStorage.clear();
  window.localStorage.setItem('hafagpt_lesson_resume_v1_a_verbs', JSON.stringify({
    ...emptyLessonResume(), step: 'complete', cardIndex: 9, viewed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    score: 80, saved: false, xpPending: true,
  }));
  const migrated = loadLessonResume('a', 'verbs', 7);
  expect(migrated).toMatchObject({ step: 'complete', cardIndex: 6, viewed: [0, 1, 2, 3, 4, 5, 6], score: 80, saved: false, xpPending: true });
  saveLessonResume('a', 'verbs', migrated);
  expect(loadLessonResume('a', 'verbs', 7)).toMatchObject({ ...migrated, updatedAt: expect.any(Number) });
  saveLessonResume('a', 'verbs', { ...emptyLessonResume(), step: 'flashcards', cardIndex: 5, viewed: [0, 1, 2, 3, 4, 5] });
  expect(loadLessonResume('a', 'verbs', 7)).toMatchObject({ cardIndex: 5, viewed: [0, 1, 2, 3, 4, 5] });
});
