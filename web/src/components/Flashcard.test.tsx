import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Flashcard } from './Flashcard';

vi.mock('../hooks/useSpeech', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSpeaking: false,
    isSupported: true,
  }),
}));

describe('Flashcard', () => {
  it('can be flipped with the keyboard and reports both states', async () => {
    const user = userEvent.setup();
    const onFlip = vi.fn();
    render(<Flashcard front="Håfa Adai" back="Hello" onFlip={onFlip} />);

    const flipButton = screen.getByRole('button', { name: /show the meaning/i });
    flipButton.focus();
    await user.keyboard('{Enter}');

    expect(onFlip).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('button', { name: /show the chamorro side/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.keyboard('{Enter}');
    expect(onFlip).toHaveBeenLastCalledWith(false);
  });

  it('exposes a separate labeled pronunciation control', () => {
    render(<Flashcard front="Håfa Adai" back="Hello" />);

    expect(screen.getByRole('button', { name: 'Listen to Håfa Adai' })).toBeInTheDocument();
  });
  it('reads overflow with the keyboard on the active face and resets each new card', () => {
    const { rerender } = render(<Flashcard front="A long front" back="A long meaning" example="A useful example" />);
    const front = screen.getByTestId('flashcard-front-content');
    const back = screen.getByTestId('flashcard-back-content');
    for (const content of [front, back]) {
      Object.defineProperty(content, 'scrollHeight', { configurable: true, value: 600 });
      Object.defineProperty(content, 'clientHeight', { configurable: true, value: 100 });
    }
    const flip = screen.getByRole('button', { name: 'Show the meaning of A long front' });
    fireEvent.keyDown(flip, { key: 'PageDown' });
    expect(front.scrollTop).toBe(100);
    expect(back.scrollTop).toBe(0);
    fireEvent.click(flip);
    fireEvent.keyDown(flip, { key: 'End' });
    expect(back.scrollTop).toBe(500);
    expect(front.scrollTop).toBe(100);
    expect(flip).toHaveAccessibleDescription(/A long meaning.*A useful example/);
    fireEvent.keyDown(flip, { key: 'Home' });
    expect(back.scrollTop).toBe(0);
    rerender(<Flashcard front="Next front" back="Next meaning" />);
    expect(front.scrollTop).toBe(0);
    expect(back.scrollTop).toBe(0);
    expect(screen.getByRole('button', { name: 'Show the meaning of Next front' })).toHaveAttribute('aria-pressed', 'false');
  });

});
