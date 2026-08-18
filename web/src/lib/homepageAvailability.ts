import type { HomepageData } from '../hooks/useHomepageData';

type HomepageSectionAvailabilityInput = Pick<
  HomepageData,
  'xp' | 'weak_areas' | 'sr_summary' | 'recommended' | 'all_progress' | 'streak'
> & {
  isLoading: boolean;
  hasRequestError: boolean;
};

export function getHomepageSectionAvailability({
  isLoading,
  hasRequestError,
  xp,
  weak_areas: weakAreas,
  sr_summary: srSummary,
  recommended,
  all_progress: allProgress,
  streak,
}: HomepageSectionAvailabilityInput) {
  if (isLoading) {
    return { todayUnavailable: false, progressUnavailable: false };
  }

  if (hasRequestError) {
    return { todayUnavailable: true, progressUnavailable: true };
  }

  return {
    todayUnavailable: !xp || !weakAreas || !srSummary || !recommended,
    progressUnavailable: !xp || !allProgress || !srSummary || !streak,
  };
}
