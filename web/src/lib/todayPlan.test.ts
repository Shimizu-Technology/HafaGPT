import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../hooks/useUserPreferences';
import { buildTodayPlan, type TodayPlanInput } from './todayPlan';
const input: TodayPlanInput = {
  preferences: DEFAULT_PREFERENCES, srSummary: { total_cards: 4, due_today: 2, mastered: 0, learning: 4, has_cards: true },
  weakAreas: null, xp: null,
  recommended: { recommendation_type: 'continue', progress: null, completed_topics: 0, total_topics: 21, message: '',
    topic: { id: 'greetings', title: 'Greetings & Basics', description: 'Useful greetings.', icon: '', level: 'beginner', estimated_minutes: 5, flashcard_category: 'greetings', quiz_category: 'greetings' } },
};
describe('Today session planner', () => {
  it('builds Review → Learn → Use with topic context', () => {
    const plan = buildTodayPlan(input);
    expect(plan.activities.map(activity => activity.kind)).toEqual(['review', 'lesson', 'play']);
    expect(plan.activities[1].to).toContain('source=today');
    expect(plan.activities[2].to).toContain('/games/memory?topic=greetings');
    expect(plan.totalMinutes).toBe(10);
    expect(buildTodayPlan(input)).toEqual(plan);
  });
  it('treats time as an estimate rather than claiming daily completion', () => {
    const plan = buildTodayPlan({ ...input, xp: { total_xp: 40, level: 1, xp_for_current_level: 0, xp_for_next_level: 100, xp_progress: 40, daily_goal_minutes: 10, today_minutes: 10, daily_goal_complete: true } });
    expect(plan.goalComplete).toBe(false);
    expect(plan.activities).toHaveLength(3);
  });
  it('keeps the lesson with audio guidance for audio-first learners', () => {
    const plan = buildTodayPlan({ ...input, srSummary: null, preferences: { ...DEFAULT_PREFERENCES, reading_support: 'audio_pictures' } });
    expect(plan.activities[0].kind).toBe('lesson');
    expect(plan.activities[0].description).toContain('Listen');
  });
  it('offers a completable revisit after finishing the path', () => {
    const plan = buildTodayPlan({ ...input, recommended: { ...input.recommended!, recommendation_type: 'complete', topic: null }, srSummary: null });
    expect(plan.activities.map(activity => activity.kind)).toEqual(['lesson', 'play']);
    expect(plan.activities[0].to).toContain('/learn/greetings');
    expect(plan.activities[0].title).toContain('Revisit');
  });
  it('keeps practice available when the time goal is disabled', () => {
    const plan = buildTodayPlan({ ...input, xp: { total_xp: 0, level: 1, xp_for_current_level: 0, xp_for_next_level: 100, xp_progress: 0, daily_goal_minutes: 0, today_minutes: 0, daily_goal_complete: false } });
    expect(plan.activities.length).toBeGreaterThan(0);
    expect(plan.goalDisabled).toBe(false);
  });
});
