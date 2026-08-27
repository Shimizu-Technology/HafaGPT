import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTopic } from '../data/learningPath';
import { getCuratedDeckConceptIds, getQuestionConceptId } from '../data/conceptEvidence';
import { LessonFlashcards } from './LessonFlashcards';
import { LessonQuiz } from './LessonQuiz';


const mocks = vi.hoisted(() => ({
  saveQuizResult: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isSignedIn: true }),
}));

vi.mock('../hooks/useQuizQuery', () => ({
  useSaveQuizResult: () => ({ mutate: mocks.saveQuizResult }),
}));

vi.mock('../hooks/useSpeech', () => ({
  useSpeech: () => ({ speak: vi.fn(), isSpeaking: false }),
}));


const greetings = getTopic('greetings')!;

describe('lesson concept evidence', () => {
  beforeEach(() => {
    mocks.saveQuizResult.mockReset();
    window.localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports every exact card only after the learner views the full lesson deck', () => {
    const onComplete = vi.fn();
    render(
      <LessonFlashcards
        topic={greetings}
        onComplete={onComplete}
        onSkip={vi.fn()}
      />,
    );

    for (let cardNumber = 2; cardNumber <= 14; cardNumber += 1) {
      fireEvent.click(screen.getByRole('button', { name: `View card ${cardNumber}` }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Quiz' }));

    expect(onComplete).toHaveBeenCalledWith(
      14,
      getCuratedDeckConceptIds('greetings'),
    );
  });

  it('persists the embedded quiz as one identified, retry-safe lesson assessment', () => {
    const onComplete = vi.fn();
    render(<LessonQuiz topic={greetings} onComplete={onComplete} />);

    const answerQuestion = (answer: string, typed = false) => {
      if (typed) {
        fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
          target: { value: answer },
        });
      } else {
        fireEvent.click(screen.getByRole('button', { name: answer }));
      }
      fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    };

    answerQuestion('Hello / Hi');
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerQuestion("Si Yu'os Ma'åse'");
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerQuestion('Adios', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerQuestion('Adai', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerQuestion('How are you?');
    fireEvent.click(screen.getByRole('button', { name: 'See Results' }));
    fireEvent.click(screen.getByRole('button', { name: 'See Results' }));

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith(100);
    expect(mocks.saveQuizResult).toHaveBeenCalledOnce();
    const saved = mocks.saveQuizResult.mock.calls[0][0];
    expect(saved).toMatchObject({
      category_id: 'greetings',
      category_title: 'Greetings & Basics',
      score: 5,
      total: 5,
      learning_context: {
        topic_id: 'greetings',
        source: 'lesson',
        assessment_id: 'v1:lesson:greetings:embedded-quiz',
      },
    });
    expect(saved.client_attempt_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(saved.answers.map((answer: { concept_id: string }) => answer.concept_id)).toEqual([
      getQuestionConceptId('greet-1'),
      getQuestionConceptId('greet-2'),
      getQuestionConceptId('greet-3'),
      getQuestionConceptId('greet-4'),
      getQuestionConceptId('greet-5'),
    ]);
  });
});
