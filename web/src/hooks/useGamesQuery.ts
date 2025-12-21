import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GameResultCreate) => {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/games/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to save game result');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate game stats to refetch
      queryClient.invalidateQueries({ queryKey: ['game-stats'] });
      queryClient.invalidateQueries({ queryKey: ['game-history'] });
    },
  });
}

// Hook to get game stats
export function useGameStats(enabled: boolean = true) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery<GameStats>({
    queryKey: ['game-stats'],
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
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });
}

// Hook to get game history
export function useGameHistory(
  page: number = 1,
  perPage: number = 10,
  gameType?: string,
  enabled: boolean = true
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery<GameHistoryResponse>({
    queryKey: ['game-history', page, perPage, gameType],
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


