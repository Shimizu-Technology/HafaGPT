import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../hooks/useUserPreferences';
import type { RecommendedData } from '../hooks/useHomepageData';
import { buildTodayPlan, type TodayPlanInput } from './todayPlan';

const recommended: RecommendedData = {
  recommendation_type: 'continue',
  topic: {
    id: 'greetings',
    title: 'Greetings & Basics',
    description: 'Learn useful greetings.',
    icon: 'wave',
    level: 'beginner',
    flashcard_category: 'greetings',
    quiz_category: 'greetings',
    estimated_minutes: 5,
  },
  progress: null,
  completed_topics: 0,
  total_topics: 21,
  message: 'Continue learning',
};

function input(overrides: Partial<TodayPlanInput> = {}): TodayPlanInput {
  return {
    preferences: { ...DEFAULT_PREFERENCES, onboarding_completed: true },
    recommended,
    srSummary: null,
    weakAreas: null,
    xp: null,
    ...overrides,
  };
}

describe('deterministic Today planner', () => {
  it('returns the same plan for the same state and stays within the budget', () => {
    const state = input({
      srSummary: { total_cards: 20, due_today: 6, mastered: 2, learning: 18, has_cards: true },
    });
    const first = buildTodayPlan(state);
    const second = buildTodayPlan(state);

    expect(first).toEqual(second);
    expect(first.totalMinutes).toBeLessThanOrEqual(first.remainingMinutes);
    expect(first.activities[0].kind).toBe('review');
  });

  it('meaningfully prioritizes listening for audio-first learners', () => {
    const audioFirst = buildTodayPlan(input({
      preferences: {
        ...DEFAULT_PREFERENCES,
        onboarding_completed: true,
        reading_support: 'audio_pictures',
        daily_session_minutes: 10,
      },
    }));
    const independent = buildTodayPlan(input({
      preferences: {
        ...DEFAULT_PREFERENCES,
        onboarding_completed: true,
        reading_support: 'independent',
        daily_session_minutes: 10,
      },
    }));

    expect(audioFirst.activities[0].kind).toBe('listen');
    expect(independent.activities[0].kind).toBe('lesson');
  });

  it('uses the remaining daily budget and returns a useful completion state', () => {
    const partial = buildTodayPlan(input({
      preferences: { ...DEFAULT_PREFERENCES, onboarding_completed: true, daily_session_minutes: 10 },
      xp: {
        total_xp: 100,
        level: 2,
        xp_for_current_level: 100,
        xp_for_next_level: 250,
        xp_progress: 0,
        daily_goal_minutes: 10,
        today_minutes: 7,
        daily_goal_complete: false,
      },
    }));
    const complete = buildTodayPlan(input({
      xp: {
        total_xp: 100,
        level: 2,
        xp_for_current_level: 100,
        xp_for_next_level: 250,
        xp_progress: 0,
        daily_goal_minutes: 10,
        today_minutes: 10,
        daily_goal_complete: true,
      },
    }));

    expect(partial.remainingMinutes).toBe(3);
    expect(partial.totalMinutes).toBeLessThanOrEqual(3);
    expect(complete.goalComplete).toBe(true);
    expect(complete.activities).toEqual([]);
  });
});
