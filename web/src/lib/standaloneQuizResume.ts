import type { QuizQuestion } from '../data/quizData';
import { browserStorage } from './browserStorage';
export interface QuizResumeResult { question: QuizQuestion; userAnswer: string; isCorrect: boolean }
export interface StandaloneQuizResume {
  version: 1;
  questions: QuizQuestion[];
  currentIndex: number;
  results: QuizResumeResult[];
  userAnswer: string;
  answerState: 'unanswered' | 'correct' | 'incorrect';
  attemptId: string;
  startedAt: number;
  updatedAt: number;
}
const key = (owner: string, category: string, count: number) => `hafagpt_standalone_quiz_v1_${owner}_${category}_${count}`;
function validQuestion(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== 'object') return false;
  const question = value as QuizQuestion;
  return typeof question.id === 'string' && typeof question.question === 'string'
    && typeof question.correctAnswer === 'string'
    && ['multiple_choice', 'fill_blank', 'type_answer'].includes(question.type)
    && (question.type !== 'multiple_choice' || (Array.isArray(question.options)
      && question.options.every(option => typeof option === 'string')
      && question.options.includes(question.correctAnswer)));
}
export function loadStandaloneQuiz(owner: string, category: string, count: number, allowedIds?: Set<string>): StandaloneQuizResume | null {
  try {
    const raw = browserStorage.get(key(owner, category, count));
    if (!raw) return null;
    const saved = JSON.parse(raw) as StandaloneQuizResume;
    if (saved.version !== 1 || !Array.isArray(saved.questions) || !saved.questions.length || saved.questions.length > 100
      || !saved.questions.every(question => validQuestion(question) && (!allowedIds || allowedIds.has(question.id)))
      || (allowedIds && saved.questions.length !== allowedIds.size)
      || new Set(saved.questions.map(question => question.id)).size !== saved.questions.length
      || !Number.isInteger(saved.currentIndex) || saved.currentIndex < 0 || saved.currentIndex >= saved.questions.length
      || !Array.isArray(saved.results) || ![saved.currentIndex, saved.currentIndex + 1].includes(saved.results.length)
      || !saved.results.every((result, index) => result && typeof result.userAnswer === 'string'
        && typeof result.isCorrect === 'boolean' && result.question?.id === saved.questions[index].id)
      || typeof saved.userAnswer !== 'string' || !['unanswered', 'correct', 'incorrect'].includes(saved.answerState)
      || (saved.answerState === 'unanswered' ? saved.results.length !== saved.currentIndex
        : saved.results.length !== saved.currentIndex + 1 || saved.results[saved.currentIndex].isCorrect !== (saved.answerState === 'correct'))
      || typeof saved.attemptId !== 'string' || !saved.attemptId || !Number.isFinite(saved.startedAt)
      || !Number.isFinite(saved.updatedAt) || Date.now() - saved.updatedAt > 30 * 86400000) return null;
    return saved;
  } catch { return null; }
}
export function saveStandaloneQuiz(owner: string, category: string, count: number, saved: StandaloneQuizResume) {
  return browserStorage.set(key(owner, category, count), JSON.stringify({ ...saved, updatedAt: Date.now() }));
}
export function clearStandaloneQuiz(owner: string, category: string, count: number) {
  browserStorage.remove(key(owner, category, count));
}
