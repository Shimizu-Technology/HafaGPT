import { describe, expect, it } from 'vitest';
import { ADVANCED_PATH, ALL_TOPICS, INTERMEDIATE_PATH, getNextTopic, getTopicIndex } from './learningPath';
import { DEFAULT_FLASHCARD_DECKS } from './defaultFlashcards';
import { QUIZ_CATEGORIES } from './quizData';

describe('learning path continuation', () => {
  it('continues within intermediate and advanced paths', () => {
    expect(getNextTopic(INTERMEDIATE_PATH[0].id)?.id).toBe(INTERMEDIATE_PATH[1].id);
    expect(getNextTopic(ADVANCED_PATH[0].id)?.id).toBe(ADVANCED_PATH[1].id);
  });

  it('uses a level-local one-based topic index', () => {
    expect(getTopicIndex(INTERMEDIATE_PATH[0].id)).toBe(1);
    expect(getTopicIndex(ADVANCED_PATH[0].id)).toBe(1);
    expect(getTopicIndex(ADVANCED_PATH[1].id)).toBe(2);
  });

  it('connects every lesson to a flashcard deck, quiz, and suggested game', () => {
    const quizIds = new Set(QUIZ_CATEGORIES.map((category) => category.id));

    for (const topic of ALL_TOPICS) {
      expect(DEFAULT_FLASHCARD_DECKS[topic.flashcardCategory], `${topic.id} flashcards`).toBeDefined();
      expect(quizIds.has(topic.quizCategory), `${topic.id} quiz`).toBe(true);
      expect(topic.suggestedGames?.length, `${topic.id} games`).toBeGreaterThan(0);
    }
  });

  it('keeps current Guåhan calendar forms aligned across lessons, cards, and quizzes', () => {
    const dayCards = DEFAULT_FLASHCARD_DECKS.days.cards;
    const monthCards = DEFAULT_FLASHCARD_DECKS.months.cards;
    const dayQuiz = QUIZ_CATEGORIES.find((category) => category.id === 'days');
    const monthQuiz = QUIZ_CATEGORIES.find((category) => category.id === 'months');

    expect(dayCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ front: 'Damenggo', back: 'Sunday' }),
      expect.objectContaining({ front: 'Métkoles', back: 'Wednesday' }),
      expect.objectContaining({ front: 'Sǻbalu', back: 'Saturday' }),
    ]));
    expect(monthCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ front: 'Ineru', back: 'January' }),
      expect.objectContaining({ front: 'Hunño', back: 'June' }),
      expect.objectContaining({ front: 'Hulio', back: 'July' }),
    ]));
    expect(dayQuiz?.questions.map((question) => question.correctAnswer)).toContain('Damenggo');
    expect(monthQuiz?.questions.map((question) => question.correctAnswer)).toEqual(
      expect.arrayContaining(['Ineru', 'Hulio', 'Hunño']),
    );
  });
});
