import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';

const settingsMocks = vi.hoisted(() => ({
  updatePreferencesAsync: vi.fn(),
  updateDailyGoal: vi.fn(),
}));

vi.mock('../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: {
      skill_level: 'beginner',
      learning_goal: 'all',
      learner_mode: 'self',
      reading_support: 'short_text_audio',
      daily_session_minutes: 10,
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
  useXP: () => ({ data: null, isLoading: false }),
  useUpdateDailyGoal: () => ({ mutateAsync: settingsMocks.updateDailyGoal, isPending: false }),
  getLevelInfo: () => ({ emoji: '', title: '' }),
}));

vi.mock('./AuthButton', () => ({ AuthButton: () => null }));

describe('learning preference settings', () => {
  beforeEach(() => {
    settingsMocks.updatePreferencesAsync.mockReset();
    settingsMocks.updatePreferencesAsync.mockResolvedValue(undefined);
    settingsMocks.updateDailyGoal.mockReset();
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
      daily_session_minutes: 15,
    }));
  });
});

