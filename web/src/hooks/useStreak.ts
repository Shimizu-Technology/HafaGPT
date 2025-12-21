import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  is_today_active: boolean;
  today_activities: {
    chat: number;
    games: number;
    quizzes: number;
  };
  last_activity_date: string | null;
}

export function useStreak() {
  const { getToken, isSignedIn } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<StreakData>({
    queryKey: ['streak'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/streaks/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch streak');
      }

      return response.json();
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes - streak doesn't change that often
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });

  return {
    streak: data,
    isLoading,
    error,
    refetch,
  };
}

export default useStreak;
