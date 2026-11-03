import { act, render, screen, waitFor } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { adoptGuestDraft, clearTutorDrafts, GUEST_DRAFT_SCOPE, keepTutorDraft, readTutorDraft } from './lib/pendingReply';

const account = vi.hoisted(() => {
  let id: string | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => id,
    set(next: string | null) { id = next; listeners.forEach(listener => listener()); },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
});

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => {
    const id = useSyncExternalStore(account.subscribe, account.get);
    return { isLoaded: true, isSignedIn: Boolean(id), user: id ? { id } : null };
  },
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('./hooks/useAuthLoadTimeout', () => ({ useAuthLoadTimeout: () => false }));
vi.mock('./hooks/useSubscription', () => ({ usePromoStatus: () => ({ data: null }) }));
vi.mock('./components/BottomNav', () => ({ BottomNav: () => null }));
vi.mock('./components/ScrollToTop', () => ({ ScrollToTop: () => null }));
vi.mock('./components/HomePage', () => ({ HomePage: () => <h1>Home without the tutor</h1> }));

describe('guest draft and account changes away from the tutor', () => {
  beforeEach(() => { clearTutorDrafts(); account.set(null); window.history.replaceState({}, '', '/'); });
  afterEach(() => account.set(null));

  it('is not handed to a second account after the first signs out on Home', async () => {
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Translate this school notice', files: [] });
    render(<App />);
    await screen.findByRole('heading', { name: 'Home without the tutor' });
    expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('Translate this school notice');

    act(() => account.set('account-a')); // signs in on Home; the tutor is never mounted
    await waitFor(() => expect(window.sessionStorage.getItem('tutor_guest_draft')).toContain('account-a'));
    act(() => account.set(null)); // signs out on Home
    // The shell loads the draft store on demand, so clearing lands a tick later.
    await waitFor(() => expect(window.sessionStorage.getItem('tutor_guest_draft')).toBeNull());

    act(() => account.set('account-b'));
    expect(adoptGuestDraft('account-b')).toBe(false);
    expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('');
  });

  it('still lets the account that signs in adopt the draft', async () => {
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Translate this school notice', files: [] });
    render(<App />);
    await screen.findByRole('heading', { name: 'Home without the tutor' });
    act(() => account.set('account-a'));
    expect(adoptGuestDraft('account-a')).toBe(true);
  });
});
