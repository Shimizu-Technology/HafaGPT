import { useUser } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DailySessionMinutes,
  LearnerMode,
  LearningGoal,
  ReadingSupport,
  SkillLevel,
} from '../data/learningPreferences';

export type {
  DailySessionMinutes,
  LearnerMode,
  LearningGoal,
  ReadingSupport,
  SkillLevel,
} from '../data/learningPreferences';

export type ThemePreference = 'light' | 'dark';

export interface UserPreferences {
  skill_level: SkillLevel;
  learning_goal: LearningGoal;
  learner_mode: LearnerMode;
  reading_support: ReadingSupport;
  daily_session_minutes: DailySessionMinutes;
  onboarding_completed: boolean;
  preferred_mode?: 'english' | 'chamorro' | 'learn';
  preferred_theme?: ThemePreference;
}

export interface OnboardingPreferences {
  skill_level: SkillLevel;
  learning_goal: LearningGoal;
  learner_mode: LearnerMode;
  reading_support: ReadingSupport;
  daily_session_minutes: DailySessionMinutes;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  skill_level: 'beginner',
  learning_goal: 'all',
  learner_mode: 'self',
  reading_support: 'short_text_audio',
  daily_session_minutes: 10,
  onboarding_completed: false,
};

const ALLOWED_SKILL_LEVELS = new Set<SkillLevel>(['beginner', 'intermediate', 'advanced']);
const ALLOWED_LEARNING_GOALS = new Set<LearningGoal>(['conversation', 'culture', 'family', 'travel', 'all']);
const ALLOWED_LEARNER_MODES = new Set<LearnerMode>(['self', 'with_child', 'helping_family']);
const ALLOWED_READING_SUPPORT = new Set<ReadingSupport>(['audio_pictures', 'short_text_audio', 'independent']);
const ALLOWED_SESSION_MINUTES = new Set<DailySessionMinutes>([5, 10, 15, 20]);

function allowlistedValue<T>(value: unknown, allowed: Set<T>, fallback: T): T {
  return allowed.has(value as T) ? value as T : fallback;
}

export function normalizeUserPreferences(metadata: Record<string, unknown> = {}): UserPreferences {
  const preferredMode = metadata.preferred_mode;
  const preferredTheme = metadata.preferred_theme;

  return {
    skill_level: allowlistedValue(metadata.skill_level, ALLOWED_SKILL_LEVELS, DEFAULT_PREFERENCES.skill_level),
    learning_goal: allowlistedValue(metadata.learning_goal, ALLOWED_LEARNING_GOALS, DEFAULT_PREFERENCES.learning_goal),
    learner_mode: allowlistedValue(metadata.learner_mode, ALLOWED_LEARNER_MODES, DEFAULT_PREFERENCES.learner_mode),
    reading_support: allowlistedValue(metadata.reading_support, ALLOWED_READING_SUPPORT, DEFAULT_PREFERENCES.reading_support),
    daily_session_minutes: allowlistedValue(
      metadata.daily_session_minutes,
      ALLOWED_SESSION_MINUTES,
      DEFAULT_PREFERENCES.daily_session_minutes,
    ),
    onboarding_completed: metadata.onboarding_completed === true,
    preferred_mode: preferredMode === 'english' || preferredMode === 'chamorro' || preferredMode === 'learn'
      ? preferredMode
      : undefined,
    preferred_theme: preferredTheme === 'light' || preferredTheme === 'dark'
      ? preferredTheme
      : undefined,
  };
}

/**
 * Hook to manage user preferences stored in Clerk's unsafeMetadata.
 * 
 * Note: We use unsafeMetadata (client-writable) for preferences because:
 * - publicMetadata is read-only from frontend (security-sensitive data like is_premium)
 * - unsafeMetadata is writable from frontend (user preferences)
 * 
 * The backend reads from unsafeMetadata for skill_level when generating responses.
 */
export function useUserPreferences() {
  const { user, isLoaded, isSignedIn } = useUser();
  const queryClient = useQueryClient();

  // Read preferences from Clerk's unsafeMetadata
  const getPreferences = (): UserPreferences => {
    return normalizeUserPreferences((user?.unsafeMetadata || {}) as Record<string, unknown>);
  };

  // Query to cache preferences
  const { data: preferences } = useQuery({
    queryKey: ['user-preferences', user?.id, user?.unsafeMetadata],
    queryFn: getPreferences,
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to update preferences in Clerk's unsafeMetadata
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<UserPreferences>) => {
      if (!user) throw new Error('User not loaded');
      
      // Merge with existing unsafeMetadata
      const currentMetadata = (user.unsafeMetadata || {}) as Record<string, unknown>;
      const updatedMetadata = {
        ...currentMetadata,
        ...newPreferences,
      };
      
      // Update user's unsafeMetadata via Clerk (client-writable)
      await user.update({ unsafeMetadata: updatedMetadata });
      
      return updatedMetadata as UserPreferences;
    },
    onSuccess: () => {
      // Invalidate to refetch preferences
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });

  // Helper to complete onboarding
  const completeOnboarding = async (onboardingPreferences: OnboardingPreferences) => {
    await updatePreferencesMutation.mutateAsync({
      ...onboardingPreferences,
      onboarding_completed: true,
    });
  };

  // Check if user needs onboarding
  const needsOnboarding = isLoaded && isSignedIn && !preferences?.onboarding_completed;

  return {
    preferences: preferences || DEFAULT_PREFERENCES,
    isLoading: !isLoaded,
    isSignedIn,
    needsOnboarding,
    
    // Actions
    updatePreferences: updatePreferencesMutation.mutate,
    updatePreferencesAsync: updatePreferencesMutation.mutateAsync,
    completeOnboarding,
    isUpdating: updatePreferencesMutation.isPending,
  };
}

export default useUserPreferences;
