import { useUser } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type LearningGoal = 'conversation' | 'culture' | 'family' | 'travel' | 'all';

export type ThemePreference = 'light' | 'dark';

export interface UserPreferences {
  skill_level: SkillLevel;
  learning_goal: LearningGoal;
  onboarding_completed: boolean;
  preferred_mode?: 'english' | 'chamorro' | 'learn';
  preferred_theme?: ThemePreference;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  skill_level: 'beginner',
  learning_goal: 'all',
  onboarding_completed: false,
};

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
    if (!user?.unsafeMetadata) {
      return DEFAULT_PREFERENCES;
    }

    const metadata = user.unsafeMetadata as Record<string, unknown>;
    
    return {
      skill_level: (metadata.skill_level as SkillLevel) || DEFAULT_PREFERENCES.skill_level,
      learning_goal: (metadata.learning_goal as LearningGoal) || DEFAULT_PREFERENCES.learning_goal,
      onboarding_completed: Boolean(metadata.onboarding_completed),
      preferred_mode: metadata.preferred_mode as UserPreferences['preferred_mode'],
      preferred_theme: metadata.preferred_theme as ThemePreference | undefined,
    };
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
  const completeOnboarding = async (skillLevel: SkillLevel, learningGoal: LearningGoal) => {
    await updatePreferencesMutation.mutateAsync({
      skill_level: skillLevel,
      learning_goal: learningGoal,
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
