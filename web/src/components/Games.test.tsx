import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Games } from './Games';

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function renderGames(initialEntry = '/games') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Games />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('Games', () => {
  it('recommends an audio-first starting point and keeps every game available', () => {
    renderGames();

    expect(screen.getByRole('link', { name: /Play Sound Match/ })).toHaveAttribute('href', '/games/sound-match');
    expect(screen.getByText('12 games')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cultural Trivia/ })).toBeInTheDocument();
  });

  it('filters games by learning style without navigating away', () => {
    renderGames('/games#library');

    fireEvent.click(screen.getByRole('button', { name: 'Listen & tap' }));
    expect(screen.getByText('5 games')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Sound Match Hear/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Word Scramble/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Challenges' }));
    expect(screen.getByText('2 games')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chamorro Wordle/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/games?group=challenge#library');
  });

  it('restores a game group and repairs an invalid value', () => {
    const { unmount } = renderGames('/games?group=words#library');

    expect(screen.getByRole('button', { name: 'Build words' })).toHaveAttribute('aria-pressed', 'true');
    unmount();

    renderGames('/games?group=unknown&keep=yes#library');
    expect(screen.getByRole('button', { name: 'All games' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/games?keep=yes#library');
  });
});
