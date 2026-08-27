import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const auth = vi.hoisted(() => ({ isSignedIn: false }));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: auth.isSignedIn }),
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./hooks/useAuthLoadTimeout', () => ({ useAuthLoadTimeout: () => false }));
vi.mock('./hooks/useSubscription', () => ({ usePromoStatus: () => ({ data: null }) }));
vi.mock('./components/BottomNav', () => ({ BottomNav: () => null }));
vi.mock('./components/ScrollToTop', () => ({ ScrollToTop: () => null }));
vi.mock('./components/Chat', () => ({ Chat: () => <h1>Stable saved conversation</h1> }));

describe('stable conversation route', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('keeps the public tutor route mounted so Chat can request record-owner sign-in', async () => {
    window.history.replaceState({}, '', '/chat/conv-1');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Stable saved conversation' }))
      .toBeInTheDocument();
  });
});
