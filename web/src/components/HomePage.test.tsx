import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProgressSummary } from './HomePage';

describe('home progress summary', () => {
  it('shows an honest loading state instead of temporary zero progress', () => {
    render(
      <MemoryRouter>
        <ProgressSummary
          isLoading
          todayMinutes={0}
          goalMinutes={10}
          completedTopics={0}
          totalTopics={21}
          dueCards={0}
          streak={0}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Your progress' })).toBeInTheDocument();
    expect(screen.getByText('Loading your progress')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /your progress/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/0 of 10 minutes today/i)).not.toBeInTheDocument();
  });

  it('reports unavailable data instead of confirmed zeros and offers retry', () => {
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <ProgressSummary
          isLoading={false}
          hasError
          onRetry={onRetry}
          todayMinutes={0}
          goalMinutes={10}
          completedTopics={0}
          totalTopics={21}
          dueCards={0}
          streak={0}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Progress unavailable' })).toBeInTheDocument();
    expect(screen.queryByText(/0 of 10 minutes today/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
