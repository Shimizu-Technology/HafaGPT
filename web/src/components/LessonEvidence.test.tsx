import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTopic } from '../data/learningPath';
import { getCuratedDeckConceptIds, getQuestionConceptId } from '../data/conceptEvidence';
import { LessonFlashcards } from './LessonFlashcards';
import { LessonQuiz } from './LessonQuiz';


const mocks = vi.hoisted(() => ({
  saveQuizResult: vi.fn(),
  userId: 'user_123',
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isSignedIn: true, user: { id: mocks.userId } }),
}));

vi.mock('../hooks/useQuizQuery', () => ({
  useSaveQuizResult: () => ({ mutateAsync: mocks.saveQuizResult }),
}));

vi.mock('../hooks/useSpeech', () => ({
  useSpeech: () => ({ speak: vi.fn(), isSpeaking: false }),
}));


const greetings = getTopic('greetings')!;

function answerLessonQuestion(answer: string, typed = false) {
  if (typed) {
    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: answer },
    });
  } else {
    fireEvent.click(screen.getByRole('button', { name: answer }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
}

function saveResumableGreetingQuiz(attemptId: string, startedAt: number) {
  window.localStorage.setItem(`hafagpt_quiz_${mocks.userId}_greetings`, JSON.stringify({
    topicId: 'greetings',
    attemptId,
    startedAt,
    questionIds: ['greet-1', 'greet-2', 'greet-3', 'greet-4', 'greet-5'],
    currentIndex: 1,
    correctCount: 1,
    answeredQuestions: {
      'greet-1': { userAnswer: 'Hello / Hi', isCorrect: true },
    },
    timestamp: Date.now(),
  }));
}

describe('lesson concept evidence', () => {
  beforeEach(() => {
    mocks.saveQuizResult.mockReset();
    mocks.saveQuizResult.mockResolvedValue({});
    mocks.userId = 'user_123';
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

  it('persists the embedded quiz as one identified, retry-safe lesson assessment', async () => {
    const onComplete = vi.fn();
    render(<LessonQuiz topic={greetings} onComplete={onComplete} />);

    answerLessonQuestion('Hello / Hi');
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion("Si Yu'os Ma'åse'");
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('Adios', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('Adai', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('How are you?');
    fireEvent.click(screen.getByRole('button', { name: 'See Results' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
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

  it('resumes the same assessment identity and preserves its original start time', async () => {
    const attemptId = '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678';
    const now = 2_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    saveResumableGreetingQuiz(attemptId, now - 60_000);

    render(<LessonQuiz topic={greetings} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue Where I Left Off' }));

    answerLessonQuestion("Si Yu'os Ma'åse'");
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('Adios', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('Adai', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('How are you?');
    fireEvent.click(screen.getByRole('button', { name: 'See Results' }));

    await waitFor(() => expect(mocks.saveQuizResult).toHaveBeenCalledOnce());
    const saved = mocks.saveQuizResult.mock.calls[0][0];
    expect(saved.client_attempt_id).toBe(attemptId);
    expect(saved.time_spent_seconds).toBe(60);
    expect(saved.answers).toHaveLength(5);
    expect(window.localStorage.getItem('hafagpt_quiz_user_123_greetings')).toBeNull();
  });

  it('restores the recorded correctness of a fuzzy-matched current answer', () => {
    window.localStorage.setItem(`hafagpt_quiz_${mocks.userId}_greetings`, JSON.stringify({
      topicId: 'greetings',
      questionIds: ['greet-1', 'greet-2', 'greet-3', 'greet-4', 'greet-5'],
      currentIndex: 2,
      correctCount: 3,
      answeredQuestions: {
        'greet-1': { userAnswer: 'Hello / Hi', isCorrect: true },
        'greet-2': { userAnswer: 'Good morning', isCorrect: true },
        'greet-3': { userAnswer: 'Adio', isCorrect: true },
      },
      timestamp: Date.now(),
    }));

    render(<LessonQuiz topic={greetings} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue Where I Left Off' }));

    expect(screen.getByDisplayValue('Adio')).toHaveClass('border-emerald-500');
    expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument();
    expect(screen.getByText('3 correct')).toBeInTheDocument();
  });

  it('keeps a failed result resumable and retries with the same assessment identity', async () => {
    const onComplete = vi.fn();
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
    mocks.saveQuizResult
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({});
    const { unmount } = render(
      <LessonQuiz topic={greetings} onComplete={onComplete} />,
    );

    answerLessonQuestion('Hello / Hi');
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion("Si Yu'os Ma'åse'");
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('Adios', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('Adai', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    answerLessonQuestion('How are you?');
    fireEvent.click(screen.getByRole('button', { name: 'See Results' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your progress is safe—try again.',
    );
    expect(onComplete).not.toHaveBeenCalled();
    const firstAttemptId = mocks.saveQuizResult.mock.calls[0][0].client_attempt_id;
    const storedAfterFailure = JSON.parse(
      window.localStorage.getItem('hafagpt_quiz_user_123_greetings') ?? '{}',
    );
    expect(storedAfterFailure.attemptId).toBe(firstAttemptId);

    unmount();
    render(<LessonQuiz topic={greetings} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue Where I Left Off' }));
    fireEvent.click(screen.getByRole('button', { name: 'See Results' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(100));
    expect(mocks.saveQuizResult).toHaveBeenCalledTimes(2);
    expect(mocks.saveQuizResult.mock.calls[1][0]).toEqual(
      mocks.saveQuizResult.mock.calls[0][0],
    );
    expect(window.localStorage.getItem('hafagpt_quiz_user_123_greetings')).toBeNull();
  });

  it('abandons saved progress with a new retry identity when starting fresh', async () => {
    const priorAttemptId = '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678';
    saveResumableGreetingQuiz(priorAttemptId, Date.now() - 60_000);

    render(<LessonQuiz topic={greetings} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Fresh' }));

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    await waitFor(() => {
      const fresh = JSON.parse(
        window.localStorage.getItem('hafagpt_quiz_user_123_greetings') ?? '{}',
      );
      expect(fresh.currentIndex).toBe(0);
      expect(fresh.attemptId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(fresh.attemptId).not.toBe(priorAttemptId);
      expect(fresh.answeredQuestions).toEqual({});
    });
  });

  it('discards malformed saved question order without crashing the lesson quiz', async () => {
    window.localStorage.setItem(`hafagpt_quiz_${mocks.userId}_greetings`, JSON.stringify({
      topicId: 'greetings',
      questionIds: 'greet-1',
      currentIndex: 0,
      correctCount: 0,
      answeredQuestions: {},
      timestamp: Date.now(),
    }));

    render(<LessonQuiz topic={greetings} onComplete={vi.fn()} />);

    expect(screen.queryByText('Continue Quiz?')).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    await waitFor(() => {
      const replacement = JSON.parse(
        window.localStorage.getItem(`hafagpt_quiz_${mocks.userId}_greetings`) ?? '{}',
      );
      expect(replacement.questionIds).toEqual([
        'greet-1',
        'greet-2',
        'greet-3',
        'greet-4',
        'greet-5',
      ]);
    });
  });

  it('discards saved scores that conflict with their answer evidence', async () => {
    window.localStorage.setItem(`hafagpt_quiz_${mocks.userId}_greetings`, JSON.stringify({
      topicId: 'greetings',
      attemptId: '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678',
      startedAt: Date.now() - 60_000,
      questionIds: ['greet-1', 'greet-2', 'greet-3', 'greet-4', 'greet-5'],
      currentIndex: 4,
      correctCount: 5,
      answeredQuestions: {
        'greet-1': { userAnswer: 'wrong', isCorrect: false },
        'greet-2': { userAnswer: 'wrong', isCorrect: false },
        'greet-3': { userAnswer: 'wrong', isCorrect: false },
        'greet-4': { userAnswer: 'wrong', isCorrect: false },
        'greet-5': { userAnswer: 'wrong', isCorrect: false },
      },
      timestamp: Date.now(),
    }));

    render(<LessonQuiz topic={greetings} onComplete={vi.fn()} />);

    expect(screen.queryByText('Continue Quiz?')).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(mocks.saveQuizResult).not.toHaveBeenCalled();
    await waitFor(() => {
      const replacement = JSON.parse(
        window.localStorage.getItem(`hafagpt_quiz_${mocks.userId}_greetings`) ?? '{}',
      );
      expect(replacement.correctCount).toBe(0);
      expect(replacement.answeredQuestions).toEqual({});
    });
  });

  it('discards saved answers that do not belong to the saved quiz', async () => {
    window.localStorage.setItem(`hafagpt_quiz_${mocks.userId}_greetings`, JSON.stringify({
      topicId: 'greetings',
      questionIds: ['greet-1', 'greet-2', 'greet-3', 'greet-4', 'greet-5'],
      currentIndex: 1,
      correctCount: 1,
      answeredQuestions: {
        'unrelated-question': { userAnswer: 'Hello / Hi', isCorrect: true },
      },
      timestamp: Date.now(),
    }));

    render(<LessonQuiz topic={greetings} onComplete={vi.fn()} />);

    expect(screen.queryByText('Continue Quiz?')).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    await waitFor(() => {
      const replacement = JSON.parse(
        window.localStorage.getItem(`hafagpt_quiz_${mocks.userId}_greetings`) ?? '{}',
      );
      expect(replacement.currentIndex).toBe(0);
      expect(replacement.answeredQuestions).toEqual({});
    });
  });

  it('discards saved answers that skip ahead of the current quiz position', async () => {
    window.localStorage.setItem(`hafagpt_quiz_${mocks.userId}_greetings`, JSON.stringify({
      topicId: 'greetings',
      questionIds: ['greet-1', 'greet-2', 'greet-3', 'greet-4', 'greet-5'],
      currentIndex: 3,
      correctCount: 3,
      answeredQuestions: {
        'greet-1': { userAnswer: 'Hello / Hi', isCorrect: true },
        'greet-2': { userAnswer: 'Good morning', isCorrect: true },
        'greet-5': { userAnswer: 'future answer', isCorrect: true },
      },
      timestamp: Date.now(),
    }));

    render(<LessonQuiz topic={greetings} onComplete={vi.fn()} />);

    expect(screen.queryByText('Continue Quiz?')).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    await waitFor(() => {
      const replacement = JSON.parse(
        window.localStorage.getItem(`hafagpt_quiz_${mocks.userId}_greetings`) ?? '{}',
      );
      expect(replacement.currentIndex).toBe(0);
      expect(replacement.answeredQuestions).toEqual({});
    });
  });

  it('never restores another authenticated account saved lesson quiz', () => {
    saveResumableGreetingQuiz(
      '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678',
      Date.now() - 60_000,
    );
    const { rerender } = render(
      <LessonQuiz topic={greetings} onComplete={vi.fn()} />,
    );
    expect(screen.getByText('Continue Quiz?')).toBeInTheDocument();

    mocks.userId = 'user_456';
    rerender(<LessonQuiz topic={greetings} onComplete={vi.fn()} />);

    expect(screen.queryByText('Continue Quiz?')).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(window.localStorage.getItem('hafagpt_quiz_user_123_greetings'))
      .not.toBeNull();
  });
});
