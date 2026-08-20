import { fireEvent, render, screen } from '@testing-library/react';
import { MessageCircle } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LearnerPageHeader } from './LearnerPage';

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

describe('LearnerPageHeader', () => {
  it('uses a session-specific exit handler when one is provided', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <LearnerPageHeader
          title="Maria"
          subtitle="Meeting Someone New"
          icon={MessageCircle}
          backLabel="Leave conversation"
          onBack={onBack}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Leave conversation' }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: 'Maria' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
  });

  it('renders shared progress content accessibly', () => {
    render(
      <MemoryRouter>
        <LearnerPageHeader
          title="Greetings & Basics"
          icon={MessageCircle}
          below={(
            <div
              role="progressbar"
              aria-label="Practice progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={25}
            />
          )}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('progressbar', { name: 'Practice progress' })).toHaveAttribute('aria-valuenow', '25');
  });
});
