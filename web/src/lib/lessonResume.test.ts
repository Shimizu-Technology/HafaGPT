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
