import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ADVANCED_PATH, BEGINNER_PATH } from '../data/learningPath';
import { LessonComplete } from './LessonComplete';

describe('LessonComplete level copy', () => {
  it('labels advanced progress and completion as advanced', () => {
    const topic = ADVANCED_PATH[ADVANCED_PATH.length - 1];

    render(
      <MemoryRouter>
        <LessonComplete
          topic={topic}
          topicIndex={ADVANCED_PATH.length}
          totalTopics={ADVANCED_PATH.length}
          quizScore={80}
          onNextTopic={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Advanced Path Progress')).toBeInTheDocument();
    expect(screen.getByText("You've completed all advanced topics!")).toBeInTheDocument();
    expect(screen.queryByText(/beginner/i)).not.toBeInTheDocument();
  });

  it('offers the configured game with stable lesson context', () => {
    const topic = BEGINNER_PATH[0];

    render(
      <MemoryRouter>
        <LessonComplete
          topic={topic}
          topicIndex={1}
          totalTopics={BEGINNER_PATH.length}
          quizScore={90}
          onNextTopic={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Practice what you learned')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: `Practice ${topic.title}` })).toHaveAttribute(
      'href',
      '/games/memory?topic=greetings&category=greetings&source=lesson',
    );
  });
});
