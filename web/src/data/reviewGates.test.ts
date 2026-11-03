import { describe, expect, it } from 'vitest';
import { DEFAULT_FLASHCARD_DECKS } from './defaultFlashcards';
import { QUIZ_CATEGORIES } from './quizData';

// These forms remain unchanged in the canonical ledger for later human review.
const heldTerms = ['Hu hånao', "Hu kånno'", "Hu maigo'"];

describe('unresolved canonical verb phrases', () => {
  it('withholds the three default cards while keeping the verbs deck usable', () => {
    const cards = DEFAULT_FLASHCARD_DECKS.verbs.cards;
    expect(cards).toHaveLength(7);
    for (const term of heldTerms) expect(cards.some(card => card.front === term)).toBe(false);
  });

  it('withholds the three graded verb questions and their distractors', () => {
    const questions = QUIZ_CATEGORIES.find(category => category.id === 'verbs')!.questions;
    expect(questions).toHaveLength(5);
    expect(questions.map(question => question.id)).toEqual(['verb-4', 'verb-5', 'verb-6', 'verb-7', 'verb-8']);
    for (const term of heldTerms) expect(JSON.stringify(questions)).not.toContain(term);
  });
});

it('keeps surviving card source identities unchanged after removals', async () => {
  const { getCuratedCardSourceId, getQuestionConceptId, getCuratedConceptId } = await import('./conceptEvidence');
  expect(Array.from({ length: 7 }, (_, index) => getCuratedCardSourceId('verbs', index)))
    .toEqual([0, 1, 3, 5, 7, 8, 9].map(index => `curated:verbs:${index}`));
  expect(getQuestionConceptId('verb-1')).toBeUndefined();
  expect(getQuestionConceptId('verb-4')).toBe(getCuratedConceptId('verbs', 3));
});
