import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { captureLearningActivity, buildLearningActivityProperties } from '../lib/learningAnalytics';
import { readLearningGameContext } from '../lib/lessonPractice';
import { useTodaySessionProgress } from './useTodaySession';
import { useLearnerAuth } from './useLearnerAuth';
import { useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface GameResult {
  id: string;
  game_type: string;
  mode?: string;
  category_id: string;
  category_title?: string;
  difficulty?: string;
  score: number;
  moves?: number;
  pairs?: number;
  time_seconds?: number;
  stars?: number;
  created_at: string;
}

export interface GameStats {
  total_games: number;
  average_score: number;
  average_stars: number;
  best_category?: string;
  best_category_title?: string;
  best_category_score?: number;
  recent_results: GameResult[];
}

export interface GameResultCreate {
  game_type: string;
  mode?: string;
  category_id: string;
  category_title?: string;
  difficulty?: string;
  score: number;
  moves?: number;
  pairs?: number;
  time_seconds?: number;
  stars?: number;
  concept_ids?: string[];
  client_attempt_id?: string;
}

export interface GameHistoryResponse {
  results: GameResult[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Hook to save game result
export function useSaveGameResult() {
  const { getToken, userId } = useLearnerAuth();
  const queryClient = useQueryClient();
  const { completeStep } = useTodaySessionProgress();
  const currentOwner = useRef(userId);
  currentOwner.current = userId;

  return useMutation({
    onMutate: () => ({
      owner: userId, pathname: window.location.pathname, search: window.location.search,
      category: readLearningGameContext(window.location.search)?.categoryId,
    }),
    mutationFn: async (params: GameResultCreate) => {
      const owner = userId;
      const learningContext = readLearningGameContext(window.location.search);
      const token = await getToken();
      if (!token || currentOwner.current !== owner) throw new Error('Learner changed before the result could save');
      const shouldRecordLearning = learningContext?.categoryId === params.category_id;
      const { concept_ids: conceptIds = [], ...resultParams } = params;
      
      const response = await fetch(`${API_URL}/api/games/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...resultParams,
          ...(shouldRecordLearning ? {
            learning_context: {
              topic_id: learningContext.topicId,
              source: learningContext.source,
              concept_ids: conceptIds,
            },
          } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save game result');
      }

      const result = await response.json();
      if (shouldRecordLearning) {
        captureLearningActivity(buildLearningActivityProperties(learningContext, resultParams));
      }
      return result;
    },
    onSuccess: (_result, params, launch) => {
      if (launch?.owner === userId && launch.category === params.category_id) {
        completeStep('use', launch);
      }
      // Invalidate game stats to refetch
      queryClient.invalidateQueries({ queryKey: ['game-stats'] });
      queryClient.invalidateQueries({ queryKey: ['game-history'] });
      queryClient.invalidateQueries({ queryKey: ['activity-results'] });
    },
  });
}

// Hook to get game stats
export function useGameStats(enabled: boolean = true) {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery<GameStats>({
    queryKey: ['game-stats', userId],
    queryFn: async () => {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/games/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch game stats');
      }

      return response.json();
    },
    enabled: enabled && isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get game history
export function useGameHistory(
  page: number = 1,
  perPage: number = 10,
  gameType?: string,
  enabled: boolean = true
) {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery<GameHistoryResponse>({
    queryKey: ['game-history', userId, page, perPage, gameType],
    queryFn: async () => {
      const token = await getToken();
      
      let url = `${API_URL}/api/games/history?page=${page}&per_page=${perPage}`;
      if (gameType) {
        url += `&game_type=${gameType}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch game history');
      }

      return response.json();
    },
    enabled: enabled && isSignedIn,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
