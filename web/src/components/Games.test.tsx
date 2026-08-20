import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Games } from './Games';

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

describe('Games', () => {
  it('recommends an audio-first starting point and keeps every game available', () => {
    render(<MemoryRouter><Games /></MemoryRouter>);

    expect(screen.getByRole('link', { name: /Play Sound Match/ })).toHaveAttribute('href', '/games/sound-match');
    expect(screen.getByText('12 games')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cultural Trivia/ })).toBeInTheDocument();
  });

  it('filters games by learning style without navigating away', () => {
    render(<MemoryRouter><Games /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Listen & tap' }));
    expect(screen.getByText('5 games')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Sound Match Hear/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Word Scramble/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Challenges' }));
    expect(screen.getByText('2 games')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chamorro Wordle/ })).toBeInTheDocument();
  });
});
