import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface GameResultRecord {
  id: string;
  game_type: string;
  mode: string | null;
  category_id: string;
  category_title: string | null;
  difficulty: string | null;
  score: number;
  moves: number | null;
  pairs: number | null;
  time_seconds: number | null;
  stars: number | null;
  created_at: string;
  learning_topic_id: string | null;
  learning_source: string | null;
  evidence_scope: 'legacy' | 'topic' | 'concept';
  concept_ids: string[];
}

export interface ActivityResultPreview {
  id: string;
  result_type: 'quiz' | 'game';
  title: string;
  created_at: string;
  score: number;
  total: number | null;
  percentage: number | null;
  stars: number | null;
}

async function authenticatedJson<T>(
  url: string,
  getToken: () => Promise<string | null>,
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to load activity result');
  return response.json();
}

export function useGameResultRecord(resultId?: string) {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: ['activity-results', 'game', userId, resultId],
    queryFn: () => authenticatedJson<GameResultRecord>(
      `${API_URL}/api/activity-results/games/${encodeURIComponent(resultId || '')}`,
      getToken,
    ),
    enabled: isSignedIn && !!userId && !!resultId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTopicActivityResults(topicId?: string, limit = 3) {
  const { getToken, isSignedIn, userId } = useAuth();
  const boundedLimit = Number.isFinite(limit)
    ? Math.min(10, Math.max(1, Math.trunc(limit)))
    : 3;

  return useQuery({
    queryKey: ['activity-results', 'topic', userId, topicId, boundedLimit],
    queryFn: () => authenticatedJson<ActivityResultPreview[]>(
      `${API_URL}/api/activity-results/topics/${encodeURIComponent(topicId || '')}?limit=${boundedLimit}`,
      getToken,
    ),
    enabled: isSignedIn && !!userId && !!topicId,
    staleTime: 1000 * 60 * 2,
  });
}
