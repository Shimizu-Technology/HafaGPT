import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, normalizeUserPreferences } from './useUserPreferences';

describe('user preference normalization', () => {
  it('preserves allowlisted metadata-backed capability preferences', () => {
    expect(normalizeUserPreferences({
      skill_level: 'advanced',
      learning_goal: 'culture',
      learner_mode: 'with_child',
      reading_support: 'audio_pictures',
      onboarding_completed: true,
      preferred_mode: 'learn',
      preferred_theme: 'dark',
    })).toEqual({
      skill_level: 'advanced',
      learning_goal: 'culture',
      learner_mode: 'with_child',
      reading_support: 'audio_pictures',
      onboarding_completed: true,
      preferred_mode: 'learn',
      preferred_theme: 'dark',
    });
  });

  it('ignores the legacy duplicate session-length metadata', () => {
    expect(normalizeUserPreferences({ daily_session_minutes: 20 })).toEqual(DEFAULT_PREFERENCES);
  });

  it('uses privacy-safe defaults for missing or unrecognized client metadata', () => {
    expect(normalizeUserPreferences({
      learner_mode: 'named_child_profile',
      reading_support: 'school_roster',
      onboarding_completed: 'true',
    })).toEqual(DEFAULT_PREFERENCES);
  });
});
