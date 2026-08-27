import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ConversationPractice } from './ConversationPractice';
import { FlashcardViewer } from './FlashcardViewer';
import { LessonPage } from './LessonPage';
import { QuizViewer } from './QuizViewer';
import { StoryViewer } from './StoryViewer';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
  useUser: () => ({ isSignedIn: true, user: { id: 'user_123' } }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../hooks/useLearningPath', () => ({
  useUpdateProgress: () => ({ mutate: vi.fn() }),
}));

vi.mock('../hooks/useXP', () => ({
  useAwardXP: () => ({ mutate: vi.fn() }),
}));

vi.mock('../hooks/useFlashcardsQuery', () => ({
  useSaveDeck: () => ({ mutate: vi.fn(), isPending: false }),
  useDictionaryFlashcards: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useSpacedRepetition', () => ({
  useRecordReview: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useQuizQuery', () => ({
  useSaveQuizResult: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useVocabularyQuery', () => ({
  useDictionaryQuiz: () => ({
    data: null,
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
    tryUse: async () => true,
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

function renderSurface(
  component: ReactNode,
  routePath: string,
  path: string,
  withPriorHistory = false,
) {
  return render(
    <MemoryRouter
      initialEntries={withPriorHistory ? ['/unrelated', path] : [path]}
      initialIndex={withPriorHistory ? 1 : 0}
    >
      <Routes>
        <Route path={routePath} element={component} />
        <Route path="/learning/:topicId" element={null} />
        <Route path="*" element={null} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

const topicQuery = 'topic=greetings&return_to=%2Flearning%2Fgreetings';
const learningQuery = `topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings`;

describe('topic surface navigation', () => {
  it('returns a topic-launched lesson to its workspace', () => {
    renderSurface(<LessonPage />, '/learn/:topicId', `/learn/greetings?${learningQuery}`, true);

    fireEvent.click(screen.getByRole('button', { name: 'Back to topic' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/learning/greetings');
  });

  it('returns topic flashcards to their workspace', async () => {
    renderSurface(<FlashcardViewer />, '/flashcards/:topic', `/flashcards/greetings?${topicQuery}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Back to Greetings & Basics' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/learning/greetings');
  });

  it('returns a topic quiz to its workspace', async () => {
    renderSurface(<QuizViewer />, '/quiz/:categoryId', `/quiz/greetings?${topicQuery}`, true);

    const back = await screen.findByRole('button', {
      name: 'Leave quiz and return to Greetings & Basics',
    });
    fireEvent.click(back);
    expect(screen.getByTestId('current-location')).toHaveTextContent('/learning/greetings');
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
});
