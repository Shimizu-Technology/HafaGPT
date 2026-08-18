import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingModal } from './OnboardingModal';

const onboardingMocks = vi.hoisted(() => ({
  completeOnboarding: vi.fn(),
}));

vi.mock('../hooks/useUserPreferences', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useUserPreferences')>('../hooks/useUserPreferences');
  return {
    ...actual,
    useUserPreferences: () => ({
      completeOnboarding: onboardingMocks.completeOnboarding,
      isUpdating: false,
    }),
  };
});

describe('capability onboarding', () => {
  beforeEach(() => {
    onboardingMocks.completeOnboarding.mockReset();
    onboardingMocks.completeOnboarding.mockResolvedValue(undefined);
  });

  it('collects only the five capability preferences and completes without a reload', async () => {
    const onClose = vi.fn();
    render(<OnboardingModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /learning with a child/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /audio and pictures first/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /comfortable with chamorro/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /family learning/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /15 minutes/i }));
    fireEvent.click(screen.getByRole('button', { name: /start learning/i }));

    await waitFor(() => expect(onboardingMocks.completeOnboarding).toHaveBeenCalledWith({
      learner_mode: 'with_child',
      reading_support: 'audio_pictures',
      skill_level: 'advanced',
      learning_goal: 'family',
      daily_session_minutes: 15,
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('supports Skip for now with safe defaults', async () => {
    const onClose = vi.fn();
    render(<OnboardingModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    await waitFor(() => expect(onboardingMocks.completeOnboarding).toHaveBeenCalledWith({
      learner_mode: 'self',
      reading_support: 'short_text_audio',
      skill_level: 'beginner',
      learning_goal: 'all',
      daily_session_minutes: 10,
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the modal open and reports a save failure', async () => {
    onboardingMocks.completeOnboarding.mockRejectedValueOnce(new Error('offline'));
    const onClose = vi.fn();
    render(<OnboardingModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps keyboard focus inside the modal', async () => {
    render(<OnboardingModal isOpen onClose={vi.fn()} />);
    const firstChoice = screen.getByRole('button', { name: /learning for myself/i });
    await waitFor(() => expect(firstChoice).toHaveFocus());

    fireEvent.keyDown(firstChoice, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: /continue/i })).toHaveFocus();
  });

  it('clears selections before a fresh opening so preferences cannot cross accounts', async () => {
    const { rerender } = render(<OnboardingModal isOpen onClose={vi.fn()} accountKey="account-one" />);

    fireEvent.click(screen.getByRole('button', { name: /learning with a child/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /what reading support/i })).toBeInTheDocument();

    rerender(<OnboardingModal isOpen onClose={vi.fn()} accountKey="account-two" />);

    expect(screen.getByRole('heading', { name: /how will you use/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /learning for myself/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /learning with a child/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
