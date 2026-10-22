import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserPreferences } from './useUserPreferences';
import { useSettingsDraft } from './useSettingsDraft';

const auth = vi.hoisted(() => ({ listener: null as null | ((state: { user: { id: string } | null }) => void), clerk: { addListener: vi.fn() }, user: null as null | { id: string; unsafeMetadata: Record<string, unknown>; update: ReturnType<typeof vi.fn> } }));
vi.mock('@clerk/clerk-react', () => ({ useClerk: () => auth.clerk, useUser: () => ({ user: auth.user, isLoaded: true, isSignedIn: Boolean(auth.user) }) }));
auth.clerk.addListener.mockImplementation(listener => { auth.listener = listener; return () => {}; });
let account = 0;
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  localStorage.clear();
  auth.user = { id: `continuity-${++account}`, unsafeMetadata: {}, update: vi.fn() };
});

describe('local onboarding dismissal and account boundaries', () => {
  it('suppresses future modals after Skip, offers one quiet reminder, and never writes preferences', async () => {
    const { result, rerender } = renderHook(() => useUserPreferences(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.needsOnboarding).toBe(true));
    act(() => result.current.dismissOnboarding());
    expect(result.current.needsOnboarding).toBe(false);
    expect(result.current.showOnboardingReminder).toBe(true);
    rerender();
    expect(result.current.needsOnboarding).toBe(false);
    expect(auth.user!.update).not.toHaveBeenCalled();
    act(() => result.current.dismissOnboardingReminder());
    expect(result.current.showOnboardingReminder).toBe(false);
  });
  it('still dismisses when local storage throws', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      const { result } = renderHook(() => useUserPreferences(), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.needsOnboarding).toBe(true));
      act(() => result.current.dismissOnboarding());
      expect(result.current.needsOnboarding).toBe(false);
      expect(auth.user!.update).not.toHaveBeenCalled();
    } finally { storage.mockRestore(); }
  });
  it('does not flash onboarding for an already completed account before the query settles', () => {
    auth.user!.unsafeMetadata = { onboarding_completed: true };
    const { result } = renderHook(() => useUserPreferences(), { wrapper: wrapper() });
    expect(result.current.needsOnboarding).toBe(false);
  });
  it('does not transfer skip or the reminder dismissal to another account', async () => {
    const { result, rerender } = renderHook(() => useUserPreferences(), { wrapper: wrapper() });
    act(() => result.current.dismissOnboarding());
    act(() => result.current.dismissOnboardingReminder());
    auth.user = { id: 'different-account', unsafeMetadata: {}, update: vi.fn() };
    rerender();
    await waitFor(() => expect(result.current.needsOnboarding).toBe(true));
    expect(result.current.showOnboardingReminder).toBe(false);
  });
});

describe('settings draft lifetime', () => {
  it('survives remount and warns before unload after Settings is left', () => {
    const { result, unmount } = renderHook(() => {
      const preferences = useUserPreferences();
      return useSettingsDraft(preferences.accountKey);
    }, { wrapper: wrapper() });
    act(() => result.current.updateDraft({ learner_mode: 'helping_family' }));
    unmount();
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    const returned = renderHook(() => useSettingsDraft(auth.user!.id));
    expect(returned.result.current.draft?.learner_mode).toBe('helping_family');
    act(() => returned.result.current.clearDraft());
    const afterDiscard = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(afterDiscard);
    expect(afterDiscard.defaultPrevented).toBe(false);
  });
  it('clears on sign-out and rejects late updates from a previous account', () => {
    const { result, rerender } = renderHook(() => {
      const preferences = useUserPreferences();
      return useSettingsDraft(preferences.accountKey);
    }, { wrapper: wrapper() });
    const old = result.current;
    act(() => old.updateDraft({ learner_mode: 'with_child' }));
    const original = auth.user;
    auth.user = null;
    rerender();
    act(() => old.updateDraft({ learner_mode: 'helping_family' }));
    auth.user = original;
    rerender();
    expect(result.current.draft).toBeUndefined();
  });
  it('clears a draft when sign-out happens after the preferences page unmounts', () => {
    const { result, unmount } = renderHook(() => {
      const preferences = useUserPreferences();
      return useSettingsDraft(preferences.accountKey);
    }, { wrapper: wrapper() });
    act(() => result.current.updateDraft({ learner_mode: 'with_child' }));
    unmount();
    act(() => auth.listener!({ user: null }));
    const next = renderHook(() => {
      const preferences = useUserPreferences();
      return useSettingsDraft(preferences.accountKey);
    }, { wrapper: wrapper() });
    expect(next.result.current.draft).toBeUndefined();
  });

});
