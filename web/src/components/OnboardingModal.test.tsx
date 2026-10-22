import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingModal } from './OnboardingModal';

const onboardingMocks = vi.hoisted(() => ({
  completeOnboarding: vi.fn(),
  updateDailyGoal: vi.fn(),
  dismissOnboarding: vi.fn(),
}));

vi.mock('../hooks/useUserPreferences', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useUserPreferences')>('../hooks/useUserPreferences');
  return {
    ...actual,
    useUserPreferences: () => ({
      completeOnboarding: onboardingMocks.completeOnboarding,
      dismissOnboarding: onboardingMocks.dismissOnboarding,
      isUpdating: false,
    }),
  };
});

vi.mock('../hooks/useXP', () => ({
  useUpdateDailyGoal: () => ({
    mutateAsync: onboardingMocks.updateDailyGoal,
    isPending: false,
  }),
}));

function finishSteps() {
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  fireEvent.click(screen.getByRole('button', { name: /start learning/i }));
}

describe('capability onboarding', () => {
  beforeEach(() => {
    onboardingMocks.dismissOnboarding.mockReset();
    onboardingMocks.completeOnboarding.mockReset();
    onboardingMocks.completeOnboarding.mockResolvedValue(undefined);
    onboardingMocks.updateDailyGoal.mockReset();
    onboardingMocks.updateDailyGoal.mockResolvedValue(undefined);
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
    expect(onboardingMocks.updateDailyGoal).toHaveBeenCalledWith(15);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each(['Skip for now', 'Close setup', 'Escape'])('dismisses with %s offline, locally and without any writes', (action) => {
    onboardingMocks.updateDailyGoal.mockRejectedValue(new Error('offline'));
    onboardingMocks.completeOnboarding.mockRejectedValue(new Error('offline'));
    const onClose = vi.fn();
    render(<OnboardingModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /learning with a child/i }));
    if (action === 'Escape') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    else fireEvent.click(screen.getByRole('button', { name: action }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onboardingMocks.dismissOnboarding).toHaveBeenCalledOnce();
    expect(onboardingMocks.updateDailyGoal).not.toHaveBeenCalled();
    expect(onboardingMocks.completeOnboarding).not.toHaveBeenCalled();
  });

  it('keeps choices after an explicit save fails, then permits local Skip', async () => {
    onboardingMocks.updateDailyGoal.mockRejectedValueOnce(new Error('offline'));
    const onClose = vi.fn();
    render(<OnboardingModal isOpen onClose={onClose} />);
    finishSteps();
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(onboardingMocks.completeOnboarding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onboardingMocks.updateDailyGoal).toHaveBeenCalledOnce();
  });

  it('allows Skip while an explicit save is pending and starts no subsequent metadata write', async () => {
    let finishGoal!: () => void;
    onboardingMocks.updateDailyGoal.mockImplementationOnce(() => new Promise<void>(resolve => { finishGoal = resolve; }));
    const onClose = vi.fn();
    render(<OnboardingModal isOpen onClose={onClose} />);
    finishSteps();
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => finishGoal());
    expect(onboardingMocks.completeOnboarding).not.toHaveBeenCalled();
  });

  it('keeps keyboard focus inside the modal', async () => {
    render(<OnboardingModal isOpen onClose={vi.fn()} />);
    const firstChoice = screen.getByRole('button', { name: /learning for myself/i });
    await waitFor(() => expect(firstChoice).toHaveFocus());

    fireEvent.keyDown(firstChoice, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: /close setup/i })).not.toBeDisabled();
    screen.getByRole('button', { name: /close setup/i }).focus();
    fireEvent.keyDown(screen.getByRole('button', { name: /close setup/i }), { key: 'Tab', shiftKey: true });
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

  it('does not let an earlier account save close a new account onboarding', async () => {
    let finishSave: (() => void) | undefined;
    onboardingMocks.completeOnboarding.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishSave = resolve;
    }));
    const onClose = vi.fn();
    const { rerender } = render(
      <OnboardingModal isOpen onClose={onClose} accountKey="account-one" />,
    );

    finishSteps();
    await waitFor(() => expect(onboardingMocks.completeOnboarding).toHaveBeenCalledOnce());
    rerender(<OnboardingModal isOpen onClose={onClose} accountKey="account-two" />);
    await act(async () => finishSave?.());

    expect(onboardingMocks.completeOnboarding).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /learning for myself/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not let an old save close a newer session for the same account', async () => {
    let finishSave: (() => void) | undefined;
    onboardingMocks.completeOnboarding.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishSave = resolve;
    }));
    const onClose = vi.fn();
    const { rerender } = render(
      <OnboardingModal isOpen onClose={onClose} accountKey="account-a" />,
    );

    finishSteps();
    await waitFor(() => expect(onboardingMocks.completeOnboarding).toHaveBeenCalledOnce());
    rerender(<OnboardingModal isOpen onClose={onClose} accountKey="account-b" />);
    rerender(<OnboardingModal isOpen onClose={onClose} accountKey="account-a" />);
    fireEvent.click(screen.getByRole('button', { name: /learning with a child/i }));
    await act(async () => finishSave?.());

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /learning with a child/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
