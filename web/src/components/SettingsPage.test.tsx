import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';

const settingsMocks = vi.hoisted(() => ({
  updatePreferencesAsync: vi.fn(),
  updateDailyGoal: vi.fn(),
  xpData: null as null | {
    total_xp: number;
    level: number;
    xp_progress: number;
    daily_goal_minutes: number;
  },
}));

vi.mock('../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: {
      skill_level: 'beginner',
      learning_goal: 'all',
      learner_mode: 'self',
      reading_support: 'short_text_audio',
      onboarding_completed: true,
    },
    updatePreferencesAsync: settingsMocks.updatePreferencesAsync,
    isUpdating: false,
  }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({ isChristmasTheme: false, isNewYearTheme: false }),
}));

vi.mock('../hooks/useXP', () => ({
  useXP: () => ({ data: settingsMocks.xpData, isLoading: false }),
  useUpdateDailyGoal: () => ({ mutateAsync: settingsMocks.updateDailyGoal, isPending: false }),
  getLevelInfo: () => ({ emoji: '', title: '' }),
}));

vi.mock('./AuthButton', () => ({ AuthButton: () => null }));

describe('learning preference settings', () => {
  beforeEach(() => {
    settingsMocks.updatePreferencesAsync.mockReset();
    settingsMocks.updatePreferencesAsync.mockResolvedValue(undefined);
    settingsMocks.updateDailyGoal.mockReset();
    settingsMocks.updateDailyGoal.mockResolvedValue({ daily_goal_minutes: 15 });
    settingsMocks.xpData = null;
  });

  it('keeps every capability preference editable and saves the allowlisted values', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /learning with a child/i }));
    fireEvent.click(screen.getByRole('button', { name: /audio and pictures first/i }));
    fireEvent.click(screen.getByRole('button', { name: /comfortable with chamorro/i }));
    fireEvent.click(screen.getByRole('button', { name: /culture and heritage/i }));
    fireEvent.click(screen.getByRole('button', { name: /15 minutes/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(settingsMocks.updatePreferencesAsync).toHaveBeenCalledWith({
      skill_level: 'advanced',
      learning_goal: 'culture',
      learner_mode: 'with_child',
      reading_support: 'audio_pictures',
    }));
    expect(settingsMocks.updateDailyGoal).toHaveBeenCalledWith(15);
  });

  it('does not save a divergent preference when the tracked goal cannot update', async () => {
    settingsMocks.updateDailyGoal.mockRejectedValueOnce(new Error('offline'));
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /15 minutes/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(settingsMocks.updatePreferencesAsync).not.toHaveBeenCalled();
  });

  it('restores the previous daily goal when a combined metadata save fails', async () => {
    settingsMocks.updatePreferencesAsync.mockRejectedValueOnce(new Error('clerk offline'));
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /learning with a child/i }));
    fireEvent.click(screen.getByRole('button', { name: /15 minutes/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/restored your previous daily session/i);
    expect(settingsMocks.updateDailyGoal.mock.calls).toEqual([[15], [10]]);
  });

  it('reports a possible partial save when compensating the daily goal also fails', async () => {
    settingsMocks.updatePreferencesAsync.mockRejectedValueOnce(new Error('clerk offline'));
    settingsMocks.updateDailyGoal
      .mockResolvedValueOnce({ daily_goal_minutes: 15 })
      .mockRejectedValueOnce(new Error('rollback offline'));
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /learning with a child/i }));
    fireEvent.click(screen.getByRole('button', { name: /15 minutes/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/daily session may have changed/i);
    expect(settingsMocks.updateDailyGoal.mock.calls).toEqual([[15], [10]]);
  });

  it('saves a session-only change without a second provider write', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /15 minutes/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(settingsMocks.updateDailyGoal).toHaveBeenCalledWith(15));
    expect(settingsMocks.updatePreferencesAsync).not.toHaveBeenCalled();
  });

  it('shows and preserves an explicitly disabled time goal', () => {
    settingsMocks.xpData = {
      total_xp: 0,
      level: 1,
      xp_progress: 0,
      daily_goal_minutes: 0,
    };

    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /no time goal/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });
});
