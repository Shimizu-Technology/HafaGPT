import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: false }),
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./hooks/useAuthLoadTimeout', () => ({
  useAuthLoadTimeout: () => false,
}));

vi.mock('./hooks/useSubscription', () => ({
  usePromoStatus: () => ({ data: null }),
}));

vi.mock('./components/BottomNav', () => ({ BottomNav: () => null }));
vi.mock('./components/ScrollToTop', () => ({ ScrollToTop: () => null }));

describe('App unknown routes', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/this-page-does-not-exist');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('explains a missing page and offers a way back instead of rendering nothing', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: "We couldn't find that page." })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Today' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Search the dictionary' })).toHaveAttribute('href', '/vocabulary');
  });
});
