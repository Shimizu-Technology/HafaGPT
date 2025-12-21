import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface DueCard {
  card_id: string;
  deck_id: string;
  easiness_factor: number;
  interval: number;
  repetition: number;
  last_review: string | null;
  next_review: string | null;
  total_reviews: number;
  correct_count: number;
  incorrect_count: number;
}

export interface DueCardsResponse {
  due_cards: DueCard[];
  total_due: number;
  has_due_cards: boolean;
}

export interface ReviewResult {
  card_id: string;
  deck_id: string;
  quality: number;
  is_correct: boolean;
  easiness_factor: number;
  interval_days: number;
  repetition: number;
  next_review: string;
  total_reviews: number;
  correct_count: number;
  incorrect_count: number;
}

export interface SRSummary {
  total_cards: number;
  due_today: number;
  mastered: number;
  learning: number;
  has_cards: boolean;
}

// Quality ratings for SM-2
export const QUALITY_RATINGS = {
  FORGOT: 0,         // Complete blackout
  HARD_FORGOT: 1,    // Incorrect but recognized
  BARELY_FORGOT: 2,  // Incorrect but felt close
  HARD: 3,           // Correct with significant difficulty
  GOOD: 4,           // Correct with some hesitation
  EASY: 5,           // Perfect recall
} as const;

export type QualityRating = typeof QUALITY_RATINGS[keyof typeof QUALITY_RATINGS];

/**
 * Hook to get flashcards due for review
 */
export function useDueCards(deckId?: string, limit: number = 20) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['dueCards', deckId, limit],
    queryFn: async (): Promise<DueCardsResponse> => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (deckId) params.append('deck_id', deckId);
      params.append('limit', String(limit));

      const response = await fetch(`${API_URL}/api/flashcards/due?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch due cards');
      }

      return response.json();
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to record a flashcard review
 */
export function useRecordReview() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { cardId: string; deckId: string; quality: QualityRating }): Promise<ReviewResult> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/flashcards/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_id: params.cardId,
          deck_id: params.deckId,
          quality: params.quality,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record review');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate due cards and summary
      queryClient.invalidateQueries({ queryKey: ['dueCards'] });
      queryClient.invalidateQueries({ queryKey: ['srSummary'] });
    },
  });
}

/**
 * Hook to get spaced repetition summary stats
 */
export function useSRSummary() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['srSummary'],
    queryFn: async (): Promise<SRSummary> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/flashcards/stats/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SR summary');
      }

      return response.json();
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get human-readable label for quality rating
 */
export function getQualityLabel(quality: QualityRating): string {
  switch (quality) {
    case 0:
    case 1:
    case 2:
      return 'Again';
    case 3:
      return 'Hard';
    case 4:
      return 'Good';
    case 5:
      return 'Easy';
    default:
      return 'Good';
  }
}

/**
 * Get color class for quality rating button
 */
export function getQualityColor(quality: QualityRating, isSelected: boolean): string {
  if (quality <= 2) {
    return isSelected
      ? 'bg-red-500 text-white border-red-500'
      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50';
  }
  if (quality === 3) {
    return isSelected
      ? 'bg-orange-500 text-white border-orange-500'
      : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/50';
  }
  if (quality === 4) {
    return isSelected
      ? 'bg-green-500 text-white border-green-500'
      : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/50';
  }
  return isSelected
    ? 'bg-blue-500 text-white border-blue-500'
    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50';
}

