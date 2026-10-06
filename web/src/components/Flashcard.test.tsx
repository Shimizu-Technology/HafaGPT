import { createEvent, fireEvent, render, screen } from '@testing-library/react';
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

  it.each(['front', 'back'] as const)('lets the page scroll at the %s face boundaries while consuming keys that move its content', face => {
    render(<Flashcard front="Long front" back="Long back" />);
    const front = screen.getByTestId('flashcard-front-content');
    const back = screen.getByTestId('flashcard-back-content');
    for (const content of [front, back]) {
      Object.defineProperty(content, 'scrollHeight', { configurable: true, value: 600 });
      Object.defineProperty(content, 'clientHeight', { configurable: true, value: 100 });
    }
    const flip = screen.getByRole('button', { name: 'Show the meaning of Long front' });
    if (face === 'back') fireEvent.click(flip);
    const active = face === 'front' ? front : back;
    const inactive = face === 'front' ? back : front;
    const key = (value: string) => {
      const event = createEvent.keyDown(flip, { key: value, cancelable: true });
      fireEvent(flip, event);
      return event.defaultPrevented;
    };

    for (const value of ['ArrowUp', 'PageUp', 'Home']) {
      expect(key(value)).toBe(false);
      expect(active.scrollTop).toBe(0);
    }
    active.scrollTop = 500;
    for (const value of ['ArrowDown', 'PageDown', 'End']) {
      expect(key(value)).toBe(false);
      expect(active.scrollTop).toBe(500);
    }
    for (const [value, expected] of [
      ['ArrowDown', 240], ['ArrowUp', 160], ['PageDown', 300],
      ['PageUp', 100], ['Home', 0], ['End', 500],
    ] as const) {
      active.scrollTop = 200;
      expect(key(value)).toBe(true);
      expect(active.scrollTop).toBe(expected);
      expect(inactive.scrollTop).toBe(0);
    }
    expect(flip).toHaveAttribute('aria-pressed', String(face === 'back'));
  });

  it.each(['pronunciation', 'example'] as const)('resets both face positions and the flip when only %s changes', field => {
    const original = { front: 'Same front', back: 'Same back', pronunciation: 'Original pronunciation', example: 'Original example' };
    const { rerender } = render(<Flashcard {...original} />);
    const front = screen.getByTestId('flashcard-front-content');
    const back = screen.getByTestId('flashcard-back-content');
    front.scrollTop = 150;
    back.scrollTop = 250;
    fireEvent.click(screen.getByRole('button', { name: 'Show the meaning of Same front' }));
    expect(screen.getByRole('button', { name: 'Show the Chamorro side for Same back' })).toHaveAttribute('aria-pressed', 'true');

    rerender(<Flashcard {...original} {...{ [field]: `Updated ${field}` }} />);

    expect(front.scrollTop).toBe(0);
    expect(back.scrollTop).toBe(0);
    expect(screen.getByRole('button', { name: 'Show the meaning of Same front' })).toHaveAttribute('aria-pressed', 'false');
  });

});
