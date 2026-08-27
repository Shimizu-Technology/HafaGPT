import { describe, expect, it } from 'vitest';
import { getCuratedConceptId } from '../data/conceptEvidence';
import { readConceptReview, withConceptReview } from './conceptReview';


const resultId = '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678';

describe('concept review navigation', () => {
  it('round-trips an exact card through a bounded quiz-review return', () => {
    const conceptId = getCuratedConceptId('greetings', 3);
    const path = withConceptReview('greetings', conceptId, resultId);
    const search = path.slice(path.indexOf('?') + 1);

    expect(path).toContain('/flashcards/greetings?');
    expect(readConceptReview(search, 'greetings')).toEqual({
      conceptId,
      cardIndex: 3,
      to: `/quiz/review/${resultId}`,
      label: 'Back to quiz review',
    });
  });

  it('rejects cross-deck concepts, malformed IDs, and changed returns', () => {
    const greetingConcept = getCuratedConceptId('greetings', 0);
    expect(withConceptReview('family', greetingConcept, resultId)).toBe('/flashcards/family');
    expect(withConceptReview('greetings', greetingConcept, 'not-an-id')).toBe('/flashcards/greetings');
    expect(readConceptReview(
      `concept=${greetingConcept}&result_id=${resultId}&return_to=%2Fquiz`,
      'greetings',
    )).toBeNull();
  });
});
