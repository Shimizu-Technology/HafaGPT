import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLearnerAuth } from './useLearnerAuth';
import { getTopic } from '../data/learningPath';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { getCuratedConceptId } from '../data/conceptEvidence';


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
  const { getToken } = useLearnerAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      topicId,
      conceptIds,
    }: RecordLessonExposureParams): Promise<LessonExposureResponse> => {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      const category = getTopic(topicId)?.flashcardCategory;
      const reviewCards = category ? (DEFAULT_FLASHCARD_DECKS[category]?.cards ?? [])
        .map((card, index) => ({ concept_id: getCuratedConceptId(category, index), ...card }))
        .filter(card => conceptIds.includes(card.concept_id)) : [];

      const response = await fetch(
        `${API_URL}/api/learning/lessons/${encodeURIComponent(topicId)}/exposures`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            concept_ids: conceptIds,
            ...(reviewCards.length ? { review_cards: reviewCards } : {}),
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to record lesson evidence');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicWorkspace'] });
      queryClient.invalidateQueries({ queryKey: ['homepageData'] });
      queryClient.invalidateQueries({ queryKey: ['srSummary'] });
    },
  });
}
