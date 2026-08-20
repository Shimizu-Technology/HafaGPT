import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
});
