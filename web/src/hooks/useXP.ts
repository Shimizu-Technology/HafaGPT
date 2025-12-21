import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// XP values (should match backend)
export const XP_VALUES = {
  flashcard_complete: 10,
  quiz_complete: 25,
  quiz_bonus_90: 10,
  game_complete: 5,
  chat_message: 2,
  topic_complete: 50,
  streak_bonus: 15,
  daily_goal_complete: 20,
} as const;

export type ActivityType = keyof typeof XP_VALUES;

interface XPData {
  total_xp: number;
  level: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  xp_progress: number; // 0-100
  daily_goal_minutes: number;
  today_minutes: number;
  daily_goal_complete: boolean;
}

interface XPHistoryItem {
  xp_amount: number;
  activity_type: string;
  activity_id: string | null;
  description: string;
  created_at: string;
}

interface AwardXPResponse {
  xp_earned: number;
  total_xp: number;
  level: number;
  level_up: boolean;
  new_level: number | null;
  daily_goal_just_completed: boolean;
}

interface AwardXPRequest {
  activity_type: ActivityType;
  activity_id?: string;
  quiz_score?: number;
  minutes_spent?: number;
}

/**
 * Hook to get user's XP data
 */
export function useXP() {
  const { getToken, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: ['xp'],
    queryFn: async (): Promise<XPData> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/xp/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch XP');
      }
      
      return response.json();
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 3, // 3 minutes - XP doesn't change that often
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });
}

/**
 * Hook to award XP for activities
 */
export function useAwardXP() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: AwardXPRequest): Promise<AwardXPResponse> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/xp/award`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error('Failed to award XP');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate XP data to refresh
      queryClient.invalidateQueries({ queryKey: ['xp'] });
    },
  });
}

/**
 * Hook to get XP history
 */
export function useXPHistory(limit: number = 20) {
  const { getToken, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: ['xp-history', limit],
    queryFn: async (): Promise<{ history: XPHistoryItem[] }> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/xp/history?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch XP history');
      }
      
      return response.json();
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to update daily goal setting
 */
export function useUpdateDailyGoal() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (dailyGoalMinutes: number): Promise<{ daily_goal_minutes: number }> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/xp/daily-goal`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daily_goal_minutes: dailyGoalMinutes }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update daily goal');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xp'] });
    },
  });
}

// Level emojis/titles for display
export const LEVEL_INFO: Record<number, { emoji: string; title: string }> = {
  1: { emoji: '🌱', title: 'Seedling' },
  2: { emoji: '🌿', title: 'Sprout' },
  3: { emoji: '🌴', title: 'Sapling' },
  4: { emoji: '🌳', title: 'Young Tree' },
  5: { emoji: '🎋', title: 'Growing Bamboo' },
  6: { emoji: '🌺', title: 'Blooming Hibiscus' },
  7: { emoji: '🦎', title: 'Island Explorer' },
  8: { emoji: '🐢', title: 'Wise Turtle' },
  9: { emoji: '🦅', title: 'Soaring Eagle' },
  10: { emoji: '🌊', title: 'Ocean Navigator' },
  11: { emoji: '⭐', title: 'Rising Star' },
  12: { emoji: '🌟', title: 'Bright Star' },
  13: { emoji: '💫', title: 'Super Star' },
  14: { emoji: '🏆', title: 'Champion' },
  15: { emoji: '👑', title: 'Master' },
};

export function getLevelInfo(level: number) {
  return LEVEL_INFO[level] || LEVEL_INFO[15];
}

