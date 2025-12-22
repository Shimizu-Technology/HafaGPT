import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types for the unified homepage data
export interface StreakData {
  current_streak: number;
  longest_streak: number;
  is_today_active: boolean;
  today_activities: {
    chat: number;
    games: number;
    quizzes: number;
    learning: number;
  };
  last_activity_date: string | null;
}

export interface XPData {
  total_xp: number;
  level: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  xp_progress: number;
  daily_goal_minutes: number;
  today_minutes: number;
  daily_goal_complete: boolean;
}

export interface QuizStatsData {
  total_quizzes: number;
  average_score: number;
}

export interface GameStatsData {
  total_games: number;
  average_score: number;
}

export interface WeakArea {
  category_id: string;
  category_title: string;
  avg_score: number;
  attempt_count: number;
  priority: 'high' | 'medium';
}

export interface WeakAreasData {
  weak_areas: WeakArea[];
  has_weak_areas: boolean;
  recommendation: WeakArea | null;
}

export interface SRSummaryData {
  total_cards: number;
  due_today: number;
  mastered: number;
  learning: number;
  has_cards: boolean;
}

export interface TopicProgress {
  topic_id: string;
  started_at: string | null;
  completed_at: string | null;
  best_quiz_score: number | null;
  flashcards_viewed: number;
  last_activity_at: string | null;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  level: string;
  flashcardCategory: string;
  quizCategory: string;
  order: number;
  estimatedMinutes?: number;
}

export interface RecommendedData {
  recommendation_type: 'start' | 'continue' | 'next' | 'review' | 'complete';
  topic: Topic | null;
  progress: TopicProgress | null;
  completed_topics: number;
  total_topics: number;
  message: string;
}

export interface TopicWithProgress {
  topic: Topic;
  progress: TopicProgress;
}

export interface AllProgressData {
  topics: TopicWithProgress[];
  summary: {
    beginner: { completed: number; total: number };
    intermediate: { completed: number; total: number };
    advanced: { completed: number; total: number };
    total_completed: number;
    total_topics: number;
  };
}

export interface HomepageData {
  streak: StreakData | null;
  xp: XPData | null;
  quiz_stats: QuizStatsData | null;
  game_stats: GameStatsData | null;
  weak_areas: WeakAreasData | null;
  sr_summary: SRSummaryData | null;
  recommended: RecommendedData | null;
  all_progress: AllProgressData | null;
}

/**
 * Unified hook that fetches all homepage data in a single API call.
 * This reduces homepage load from 8+ API calls to just 1.
 */
export function useHomepageData() {
  const { getToken, isSignedIn } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<HomepageData>({
    queryKey: ['homepageData'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/homepage/data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch homepage data');
      }

      return response.json();
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 2, // 2 minutes - homepage data changes moderately
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });

  return {
    data,
    isLoading,
    error,
    refetch,
    // Convenience accessors
    streak: data?.streak ?? null,
    xp: data?.xp ?? null,
    quizStats: data?.quiz_stats ?? null,
    gameStats: data?.game_stats ?? null,
    weakAreas: data?.weak_areas ?? null,
    srSummary: data?.sr_summary ?? null,
    recommended: data?.recommended ?? null,
    allProgress: data?.all_progress ?? null,
  };
}

export default useHomepageData;

