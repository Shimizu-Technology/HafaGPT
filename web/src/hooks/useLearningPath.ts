import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface LearningTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimated_minutes: number;
  flashcard_category: string;
  quiz_category: string;
}

export interface TopicProgress {
  topic_id: string;
  started_at: string | null;
  completed_at: string | null;
  best_quiz_score: number | null;
  flashcards_viewed: number;
  last_activity_at: string | null;
}

export interface RecommendedTopicResponse {
  recommendation_type: 'start' | 'continue' | 'next' | 'review' | 'complete';
  topic: LearningTopic | null;
  progress: TopicProgress | null;
  total_topics: number;
  completed_topics: number;
  message: string;
}

export interface TopicWithProgress {
  topic: LearningTopic;
  progress: TopicProgress;
}

export interface AllProgressResponse {
  topics: TopicWithProgress[];
  total_topics: number;
  completed_topics: number;
}

export interface UpdateProgressResponse {
  topic_id: string;
  progress: TopicProgress;
  is_completed: boolean;
  next_topic: LearningTopic | null;
}

// Get recommended next topic
export function useRecommendedTopic() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['learning', 'recommended'],
    queryFn: async (): Promise<RecommendedTopicResponse> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/learning/recommended`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommended topic');
      }

      return response.json();
    },
    enabled: isSignedIn,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

// Get all progress
export function useAllProgress() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['learning', 'progress'],
    queryFn: async (): Promise<AllProgressResponse> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/learning/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      return response.json();
    },
    enabled: isSignedIn,
    staleTime: 30 * 1000,
  });
}

// Update progress
export function useUpdateProgress() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      topicId, 
      action, 
      quizScore,
      flashcardsCount
    }: { 
      topicId: string; 
      action: 'start' | 'flashcard_viewed' | 'quiz_completed';
      quizScore?: number;
      flashcardsCount?: number;
    }): Promise<UpdateProgressResponse> => {
      const token = await getToken();
      
      const params = new URLSearchParams({ action });
      if (quizScore !== undefined) {
        params.append('quiz_score', quizScore.toString());
      }
      if (flashcardsCount !== undefined) {
        params.append('flashcards_count', flashcardsCount.toString());
      }

      const response = await fetch(
        `${API_URL}/api/learning/progress/${topicId}?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['learning', 'recommended'] });
      queryClient.invalidateQueries({ queryKey: ['learning', 'progress'] });
    },
  });
}

