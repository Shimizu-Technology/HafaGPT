import { beforeEach, describe, expect, it } from 'vitest';
import { completeTodayStep, guamDay, loadTodaySession, saveTodaySession, withTodayStep, type TodaySession } from './todaySession';
const session: TodaySession = { version: 1, day: '2026-10-05', completed: [], plan: { budgetMinutes: 10, remainingMinutes: 10, totalMinutes: 8, goalComplete: false, goalDisabled: false, headline: '', summary: '', primaryLabel: '', activities: [
  { id: 'review', kind: 'review', title: 'Review', description: 'Recall', minutes: 2, to: '/flashcards/review' },
  { id: 'learn', kind: 'lesson', title: 'Learn', description: 'Introduce', minutes: 6, to: '/learn/greetings?source=today' },
] } };
beforeEach(() => localStorage.clear());
describe('browser-local Today continuity', () => {
  it('isolates learners and Guam dates while preserving the original plan', () => {
    saveTodaySession('one', session);
    expect(loadTodaySession('one', session.day)).toEqual(session);
    expect(loadTodaySession('two', session.day)).toBeNull();
    expect(loadTodaySession('one', '2026-10-06')).toBeNull();
    expect(guamDay(new Date('2026-10-04T15:00:00Z'))).toBe('2026-10-05');
  });
  it('only completes the planned activity and is idempotent', () => {
    expect(completeTodayStep(session, 'learn', '/learn/family')).toBe(session);
    const finished = completeTodayStep(session, 'review', '/flashcards/review');
    expect(finished.completed).toEqual(['review']);
    expect(completeTodayStep(finished, 'review', '/flashcards/review')).toBe(finished);
  });
  it('rejects corrupted destinations and completion IDs', () => {
    saveTodaySession('one', { ...session, plan: { ...session.plan, activities: [{ ...session.plan.activities[0], to: '//evil.example' }] } });
    expect(loadTodaySession('one', session.day)).toBeNull();
    saveTodaySession('one', { ...session, completed: ['invented'] });
    expect(loadTodaySession('one', session.day)).toBeNull();
  });
  it('carries a bounded stage and day while preserving lesson context', () => {
    expect(withTodayStep('/learn/greetings?source=today', 'learn')).toContain('source=today&today_step=learn&today_day=');
  });
});
