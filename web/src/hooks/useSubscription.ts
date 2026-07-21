import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useSession, useUser } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export type SiteTheme = 'default' | 'christmas' | 'newyear' | 'chamorro';

export interface PromoStatus {
  active: boolean;
  end_date: string | null;
  message: string | null;
  theme: SiteTheme;
}

export interface UsageData {
  chat_count: number;
  game_count: number;
  quiz_count: number;
  chat_limit: number;
  game_limit: number;
  quiz_limit: number;
  is_premium: boolean;
}

export interface UsageIncrementResult {
  success: boolean;
  new_count: number;
  limit: number;
  remaining: number;
  is_premium: boolean;
}

export interface SubscriptionStatus {
  is_premium: boolean;
  plan_name: string | null;
  features: string[];
}

export type UsageType = 'chat' | 'game' | 'quiz';

/**
 * Hook to check if a promotional period is active.
 * 
 * Returns promo status and end date for display.
 * This is a public endpoint - no auth required.
 */
export function usePromoStatus() {
  return useQuery<PromoStatus>({
    queryKey: ['promo-status'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/promo/status`);
      if (!response.ok) {
        return { active: false, end_date: null, message: null, theme: 'default' as SiteTheme };
      }
      const data = await response.json();
      return {
        ...data,
        theme: data.theme || 'default',
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get the current user's subscription status.
 * 
 * Checks user's publicMetadata for subscription info.
 * This is set by Clerk webhooks when subscription events occur.
 */
export function useSubscriptionStatus(enabled: boolean = true) {
  const { isSignedIn, isLoaded } = useAuth();
  const { session } = useSession();
  const { user } = useUser();

  // Check if user has access to premium features
  const checkPremiumStatus = (): SubscriptionStatus => {
    if (!isSignedIn || !isLoaded) {
      return { is_premium: false, plan_name: null, features: [] };
    }

    let isPremium = false;
    let planName: string | null = null;
    const features: string[] = [];

    // Check user's public metadata for subscription info (set by webhook)
    if (user?.publicMetadata) {
      const metadata = user.publicMetadata as Record<string, unknown>;
      
      // Check for is_premium flag (set by our webhook)
      if (metadata.is_premium) {
        isPremium = true;
        planName = (metadata.plan_name as string) || 'Premium';
        features.push('unlimited_chat', 'unlimited_games', 'unlimited_quizzes');
      }
    }

    return {
      is_premium: isPremium,
      plan_name: planName,
      features,
    };
  };

  // Use React Query to cache the result
  return useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status', session?.id, user?.id, user?.publicMetadata],
    queryFn: async () => {
      return checkPremiumStatus();
    },
    enabled: enabled && isSignedIn && isLoaded,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get the current user's daily usage.
 * 
 * Returns counts and limits for chat, games, and quizzes.
 * Premium users have limits set to -1 (unlimited).
 */
export function useUsage(enabled: boolean = true) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery<UsageData>({
    queryKey: ['usage-today'],
    queryFn: async () => {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/usage/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      return response.json();
    },
    enabled: enabled && isSignedIn,
    staleTime: 1000 * 30, // 30 seconds - usage can change frequently
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to increment usage counter.
 * 
 * Call this before allowing a user to use a feature.
 * Returns whether the action was allowed and how many uses remain.
 */
export function useIncrementUsage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usageType: UsageType): Promise<UsageIncrementResult> => {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/usage/increment/${usageType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to increment usage');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate usage query to refetch updated counts
      queryClient.invalidateQueries({ queryKey: ['usage-today'] });
    },
  });
}

/**
 * Helper hook that combines subscription status and usage data.
 * 
 * Provides convenient methods to check if a feature can be used.
 */
export function useSubscription() {
  const { isSignedIn } = useAuth();
  const { data: usage, isLoading: usageLoading } = useUsage(isSignedIn);
  const { data: status, isLoading: statusLoading } = useSubscriptionStatus(isSignedIn);
  const { data: promo } = usePromoStatus();
  const incrementMutation = useIncrementUsage();

  const isLoading = usageLoading || statusLoading;
  
  // Promo status
  const isPromoActive = promo?.active ?? false;
  
  // User is premium if they have a subscription OR if promo is active
  // This ensures all users get unlimited access during promo periods
  const isPremium = (status?.is_premium ?? false) || isPromoActive;

  /**
   * Check if a feature can be used (under limit or premium).
   */
  const canUse = (type: UsageType): boolean => {
    if (!isSignedIn) return false;
    if (isPremium) return true;
    if (!usage) return true; // Assume can use if data not loaded yet
    
    const count = usage[`${type}_count` as keyof UsageData] as number;
    const limit = usage[`${type}_limit` as keyof UsageData] as number;
    
    // -1 means unlimited
    if (limit === -1) return true;
    return count < limit;
  };

  /**
   * Get remaining uses for a feature.
   * Returns -1 for unlimited (premium users).
   */
  const getRemaining = (type: UsageType): number => {
    if (!isSignedIn) return 0;
    if (isPremium) return -1;
    if (!usage) return 5; // Default limit
    
    const count = usage[`${type}_count` as keyof UsageData] as number;
    const limit = usage[`${type}_limit` as keyof UsageData] as number;
    
    if (limit === -1) return -1;
    return Math.max(0, limit - count);
  };

  /**
   * Get the daily limit for a feature.
   * Returns -1 for unlimited (premium users).
   */
  const getLimit = (type: UsageType): number => {
    if (isPremium) return -1;
    if (!usage) {
      // Default limits
      switch (type) {
        case 'chat': return 5;
        case 'game': return 5;
        case 'quiz': return 3;
        default: return 5;
      }
    }
    return usage[`${type}_limit` as keyof UsageData] as number;
  };

  /**
   * Get current usage count for a feature.
   */
  const getCount = (type: UsageType): number => {
    if (!usage) return 0;
    return usage[`${type}_count` as keyof UsageData] as number;
  };

  /**
   * Attempt to use a feature. Returns true if allowed, false if limit reached.
   * Automatically increments the counter if allowed.
   */
  const tryUse = async (type: UsageType): Promise<boolean> => {
    if (!isSignedIn) return false;
    if (isPremium) {
      // Still increment for tracking, but always allow
      await incrementMutation.mutateAsync(type);
      return true;
    }
    
    const result = await incrementMutation.mutateAsync(type);
    return result.success;
  };

  return {
    // Status
    isLoading,
    isPremium,
    isSignedIn,
    usage,
    subscription: status,
    
    // Promo status
    isPromoActive,
    promoEndDate: promo?.end_date ?? null,
    promoMessage: promo?.message ?? null,
    
    // Theme
    siteTheme: promo?.theme ?? 'default',
    isChristmasTheme: promo?.theme === 'christmas',
    isNewYearTheme: promo?.theme === 'newyear',
    
    // Methods
    canUse,
    getRemaining,
    getLimit,
    getCount,
    tryUse,
    
    // Raw mutation for manual control
    incrementUsage: incrementMutation,
  };
}

export default useSubscription;

