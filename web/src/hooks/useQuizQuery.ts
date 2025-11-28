import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface QuizResult {
  id: string;
  category_id: string;
  category_title: string | null;
  score: number;
  total: number;
  percentage: number;
  time_spent_seconds: number | null;
  created_at: string;
}

export interface QuizStats {
  total_quizzes: number;
  average_score: number;
  best_category: string | null;
  best_category_title: string | null;
  best_category_percentage: number | null;
  recent_results: QuizResult[];
}

export interface SaveQuizResultParams {
  category_id: string;
  category_title: string;
  score: number;
  total: number;
  time_spent_seconds?: number;
}

// Hook to get quiz stats
export function useQuizStats() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['quizStats'],
    queryFn: async (): Promise<QuizStats> => {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/quiz/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quiz stats');
      }

      return response.json();
    },
    enabled: !!isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to save quiz result
export function useSaveQuizResult() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveQuizResultParams): Promise<QuizResult> => {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/quiz/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to save quiz result');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate quiz stats to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['quizStats'] });
    },
  });
}

