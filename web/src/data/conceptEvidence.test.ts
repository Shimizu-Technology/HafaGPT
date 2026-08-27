import { describe, expect, it } from 'vitest';
import { DEFAULT_FLASHCARD_DECKS } from './defaultFlashcards';
import { QUIZ_CATEGORIES } from './quizData';
import { ALL_TOPICS } from './learningPath';
import {
  CURATED_CONCEPT_MANIFEST,
  findCuratedConceptIndex,
  getCuratedConceptId,
  getCuratedDeckConceptIds,
  getQuestionConceptId,
  validateCuratedConceptManifest,
} from './conceptEvidence';

describe('curated concept evidence', () => {
  it('keeps the manifest card counts aligned with every authored deck', () => {
    expect(CURATED_CONCEPT_MANIFEST.deck_card_counts).toEqual(
      Object.fromEntries(
        Object.entries(DEFAULT_FLASHCARD_DECKS).map(([categoryId, deck]) => [
          categoryId,
          deck.cards.length,
        ]),
      ),
    );
  });

  it('gives every authored quiz question one valid curated card relationship', () => {
    const questionIds = QUIZ_CATEGORIES.flatMap((category) =>
      category.questions.map((question) => question.id),
    );

    expect(Object.keys(CURATED_CONCEPT_MANIFEST.question_concepts).sort()).toEqual(
      [...questionIds].sort(),
    );
    for (const [questionId, [categoryId, cardIndex]] of Object.entries(
      CURATED_CONCEPT_MANIFEST.question_concepts,
    )) {
      expect(questionIds).toContain(questionId);
      expect(DEFAULT_FLASHCARD_DECKS[categoryId]).toBeDefined();
      expect(DEFAULT_FLASHCARD_DECKS[categoryId].cards[cardIndex]).toBeDefined();
      expect(getQuestionConceptId(questionId)).toBe(
        getCuratedConceptId(categoryId, cardIndex),
      );
    }

    for (const quiz of QUIZ_CATEGORIES) {
      const topic = ALL_TOPICS.find((candidate) => candidate.quizCategory === quiz.id);
      expect(topic).toBeDefined();
      for (const question of quiz.questions) {
        expect(CURATED_CONCEPT_MANIFEST.question_concepts[question.id][0]).toBe(
          topic?.flashcardCategory,
        );
      }
    }
  });

  it('round-trips exact card identities without accepting another deck', () => {
    const conceptId = getCuratedConceptId('greetings', 0);
    expect(conceptId).toBe('v1:curated:1psmtc9');
    expect(findCuratedConceptIndex('greetings', conceptId)).toBe(0);
    expect(findCuratedConceptIndex('family', conceptId)).toBeNull();
    expect(getCuratedDeckConceptIds('greetings')).toHaveLength(14);
  });

  it('rejects malformed and out-of-range manifest relationships at runtime', () => {
    expect(() => validateCuratedConceptManifest({ version: 1 })).toThrow(
      'missing its relationship maps',
    );
    expect(() => validateCuratedConceptManifest({
      version: 1,
      deck_card_counts: { greetings: 1 },
      question_concepts: { 'greet-1': ['greetings', 1] },
    })).toThrow('Out-of-range curated concept relationship');
    expect(() => validateCuratedConceptManifest({
      version: 1,
      deck_card_counts: { greetings: 1 },
      question_concepts: { 'greet-1': ['family', 0] },
    })).toThrow('Out-of-range curated concept relationship');
  });
});
