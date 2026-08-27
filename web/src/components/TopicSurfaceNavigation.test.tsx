import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationPractice } from './ConversationPractice';
import { FlashcardViewer } from './FlashcardViewer';
import { LessonPage } from './LessonPage';
import { QuizViewer } from './QuizViewer';
import { StoryViewer } from './StoryViewer';
import {
  getCuratedConceptId,
  getCuratedDeckConceptIds,
  getQuestionConceptId,
} from '../data/conceptEvidence';
import { getQuizCategory } from '../data/quizData';
import { withConceptReview } from '../lib/conceptReview';
import { createCardIdentity } from '../lib/cardIdentity';

const mocks = vi.hoisted(() => ({
  dictionaryFlashcards: {
    cards: [{
      word_id: 'revised-word-v1-flashcard',
      source_id: 'dictionary:test',
      front: 'Test front',
      back: 'Test back',
      part_of_speech: 'noun',
      example: null,
    }],
    total: 1,
    category: { id: 'unmapped', title: 'Unmapped deck', icon: '', description: '' },
  },
  dictionaryQuiz: {
    questions: [{
      id: 'dictionary-question',
      word_id: 'revised-word-v1-quiz',
      type: 'multiple_choice',
      question: 'Test question',
      options: ['One', 'Two'],
      correct_answer: 0,
      explanation: 'Test explanation',
    }],
  },
  tryUse: vi.fn(async () => true),
  recordLessonExposure: vi.fn(),
  recordReview: vi.fn(),
  saveQuizResult: vi.fn(),
  userId: 'user_123' as string | null,
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: async () => mocks.userId ? 'test-token' : null,
    isSignedIn: Boolean(mocks.userId),
  }),
  useUser: () => ({
    isSignedIn: Boolean(mocks.userId),
    user: mocks.userId ? { id: mocks.userId } : null,
  }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../hooks/useLearningPath', () => ({
  useUpdateProgress: () => ({ mutate: vi.fn() }),
}));

vi.mock('../hooks/useConceptEvidence', () => ({
  useRecordLessonExposure: () => ({ mutate: mocks.recordLessonExposure }),
}));

vi.mock('../hooks/useXP', () => ({
  useAwardXP: () => ({ mutate: vi.fn() }),
}));

vi.mock('../hooks/useFlashcardsQuery', () => ({
  useSaveDeck: () => ({ mutate: vi.fn(), isPending: false }),
  useDictionaryFlashcards: () => ({
    data: mocks.dictionaryFlashcards,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useSpacedRepetition', () => ({
  useRecordReview: () => ({ mutateAsync: mocks.recordReview, isPending: false }),
}));

vi.mock('../hooks/useQuizQuery', () => ({
  useSaveQuizResult: () => ({ mutateAsync: mocks.saveQuizResult, isPending: false }),
}));

vi.mock('../hooks/useVocabularyQuery', () => ({
  useDictionaryQuiz: () => ({
    data: mocks.dictionaryQuiz,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({
    canUse: () => true,
    tryUse: mocks.tryUse,
    getCount: () => 0,
    getLimit: () => 10,
    isLoading: false,
  }),
}));

vi.mock('../hooks/useSpeech', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    isSpeaking: false,
    stop: vi.fn(),
    isSupported: true,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-location">{`${location.pathname}${location.search}`}</output>;
}

function SameRouteNavigator({
  to,
  label = 'Open another missed card',
}: {
  to: string;
  label?: string;
}) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>{label}</button>;
}

function renderSurface(
  component: ReactNode,
  routePath: string,
  path: string,
  withPriorHistory = false,
) {
  const router = createMemoryRouter([
    {
      element: <><Outlet /><LocationProbe /></>,
      children: [
        { path: routePath, element: component },
        { path: '/learning/:topicId', element: null },
        { path: '*', element: null },
      ],
    },
  ], {
    initialEntries: withPriorHistory ? ['/unrelated', path] : [path],
    initialIndex: withPriorHistory ? 1 : 0,
  });
  return { ...render(<RouterProvider router={router} />), router };
}

const topicQuery = 'topic=greetings&return_to=%2Flearning%2Fgreetings';
const learningQuery = `topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings`;
const todayQuery = 'topic=greetings&category=greetings&source=today&return_to=%2F';

function completeCuratedGreetingQuiz() {
  const quiz = getQuizCategory('greetings')!;
  for (let questionNumber = 0; questionNumber < quiz.questions.length; questionNumber += 1) {
    const question = quiz.questions.find((candidate) =>
      screen.queryByText(candidate.question),
    );
    expect(question).toBeDefined();
    if (question?.type === 'multiple_choice') {
      const answerText = screen.getByText(question.correctAnswer);
      fireEvent.click(answerText.closest('button')!);
    } else {
      fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
        target: { value: question?.correctAnswer },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
    }
    fireEvent.click(screen.getByRole('button', {
      name: questionNumber === quiz.questions.length - 1
        ? 'See Results'
        : 'Next Question',
    }));
  }
}

describe('topic surface navigation', () => {
  beforeEach(() => {
    mocks.tryUse.mockReset();
    mocks.tryUse.mockResolvedValue(true);
    mocks.recordLessonExposure.mockReset();
    mocks.recordReview.mockReset();
    mocks.recordReview.mockResolvedValue({});
    mocks.saveQuizResult.mockReset();
    mocks.saveQuizResult.mockResolvedValue({});
    mocks.userId = 'user_123';
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns a topic-launched lesson to its workspace', () => {
    renderSurface(<LessonPage />, '/learn/:topicId', `/learn/greetings?${learningQuery}`, true);

    fireEvent.click(screen.getByRole('button', { name: 'Back to topic' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/learning/greetings');
  });

  it('records the exact completed lesson deck before advancing to its quiz', async () => {
    renderSurface(<LessonPage />, '/learn/:topicId', '/learn/greetings');

    fireEvent.click(screen.getByRole('button', { name: 'Start Flashcards' }));
    for (let cardNumber = 2; cardNumber <= 14; cardNumber += 1) {
      fireEvent.click(screen.getByRole('button', { name: `View card ${cardNumber}` }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Quiz' }));

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.recordLessonExposure).toHaveBeenCalledWith(
        {
          topicId: 'greetings',
          conceptIds: getCuratedDeckConceptIds('greetings'),
        },
        expect.objectContaining({
          onError: expect.any(Function),
          onSuccess: expect.any(Function),
        }),
      );
    });
  });

  it('retains and retries the exact lesson exposure after a transient failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { unmount } = renderSurface(
      <LessonPage />,
      '/learn/:topicId',
      '/learn/greetings',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Flashcards' }));
    for (let cardNumber = 2; cardNumber <= 14; cardNumber += 1) {
      fireEvent.click(screen.getByRole('button', { name: `View card ${cardNumber}` }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Quiz' }));

    await waitFor(() => expect(mocks.recordLessonExposure).toHaveBeenCalledOnce());
    const firstPayload = mocks.recordLessonExposure.mock.calls[0][0];
    act(() => {
      mocks.recordLessonExposure.mock.calls[0][1].onError(new Error('offline'));
    });

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Card activity has not saved yet');
    expect(window.localStorage.getItem(
      'hafagpt_lesson_exposure_v1_user_123_greetings',
    )).not.toBeNull();

    unmount();
    renderSurface(<LessonPage />, '/learn/:topicId', '/learn/greetings');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Card activity has not saved yet',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving card activity' }));

    expect(mocks.recordLessonExposure).toHaveBeenCalledTimes(2);
    expect(mocks.recordLessonExposure.mock.calls[1][0]).toEqual(firstPayload);
    act(() => {
      mocks.recordLessonExposure.mock.calls[1][1].onSuccess();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(
      'hafagpt_lesson_exposure_v1_user_123_greetings',
    )).toBeNull();
  });

  it('keeps a new lesson retry queue when an earlier lesson save resolves late', async () => {
    const familyPayload = {
      topicId: 'family',
      conceptIds: getCuratedDeckConceptIds('family'),
    };
    window.localStorage.setItem(
      'hafagpt_lesson_exposure_v1_user_123_family',
      JSON.stringify(familyPayload),
    );
    renderSurface(
      <>
        <LessonPage />
        <SameRouteNavigator to="/learn/family" label="Open family lesson" />
      </>,
      '/learn/:topicId',
      '/learn/greetings',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Flashcards' }));
    for (let cardNumber = 2; cardNumber <= 14; cardNumber += 1) {
      fireEvent.click(screen.getByRole('button', { name: `View card ${cardNumber}` }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Quiz' }));
    await waitFor(() => expect(mocks.recordLessonExposure).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Open family lesson' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Card activity has not saved yet',
    );
    expect(screen.getByRole('button', { name: 'Start Flashcards' })).toBeInTheDocument();

    act(() => {
      mocks.recordLessonExposure.mock.calls[0][1].onSuccess();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Card activity has not saved yet');
    expect(window.localStorage.getItem(
      'hafagpt_lesson_exposure_v1_user_123_family',
    )).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry saving card activity' }));
    expect(mocks.recordLessonExposure).toHaveBeenCalledTimes(2);
    expect(mocks.recordLessonExposure.mock.calls[1][0]).toEqual(familyPayload);
  });

  it('ignores a delayed exposure save after navigating to another lesson', () => {
    vi.useFakeTimers();
    const familyPayload = {
      topicId: 'family',
      conceptIds: getCuratedDeckConceptIds('family'),
    };
    window.localStorage.setItem(
      'hafagpt_lesson_exposure_v1_user_123_family',
      JSON.stringify(familyPayload),
    );
    renderSurface(
      <>
        <LessonPage />
        <SameRouteNavigator to="/learn/family" label="Open family lesson" />
      </>,
      '/learn/:topicId',
      '/learn/greetings',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Flashcards' }));
    for (let cardNumber = 2; cardNumber <= 14; cardNumber += 1) {
      fireEvent.click(screen.getByRole('button', { name: `View card ${cardNumber}` }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Quiz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open family lesson' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Card activity has not saved yet');
    expect(screen.getByRole('button', { name: 'Start Flashcards' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mocks.recordLessonExposure).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Card activity has not saved yet');
    expect(JSON.parse(window.localStorage.getItem(
      'hafagpt_lesson_exposure_v1_user_123_family',
    ) ?? '{}')).toEqual(familyPayload);
  });

  it('skips authenticated lesson exposure persistence for a signed-out session', async () => {
    mocks.userId = null;
    renderSurface(<LessonPage />, '/learn/:topicId', '/learn/greetings');

    fireEvent.click(screen.getByRole('button', { name: 'Start Flashcards' }));
    for (let cardNumber = 2; cardNumber <= 14; cardNumber += 1) {
      fireEvent.click(screen.getByRole('button', { name: `View card ${cardNumber}` }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Quiz' }));

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.recordLessonExposure).not.toHaveBeenCalled();
    });
    expect(
      Array.from({ length: window.localStorage.length }, (_, index) =>
        window.localStorage.key(index),
      ).some((key) => key?.startsWith('hafagpt_lesson_exposure_v1_')),
    ).toBe(false);
    expect(screen.queryByText('Card activity has not saved yet')).not.toBeInTheDocument();
  });

  it('returns topic flashcards to their workspace', async () => {
    renderSurface(<FlashcardViewer />, '/flashcards/:topic', `/flashcards/greetings?${topicQuery}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Back to Greetings & Basics' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/learning/greetings');
  });

  it('returns Today listening flashcards to Today', async () => {
    renderSurface(<FlashcardViewer />, '/flashcards/:topic', `/flashcards/greetings?${todayQuery}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Back to Today' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/');
  });

  it('opens an exact missed concept and returns to its quiz review', async () => {
    const resultId = '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678';
    const path = withConceptReview(
      'greetings',
      getCuratedConceptId('greetings', 3),
      resultId,
    );
    renderSurface(<FlashcardViewer />, '/flashcards/:topic', path);

    expect(await screen.findByText("Si Yu'os Ma'åse'")).toBeInTheDocument();
    expect(screen.getByText(/Card 4 of 14/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to quiz review' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent(
      `/quiz/review/${resultId}`,
    );
  });

  it('synchronizes the exact card when review context changes on the same route', async () => {
    const resultId = '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678';
    const firstPath = withConceptReview(
      'greetings',
      getCuratedConceptId('greetings', 0),
      resultId,
    );
    const nextPath = withConceptReview(
      'greetings',
      getCuratedConceptId('greetings', 3),
      resultId,
    );
    renderSurface(
      <>
        <FlashcardViewer />
        <SameRouteNavigator to={nextPath} />
      </>,
      '/flashcards/:topic',
      firstPath,
    );

    expect(await screen.findByText(/Card 1 of 14/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open another missed card' }));
    expect(await screen.findByText(/Card 4 of 14/)).toBeInTheDocument();
  });

  it('resets the card and flip state when same-route review context is removed', async () => {
    const resultId = '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678';
    const reviewPath = withConceptReview(
      'greetings',
      getCuratedConceptId('greetings', 3),
      resultId,
    );
    renderSurface(
      <>
        <FlashcardViewer />
        <SameRouteNavigator to="/flashcards/greetings?type=curated" label="Finish review" />
      </>,
      '/flashcards/:topic',
      reviewPath,
    );

    expect(await screen.findByText(/Card 4 of 14/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {
      name: "Show the meaning of Si Yu'os Ma'åse'",
    }));
    expect(screen.getByText('Thank you')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish review' }));

    expect(await screen.findByText(/Card 1 of 14/)).toBeInTheDocument();
    expect(screen.getByText('Håfa Adai')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('returns a topic quiz to its workspace', async () => {
    renderSurface(<QuizViewer />, '/quiz/:categoryId', `/quiz/greetings?${topicQuery}`, true);

    const back = await screen.findByRole('button', {
      name: 'Leave quiz and return to Greetings & Basics',
    });
    fireEvent.click(back);
    expect(screen.getByTestId('current-location')).toHaveTextContent('/learning/greetings');
  });

  it('returns a Today quiz to Today and saves its launch relationship', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    renderSurface(<QuizViewer />, '/quiz/:categoryId', `/quiz/greetings?${todayQuery}`);
    await screen.findByText(getQuizCategory('greetings')!.questions[0].question);

    completeCuratedGreetingQuiz();
    await waitFor(() => expect(mocks.saveQuizResult).toHaveBeenCalledOnce());
    expect(mocks.saveQuizResult.mock.calls[0][0].learning_context).toEqual({
      topic_id: 'greetings',
      source: 'today',
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back to Today' })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back to Today' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/');
  });

  it('saves exact contextual quiz evidence and uses a fresh identity on retry', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    renderSurface(
      <QuizViewer />,
      '/quiz/:categoryId',
      `/quiz/greetings?${topicQuery}`,
    );
    await screen.findByText(getQuizCategory('greetings')!.questions[0].question);

    completeCuratedGreetingQuiz();
    await waitFor(() => expect(mocks.saveQuizResult).toHaveBeenCalledOnce());
    const first = mocks.saveQuizResult.mock.calls[0][0];
    expect(first.learning_context).toEqual({
      topic_id: 'greetings',
      source: 'topic',
    });
    expect(first.answers.map((answer: { concept_id: string }) => answer.concept_id).sort())
      .toEqual(
        getQuizCategory('greetings')!.questions
          .map((question) => getQuestionConceptId(question.id))
          .sort(),
      );
    expect(first.client_attempt_id).toMatch(/^[0-9a-f-]{36}$/i);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => expect(screen.queryByText('Quiz complete')).not.toBeInTheDocument());
    completeCuratedGreetingQuiz();

    await waitFor(() => {
      expect(mocks.saveQuizResult).toHaveBeenCalledTimes(2);
      expect(mocks.saveQuizResult.mock.calls[1][0].client_attempt_id)
        .not.toBe(first.client_attempt_id);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeEnabled();
    });
  });

  it('retains a rejected quiz result and retries the exact attempt before replay', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.saveQuizResult
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({});
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { router } = renderSurface(
      <QuizViewer />,
      '/quiz/:categoryId',
      `/quiz/greetings?${topicQuery}`,
      true,
    );
    await screen.findByText(getQuizCategory('greetings')!.questions[0].question);

    completeCuratedGreetingQuiz();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Quiz result has not saved yet.',
    );
    const firstPayload = mocks.saveQuizResult.mock.calls[0][0];
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Other Quizzes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Try Dictionary Mode' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Greetings & Basics' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent(
      `/quiz/greetings?${topicQuery}`,
    );

    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByTestId('current-location')).toHaveTextContent(
      `/quiz/greetings?${topicQuery}`,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Navigation paused. Quiz result has not saved yet.',
    );
    expect(screen.getByRole('button', { name: 'Retry saving quiz result' }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry saving quiz result' }));

    await waitFor(() => expect(mocks.saveQuizResult).toHaveBeenCalledTimes(2));
    expect(mocks.saveQuizResult.mock.calls[1][0]).toEqual(firstPayload);
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeEnabled();
    });
  });

  it('returns a related story to its workspace', () => {
    renderSurface(<StoryViewer />, '/stories/:storyId', `/stories/hafa-adai-maria?${topicQuery}`, true);

    fireEvent.click(screen.getByRole('button', { name: 'Back to Greetings & Basics' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/learning/greetings');
  });

  it('returns a related scenario to its workspace', async () => {
    renderSurface(
      <ConversationPractice />,
      '/practice/:scenarioId',
      `/practice/meeting-someone?${topicQuery}`,
      true,
    );

    const back = await screen.findByRole('button', { name: 'Back to Greetings & Basics' });
    fireEvent.click(back);
    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent('/learning/greetings');
    });
  });

  it('rejects a valid topic context that does not match the lesson route', () => {
    renderSurface(
      <LessonPage />,
      '/learn/:topicId',
      `/learn/family?${learningQuery}`,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to learning path' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/learning');
  });

  it('rejects unrelated valid topic context for stories and scenarios', async () => {
    const { unmount } = renderSurface(
      <StoryViewer />,
      '/stories/:storyId',
      `/stories/i-familia-hu?${topicQuery}`,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to stories' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/stories');
    unmount();

    renderSurface(
      <ConversationPractice />,
      '/practice/:scenarioId',
      `/practice/ordering-food?${topicQuery}`,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Back to conversation scenarios' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/practice');
  });

  it('rejects topic context on unmapped flashcard and dictionary quiz surfaces', async () => {
    const { unmount } = renderSurface(
      <FlashcardViewer />,
      '/flashcards/:topic',
      `/flashcards/unmapped?type=dictionary&${topicQuery}`,
    );

    const flashcardBack = await screen.findByRole('button', { name: 'Back to flashcard decks' });
    expect(screen.queryByRole('button', { name: 'Back to Greetings & Basics' }))
      .not.toBeInTheDocument();
    fireEvent.click(flashcardBack);
    expect(screen.getByTestId('current-location')).toHaveTextContent('/flashcards');
    unmount();

    renderSurface(
      <QuizViewer />,
      '/quiz/:categoryId',
      `/quiz/dict-greetings?${topicQuery}`,
    );
    const quizBack = await screen.findByRole('button', { name: 'Leave quiz' });
    expect(screen.queryByRole('button', { name: /return to Greetings & Basics/ }))
      .not.toBeInTheDocument();
    fireEvent.click(quizBack);
    expect(screen.getByTestId('current-location')).toHaveTextContent('/quiz');
  });

  it('links dictionary flashcards and answered quiz questions to exact word records', async () => {
    const { unmount } = renderSurface(
      <FlashcardViewer />,
      '/flashcards/:topic',
      '/flashcards/unmapped?type=dictionary',
    );

    expect(await screen.findByRole('link', { name: 'Open this dictionary entry' }))
      .toHaveAttribute(
        'href',
        '/words/revised-word-v1-flashcard?return_to=%2Fflashcards%2Funmapped%3Ftype%3Ddictionary',
      );
    unmount();

    renderSurface(
      <QuizViewer />,
      '/quiz/:categoryId',
      '/quiz/dict-greetings',
    );
    fireEvent.click((await screen.findByText('One')).closest('button')!);

    expect(screen.getByRole('link', { name: 'Open dictionary entry' }))
      .toHaveAttribute(
        'href',
        '/words/revised-word-v1-quiz?return_to=%2Fquiz%2Fdict-greetings',
      );
  });

  it('keeps the legacy dictionary review identity when a stable word ID is present', async () => {
    renderSurface(
      <FlashcardViewer />,
      '/flashcards/:topic',
      '/flashcards/unmapped?type=dictionary',
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Show the meaning of Test front' }));
    fireEvent.click(screen.getByRole('button', { name: /^Good/ }));

    await waitFor(() => {
      expect(mocks.recordReview).toHaveBeenCalledWith(expect.objectContaining({
        cardId: createCardIdentity({
          sourceKind: 'dictionary',
          sourceId: 'dictionary:test',
        }),
        deckId: 'dictionary:unmapped',
        quality: 4,
      }));
    });
  });

  it('guards exact dictionary navigation while a quiz is in progress', async () => {
    renderSurface(
      <QuizViewer />,
      '/quiz/:categoryId',
      '/quiz/dict-greetings',
    );
    fireEvent.click((await screen.findByText('One')).closest('button')!);

    const confirm = vi.spyOn(window, 'confirm');
    confirm.mockReturnValueOnce(false).mockReturnValueOnce(true);
    const dictionaryLink = screen.getByRole('link', { name: 'Open dictionary entry' });

    fireEvent.click(dictionaryLink);
    expect(screen.getByTestId('current-location')).toHaveTextContent('/quiz/dict-greetings');

    fireEvent.click(dictionaryLink);
    expect(screen.getByTestId('current-location')).toHaveTextContent(
      '/words/revised-word-v1-quiz?return_to=%2Fquiz%2Fdict-greetings',
    );
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('keeps a validated topic return when quiz startup fails', async () => {
    mocks.tryUse.mockRejectedValueOnce(new Error('subscription unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderSurface(<QuizViewer />, '/quiz/:categoryId', `/quiz/greetings?${topicQuery}`);

    expect(await screen.findByText('Quiz temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Greetings & Basics' })).toHaveAttribute(
      'href',
      '/learning/greetings',
    );
    consoleError.mockRestore();
  });
});
