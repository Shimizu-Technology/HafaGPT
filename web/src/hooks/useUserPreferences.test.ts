import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, normalizeUserPreferences } from './useUserPreferences';

describe('user preference normalization', () => {
  it('preserves allowlisted capability preferences', () => {
    expect(normalizeUserPreferences({
      skill_level: 'advanced',
      learning_goal: 'culture',
      learner_mode: 'with_child',
      reading_support: 'audio_pictures',
      daily_session_minutes: 15,
      onboarding_completed: true,
      preferred_mode: 'learn',
      preferred_theme: 'dark',
    })).toEqual({
      skill_level: 'advanced',
      learning_goal: 'culture',
      learner_mode: 'with_child',
      reading_support: 'audio_pictures',
      daily_session_minutes: 15,
      onboarding_completed: true,
      preferred_mode: 'learn',
      preferred_theme: 'dark',
    });
  });

  it('uses privacy-safe defaults for missing or unrecognized client metadata', () => {
    expect(normalizeUserPreferences({
      learner_mode: 'named_child_profile',
      reading_support: 'school_roster',
      daily_session_minutes: 999,
      onboarding_completed: 'true',
    })).toEqual(DEFAULT_PREFERENCES);
  });
});

