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
      },
    }));
    const independent = buildTodayPlan(input({
      preferences: {
        ...DEFAULT_PREFERENCES,
        onboarding_completed: true,
        reading_support: 'independent',
      },
    }));

    expect(audioFirst.activities[0].kind).toBe('listen');
    expect(audioFirst.activities[0].to).toBe(
      '/flashcards/greetings?topic=greetings&category=greetings&source=today&return_to=%2F',
    );
    expect(independent.activities[0].kind).toBe('lesson');
    expect(independent.activities[0].to).toBe(
      '/learn/greetings?topic=greetings&category=greetings&source=today&return_to=%2F',
    );
  });

  it('keeps full Today context on the direct game activity', () => {
    const plan = buildTodayPlan(input({
      xp: {
        total_xp: 100,
        level: 2,
        xp_for_current_level: 100,
        xp_for_next_level: 250,
        xp_progress: 0,
        daily_goal_minutes: 20,
        today_minutes: 0,
        daily_goal_complete: false,
      },
    }));
    const playActivity = plan.activities.find((activity) => activity.id === 'play-greetings');

    expect(playActivity?.to).toBe(
      '/games/memory?topic=greetings&category=greetings&source=today&return_to=%2F',
    );
  });

  it('keeps Today context on a supported weak-area quiz', () => {
    const plan = buildTodayPlan(input({
      weakAreas: {
        has_weak_areas: true,
        recommendation: {
          category_id: 'family',
          category_title: 'Family',
          avg_score: 45,
          attempt_count: 2,
          priority: 'high',
        },
        weak_areas: [],
      },
    }));
    const weakArea = plan.activities.find((activity) => activity.id === 'weak-family');

    expect(weakArea?.to).toBe(
      '/quiz/family?topic=family&category=family&source=today&return_to=%2F',
    );
  });

  it('uses the remaining daily budget and returns a useful completion state', () => {
    const partial = buildTodayPlan(input({
      preferences: { ...DEFAULT_PREFERENCES, onboarding_completed: true },
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

  it('never truncates a full activity to fill a partial remaining minute', () => {
    const plan = buildTodayPlan(input({
      preferences: { ...DEFAULT_PREFERENCES, onboarding_completed: true },
      xp: {
        total_xp: 100,
        level: 2,
        xp_for_current_level: 100,
        xp_for_next_level: 250,
        xp_progress: 0,
        daily_goal_minutes: 10,
        today_minutes: 9,
        daily_goal_complete: false,
      },
    }));

    expect(plan.remainingMinutes).toBe(1);
    expect(plan.activities).toEqual([expect.objectContaining({
      id: 'quick-phrase',
      minutes: 1,
      to: '/chat?intent=practice',
    })]);
    expect(plan.activities[0].title).not.toMatch(/learn greetings/i);
  });

  it('uses the XP goal that owns tracked minutes when stored goals diverge', () => {
    const plan = buildTodayPlan(input({
      preferences: { ...DEFAULT_PREFERENCES, onboarding_completed: true },
      xp: {
        total_xp: 100,
        level: 2,
        xp_for_current_level: 100,
        xp_for_next_level: 250,
        xp_progress: 0,
        daily_goal_minutes: 5,
        today_minutes: 5,
        daily_goal_complete: true,
      },
    }));

    expect(plan.budgetMinutes).toBe(5);
    expect(plan.goalComplete).toBe(true);
  });

  it('honors an explicitly disabled XP goal without assigning timed work', () => {
    const plan = buildTodayPlan(input({
      preferences: { ...DEFAULT_PREFERENCES, onboarding_completed: true },
      xp: {
        total_xp: 0,
        level: 1,
        xp_for_current_level: 0,
        xp_for_next_level: 100,
        xp_progress: 0,
        daily_goal_minutes: 0,
        today_minutes: 0,
        daily_goal_complete: true,
      },
    }));

    expect(plan.budgetMinutes).toBe(0);
    expect(plan.goalDisabled).toBe(true);
    expect(plan.goalComplete).toBe(false);
    expect(plan.activities).toEqual([]);
  });
});
