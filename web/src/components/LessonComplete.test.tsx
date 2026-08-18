import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ADVANCED_PATH } from '../data/learningPath';
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
});
