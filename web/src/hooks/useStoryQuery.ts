import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types for pre-extracted stories
export interface StoryParagraph {
  id: string;
  chamorro: string;
  english: string;
  words: Array<{
    chamorro: string;
    english: string;
    pronunciation?: string;
  }>;
}

export interface Story {
  id: string;
  title: string;
  titleEnglish: string;
  titleChamorro?: string;
  author?: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  source: string;
  sourceUrl: string;
  sourceName: string;
  attribution: string;
  paragraphs: StoryParagraph[];
  paragraphCount: number;
  wordCount: number;
  readingTime: number;
}

export interface AvailableStory {
  id: string;
  title: string;
  titleChamorro?: string;
  author?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  paragraphCount: number;
  sourceUrl: string;
  sourceName: string;
}

export interface AvailableStoriesResponse {
  stories: AvailableStory[];
  total: number;
  by_category: Record<string, AvailableStory[]>;
}

// Hook to get list of available stories (pre-extracted)
export function useAvailableStories(category?: string) {
  return useQuery({
    queryKey: ['availableStories', category],
    queryFn: async (): Promise<AvailableStoriesResponse> => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      
      const response = await fetch(
        `${API_URL}/api/stories/available?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch available stories');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - stories don't change often
  });
}

// Hook to get a full story by ID (instant - no AI generation)
export function useStory(storyId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['story', storyId],
    queryFn: async (): Promise<Story> => {
      const response = await fetch(
        `${API_URL}/api/stories/${storyId}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch story');
      }

      return response.json();
    },
    enabled: !!storyId && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour - stories don't change
  });
}

// Legacy alias for backwards compatibility
export const useAIStory = useStory;
