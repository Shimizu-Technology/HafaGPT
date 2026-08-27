import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RecordLessonExposureParams {
  topicId: string;
  conceptIds: string[];
}

interface LessonExposureResponse {
  topic_id: string;
  lesson_id: string;
  recorded_concepts: number;
}

export function useRecordLessonExposure() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      topicId,
      conceptIds,
    }: RecordLessonExposureParams): Promise<LessonExposureResponse> => {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(
        `${API_URL}/api/learning/lessons/${encodeURIComponent(topicId)}/exposures`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ concept_ids: conceptIds }),
        },
      );

      if (!response.ok) throw new Error('Failed to record lesson evidence');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicWorkspace'] });
    },
  });
}
