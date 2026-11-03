import { createCardIdentity } from '../lib/cardIdentity';
import type { QuizQuestion } from './quizData';

// Exact pre-retirement records, used only to restore already answered work.
// Never include these in the question pool for new practice.
export const HISTORICAL_QUIZ_QUESTIONS: QuizQuestion[] = [
      {
        id: 'verb-1',
        type: 'multiple_choice',
        question: 'What does "Hu kånno\'" mean?',
        options: ['I sleep', 'I eat', 'I go', 'I see'],
        correctAnswer: 'I eat',
        explanation: '"Hu kånno\'" means "I eat" — "Hu" is the pronoun and "kånno\'" is the verb.'
      },
      {
        id: 'verb-2',
        type: 'multiple_choice',
        question: 'How do you say "I go" in Chamorro?',
        options: ['Hu maigo\'', 'Hu hånao', 'Hu tungo\'', 'Hu gimen'],
        correctAnswer: 'Hu hånao',
        explanation: '"Hu hånao" means "I go" — "hånao" is the verb for going.'
      },
      {
        id: 'verb-3',
        type: 'type_answer',
        question: 'What does "Hu maigo\'" mean?',
        correctAnswer: 'I sleep',
        acceptableAnswers: ['I sleep', 'i sleep', 'sleep'],
        hint: 'Something you do at night',
        explanation: '"Hu maigo\'" means "I sleep".'
      },
];

export const isRetiredQuizQuestion = (id: string) => HISTORICAL_QUIZ_QUESTIONS.some(question => question.id === id);

export function getHistoricalQuestionConceptId(id: string): string | undefined {
  const index = ({ 'verb-1': 4, 'verb-2': 2, 'verb-3': 6 } as Record<string, number>)[id];
  return index === undefined ? undefined : createCardIdentity({ sourceKind: 'curated', sourceId: `curated:verbs:${index}` });
}
