import { beforeEach, describe, expect, it } from 'vitest';
import { getQuizCategory } from '../data/quizData';
import { loadStandaloneQuiz, saveStandaloneQuiz, clearStandaloneQuiz, type StandaloneQuizResume } from './standaloneQuizResume';
const questions = getQuizCategory('greetings')!.questions;
const saved: StandaloneQuizResume = { version: 1, questions, currentIndex: 1, results: [{ question: questions[0], userAnswer: questions[0].correctAnswer, isCorrect: true }], userAnswer: '', answerState: 'unanswered', attemptId: 'same-attempt', startedAt: Date.now(), updatedAt: Date.now() };
beforeEach(() => localStorage.clear());
describe('standalone quiz resume', () => {
  it('preserves exact order, answers, index and retry identity across remount', () => {
    saveStandaloneQuiz('one', 'greetings', 10, saved);
    const restored = loadStandaloneQuiz('one', 'greetings', 10, new Set(questions.map(question => question.id)));
    expect(restored).toMatchObject({ questions, currentIndex: 1, attemptId: 'same-attempt', results: saved.results });
    expect(loadStandaloneQuiz('two', 'greetings', 10)).toBeNull();
    expect(loadStandaloneQuiz('one', 'family', 10)).toBeNull();
    clearStandaloneQuiz('one', 'greetings', 10);
    expect(loadStandaloneQuiz('one', 'greetings', 10)).toBeNull();
  });
  it('rejects inconsistent indexes, missing prior answers and obsolete questions', () => {
    saveStandaloneQuiz('one', 'greetings', 10, { ...saved, currentIndex: 4 });
    expect(loadStandaloneQuiz('one', 'greetings', 10)).toBeNull();
    saveStandaloneQuiz('one', 'greetings', 10, saved);
    expect(loadStandaloneQuiz('one', 'greetings', 10, new Set(['obsolete']))).toBeNull();
  });
  it('preserves a final answered question so a failed save can retry after reload', () => {
    const last = { ...saved, currentIndex: questions.length - 1, results: questions.map(question => ({ question, userAnswer: question.correctAnswer, isCorrect: true })), answerState: 'correct' as const };
    saveStandaloneQuiz('one', 'greetings', 10, last);
    expect(loadStandaloneQuiz('one', 'greetings', 10)?.answerState).toBe('correct');
  });
});
