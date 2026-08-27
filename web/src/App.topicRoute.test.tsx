import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const auth = vi.hoisted(() => ({ isSignedIn: true }));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: auth.isSignedIn }),
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
vi.mock('./components/TopicWorkspacePage', () => ({
  TopicWorkspacePage: () => <h1>Connected topic workspace</h1>,
}));

describe('App topic workspace route', () => {
  beforeEach(() => {
    auth.isSignedIn = true;
    window.history.replaceState({}, '', '/learning/greetings');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('renders the stable topic workspace for an authenticated learner', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Connected topic workspace' }))
      .toBeInTheDocument();
  });

  it('gates the stable topic workspace for a signed-out visitor', async () => {
    auth.isSignedIn = false;
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Learning Path' })).toBeInTheDocument();
    expect(screen.getByText('Follow guided Chamorro lessons and save your progress'))
      .toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Connected topic workspace' }))
      .not.toBeInTheDocument();
  });
});
