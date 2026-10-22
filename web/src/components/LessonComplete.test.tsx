import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ADVANCED_PATH, BEGINNER_PATH } from '../data/learningPath';
import { LessonComplete } from './LessonComplete';

describe('LessonComplete level copy', () => {
  it('names the topic destination on a topic-launched completion', () => {
    render(<MemoryRouter initialEntries={['/learn/greetings?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings']}><LessonComplete topic={BEGINNER_PATH[0]} topicIndex={1} totalTopics={7} quizScore={90} onNextTopic={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Back to Greetings & Basics' })).toHaveAttribute('href', '/learning/greetings');
    expect(screen.queryByRole('link', { name: 'Back to learning path' })).not.toBeInTheDocument();
  });
  it.each(['topic', 'today'])('ignores a valid but mismatched %s context for every completion action', source => {
    const topic = BEGINNER_PATH[1];
    const returnTo = source === 'today' ? '%2F' : '%2Flearning%2Fgreetings';
    render(<MemoryRouter initialEntries={[`/learn/${topic.id}?topic=greetings&category=greetings&source=${source}&return_to=${returnTo}`]}>
      <LessonComplete topic={topic} topicIndex={2} totalTopics={7} quizScore={90} onNextTopic={vi.fn()} />
    </MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Back to learning path' })).toHaveAttribute('href', '/learning');
    expect(screen.queryByRole('link', { name: 'Continue Today' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to Greetings & Basics' })).not.toBeInTheDocument();
    const practice = screen.getByRole('link', { name: `Practice ${topic.title}` });
    expect(practice).toHaveAttribute('href', expect.stringContaining('source=lesson&return_to=%2Flearning'));
    expect(practice.getAttribute('href')).not.toContain('today_step');
    expect(screen.getByRole('button', { name: /^Continue to / })).toBeInTheDocument();
  });
  it('does not infer all topics complete from the last topic ordinal', () => {
    const topic = ADVANCED_PATH[ADVANCED_PATH.length - 1];
    render(<MemoryRouter><LessonComplete topic={topic} topicIndex={7} totalTopics={7} completedTopics={1} quizScore={80} completionSaved onNextTopic={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText("You've completed all advanced topics!")).not.toBeInTheDocument();
    expect(screen.getByText('Advanced Path Progress: 1/7 topics completed')).toBeInTheDocument();
  });
  it('labels advanced progress and completion as advanced', () => {
    const topic = ADVANCED_PATH[ADVANCED_PATH.length - 1];

    render(
      <MemoryRouter>
        <LessonComplete
          topic={topic}
          topicIndex={ADVANCED_PATH.length}
          totalTopics={ADVANCED_PATH.length}
          quizScore={80}
          completedTopics={ADVANCED_PATH.length}
          completionSaved
          onNextTopic={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Advanced Path Progress:', { exact: false })).toBeInTheDocument();
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
      '/games/memory?topic=greetings&category=greetings&source=lesson&return_to=%2Flearning',
    );
  });

  it('keeps a Today launch connected through lesson practice', () => {
    const topic = BEGINNER_PATH[0];

    render(
      <MemoryRouter initialEntries={[
        '/learn/greetings?topic=greetings&category=greetings&source=today&return_to=%2F',
      ]}>
        <LessonComplete
          topic={topic}
          topicIndex={1}
          totalTopics={BEGINNER_PATH.length}
          quizScore={90}
          onNextTopic={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: `Practice ${topic.title}` })).toHaveAttribute(
      'href',
      expect.stringContaining('/games/memory?topic=greetings&category=greetings&source=today&return_to=%2F&today_step=use&today_day='),
    );
  });
});
