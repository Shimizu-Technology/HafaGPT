import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { GamePageHeader, GameProgress, GameResult } from './GamePage';

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../TTSDisclaimer', () => ({
  TTSDisclaimer: () => <button type="button">Audio note</button>,
}));

describe('shared game page UI', () => {
  it('provides consistent navigation and speech disclosure', () => {
    render(
      <MemoryRouter>
        <GamePageHeader title="Sound Match" subtitle="Listen and choose" icon={Headphones} hasSpeech />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Sound Match' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to games' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Audio note' })).toBeInTheDocument();
  });

  it('announces progress and exposes the shared replay actions', () => {
    const onReplay = vi.fn();
    const { rerender } = render(<GameProgress current={3} total={10} score={250} streak={2} />);

    expect(screen.getByRole('region', { name: 'Round 3 of 10. Score 250.' })).toBeInTheDocument();
    expect(screen.getByText('2 in a row')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <GameResult score={850} stars={3} onReplay={onReplay} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(onReplay).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'More games' })).toHaveAttribute('href', '/games');
  });

  it('always returns to the game library instead of an unrelated history entry', () => {
    function CurrentPath() {
      return <output>{useLocation().pathname}</output>;
    }

    render(
      <MemoryRouter initialEntries={['/settings', '/games/sound-match']} initialIndex={1}>
        <GamePageHeader title="Sound Match" subtitle="Listen and choose" icon={Headphones} />
        <CurrentPath />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
    expect(screen.getByText('/games')).toBeInTheDocument();
  });

  it('returns a contextual game to its validated Today source', () => {
    function CurrentLocation() {
      const location = useLocation();
      return <output>{`${location.pathname}${location.search}`}</output>;
    }

    const contextualGame = '/games/memory?topic=greetings&category=greetings&source=today&return_to=%2F%3Fsection%3Dtoday';
    render(
      <MemoryRouter initialEntries={[contextualGame]}>
        <GamePageHeader title="Memory Match" subtitle="Pair the words" icon={Headphones} />
        <GameResult score={850} stars={3} onReplay={vi.fn()} />
        <CurrentLocation />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Back to Today' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Today' })).toHaveAttribute('href', '/?section=today');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Today' }));
    expect(screen.getByText('/?section=today')).toBeInTheDocument();
  });

  it('falls back safely when contextual return data is hostile', () => {
    render(
      <MemoryRouter initialEntries={['/games/memory?topic=greetings&category=greetings&source=today&return_to=%2F%2Fevil.example']}>
        <GameResult score={850} stars={3} onReplay={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Back to Today' })).toHaveAttribute('href', '/');
  });

  it('supports guarded navigation and a focused in-game action', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <GamePageHeader
          title="Memory Match"
          subtitle="Pair the words"
          icon={Headphones}
          onBack={onBack}
          trailing={<button type="button">Change game settings</button>}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Change game settings' })).toBeInTheDocument();
  });
});
