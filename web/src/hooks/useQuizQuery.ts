import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface QuizAnswer {
  id: string;
  question_id: string;
  question_text: string;
  question_type: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string | null;
}

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

export interface QuizResultDetail extends QuizResult {
  answers: QuizAnswer[];
}

export interface QuizStats {
  total_quizzes: number;
  average_score: number;
  best_category: string | null;
  best_category_title: string | null;
  best_category_percentage: number | null;
  recent_results: QuizResult[];
}

export interface QuizAnswerInput {
  question_id: string;
  question_text: string;
  question_type: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
}

export interface SaveQuizResultParams {
  category_id: string;
  category_title: string;
  score: number;
  total: number;
  time_spent_seconds?: number;
  answers?: QuizAnswerInput[];
}

export interface QuizHistoryPagination {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface QuizHistoryResponse {
  results: QuizResult[];
  pagination: QuizHistoryPagination;
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

// Hook to get quiz result detail with answers
export function useQuizResultDetail(resultId: string | undefined) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['quizResult', resultId],
    queryFn: async (): Promise<QuizResultDetail> => {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/quiz/results/${resultId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quiz result');
      }

      return response.json();
    },
    enabled: !!isSignedIn && !!resultId,
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
      // Invalidate quiz stats and history to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['quizStats'] });
      queryClient.invalidateQueries({ queryKey: ['quizHistory'] });
    },
  });
}

// Hook to get paginated quiz history
export function useQuizHistory(page: number = 1, perPage: number = 20) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['quizHistory', page, perPage],
    queryFn: async (): Promise<QuizHistoryResponse> => {
      const token = await getToken();
      
      const response = await fetch(
        `${API_URL}/api/quiz/history?page=${page}&per_page=${perPage}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch quiz history');
      }

      return response.json();
    },
    enabled: !!isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

