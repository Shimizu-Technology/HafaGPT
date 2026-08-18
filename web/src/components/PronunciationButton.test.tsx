import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PronunciationButton } from './PronunciationButton';

const speech = vi.hoisted(() => ({
  speak: vi.fn(),
  stop: vi.fn(),
  isSpeaking: false,
  isPreloading: false,
  isSupported: true,
  playbackSource: null as 'reviewed' | 'generated' | 'device' | null,
  speechError: null as string | null,
}));

vi.mock('../hooks/useSpeech', () => ({ useSpeech: () => speech }));

describe('PronunciationButton', () => {
  beforeEach(() => {
    speech.speak.mockReset();
    speech.stop.mockReset();
    speech.isSpeaking = false;
    speech.isPreloading = false;
    speech.playbackSource = null;
    speech.speechError = null;
  });

  it('exposes a descriptive 44px playback control', async () => {
    const user = userEvent.setup();
    render(<PronunciationButton text="Håfa Adai" />);

    const button = screen.getByRole('button', { name: 'Listen: Håfa Adai' });
    expect(button).toHaveClass('min-h-11', 'min-w-11');
    await user.click(button);
    expect(speech.speak).toHaveBeenCalledWith('Håfa Adai');
  });

  it('labels device-voice fallback without presenting it as reviewed audio', () => {
    speech.isSpeaking = true;
    speech.playbackSource = 'device';
    render(<PronunciationButton text="Håfa Adai" showLabel />);

    expect(screen.getByText('Device voice approximation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop pronunciation for Håfa Adai' })).toBeInTheDocument();
  });
});
