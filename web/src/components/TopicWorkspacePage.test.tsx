import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopicWorkspacePage } from './TopicWorkspacePage';

const mocks = vi.hoisted(() => ({
  useTopicWorkspace: vi.fn(),
  useTopicConversations: vi.fn(),
  useTopicActivityResults: vi.fn(),
}));

vi.mock('../hooks/useLearningPath', () => ({
  useTopicWorkspace: mocks.useTopicWorkspace,
}));

vi.mock('../hooks/useConversationsQuery', () => ({
  useTopicConversations: mocks.useTopicConversations,
}));

vi.mock('../hooks/useActivityResults', () => ({
  useTopicActivityResults: mocks.useTopicActivityResults,
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

const workspace = {
  topic: {
    id: 'greetings',
    title: 'Greetings & Basics',
    description: 'Learn greetings and introductions.',
    icon: '👋',
    estimated_minutes: 5,
    flashcard_category: 'greetings',
    quiz_category: 'greetings',
    level: 'beginner' as const,
  },
  progress: {
    topic_id: 'greetings',
    started_at: null,
    completed_at: null,
    best_quiz_score: null,
    flashcards_viewed: 0,
    last_activity_at: null,
  },
  lesson_id: 'greetings',
  flashcard_category: 'greetings',
  quiz_category: 'greetings',
  suggested_game_ids: ['memory', 'scramble'],
  scenario_ids: ['meeting-someone'],
  story_ids: ['hafa-adai-maria'],
};

function renderWorkspace(path = '/learning/greetings') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/learning/:topicId" element={<TopicWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TopicWorkspacePage', () => {
  beforeEach(() => {
    mocks.useTopicConversations.mockReturnValue({ data: [] });
    mocks.useTopicActivityResults.mockReturnValue({ data: [] });
    mocks.useTopicWorkspace.mockReturnValue({
      data: workspace,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('links recent topic results back to their stable records', () => {
    mocks.useTopicActivityResults.mockReturnValue({
      data: [
        {
          id: '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678',
          result_type: 'game',
          title: 'Greetings & Basics',
          created_at: '2026-08-28T00:00:00Z',
          score: 375,
          total: null,
          percentage: null,
          stars: 3,
        },
        {
          id: '018f6a6e-9c3d-7b2a-a1c4-8e9f12345679',
          result_type: 'quiz',
          title: 'Greetings quiz',
          created_at: '2026-08-27T00:00:00Z',
          score: 9,
          total: 10,
          percentage: 90,
          stars: null,
        },
      ],
    });

    renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Recent topic results' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Greetings & Basics/ })).toHaveAttribute(
      'href',
      '/games/results/018f6a6e-9c3d-7b2a-a1c4-8e9f12345678?return_to=%2Flearning%2Fgreetings',
    );
    expect(screen.getByRole('link', { name: /Greetings quiz/ })).toHaveAttribute(
      'href',
      '/quiz/review/018f6a6e-9c3d-7b2a-a1c4-8e9f12345679?return_to=%2Flearning%2Fgreetings',
    );
  });

  it('joins the lesson, cards, quiz, games, scenario, and story with topic return context', () => {
    renderWorkspace();

    expect(screen.getByRole('link', { name: /Start lesson/ })).toHaveAttribute(
      'href',
      '/learn/greetings?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings',
    );
    expect(screen.getByRole('link', { name: /Flashcards/ })).toHaveAttribute(
      'href',
      '/flashcards/greetings?topic=greetings&return_to=%2Flearning%2Fgreetings',
    );
    expect(screen.getByRole('link', { name: /Topic quiz/ })).toHaveAttribute(
      'href',
      '/quiz/greetings?topic=greetings&return_to=%2Flearning%2Fgreetings',
    );
    expect(screen.getByRole('link', { name: /Ask the tutor/ })).toHaveAttribute(
      'href',
      '/chat?topic=greetings&return_to=%2Flearning%2Fgreetings',
    );
    expect(screen.getByRole('link', { name: /Memory Match/ })).toHaveAttribute(
      'href',
      '/games/memory?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings',
    );
    expect(screen.getByRole('link', { name: /Meeting Someone New/ })).toHaveAttribute(
      'href',
      '/practice/meeting-someone?topic=greetings&return_to=%2Flearning%2Fgreetings',
    );
    expect(screen.getByRole('link', { name: /Hello, Maria!/ })).toHaveAttribute(
      'href',
      '/stories/hafa-adai-maria?topic=greetings&return_to=%2Flearning%2Fgreetings',
    );
  });

  it('shows bounded metadata links for recent chats without rendering messages', () => {
    mocks.useTopicConversations.mockReturnValue({
      data: [{
        id: 'conv-1',
        user_id: 'user-1',
        title: 'Practice greetings',
        created_at: '2026-08-27T00:00:00Z',
        updated_at: '2026-08-28T00:00:00Z',
        message_count: 2,
        learning_topic_id: 'greetings',
      }],
    });

    renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Recent topic chats' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Practice greetings/ })).toHaveAttribute(
      'href',
      '/chat/conv-1?topic=greetings&return_to=%2Flearning%2Fgreetings',
    );
    expect(screen.queryByText('private learner message')).not.toBeInTheDocument();
  });

  it('renders an honest empty progress state without implying mastery', () => {
    renderWorkspace();

    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/master/i)).not.toBeInTheDocument();
  });

  it('rejects an unknown topic before requesting a workspace', () => {
    renderWorkspace('/learning/not-a-topic');

    expect(screen.getByRole('heading', { name: 'Topic not found' })).toBeInTheDocument();
    expect(mocks.useTopicWorkspace).toHaveBeenCalledWith(undefined);
  });

  it('fails closed when API relationships do not match the local topic catalog', () => {
    mocks.useTopicWorkspace.mockReturnValue({
      data: { ...workspace, flashcard_category: 'family' },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Topic workspace unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Flashcards/ })).not.toBeInTheDocument();
  });
});
