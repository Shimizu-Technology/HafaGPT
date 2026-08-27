import { findCuratedConceptIndex } from '../data/conceptEvidence';
import {
  appRoutes,
  MAX_APP_URL_LENGTH,
  safeInternalReturnPath,
  setAppQueryParams,
} from './routes';


const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ConceptReviewContext {
  conceptId: string;
  cardIndex: number;
  to: string;
  label: string;
}

export function withConceptReview(
  categoryId: string,
  conceptId: string,
  resultId: string,
): string {
  const flashcardsPath = appRoutes.flashcards(categoryId);
  if (
    findCuratedConceptIndex(categoryId, conceptId) === null
    || !UUID_PATTERN.test(resultId)
  ) {
    return flashcardsPath;
  }

  const returnTo = appRoutes.quizReview(resultId);
  const contextualPath = setAppQueryParams(flashcardsPath, {
    type: 'curated',
    concept: conceptId,
    result_id: resultId,
    return_to: returnTo,
  });
  return contextualPath && contextualPath.length <= MAX_APP_URL_LENGTH
    ? contextualPath
    : flashcardsPath;
}

export function readConceptReview(
  search: string,
  categoryId: string,
): ConceptReviewContext | null {
  const params = new URLSearchParams(search);
  const conceptId = params.get('concept') ?? '';
  const resultId = params.get('result_id') ?? '';
  const cardIndex = findCuratedConceptIndex(categoryId, conceptId);
  if (cardIndex === null || !UUID_PATTERN.test(resultId)) return null;

  const canonicalReturn = appRoutes.quizReview(resultId);
  if (safeInternalReturnPath(params.get('return_to'), '') !== canonicalReturn) return null;

  return {
    conceptId,
    cardIndex,
    to: canonicalReturn,
    label: 'Back to quiz review',
  };
}
