import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

const auth = vi.hoisted(() => ({ isLoaded: false, user: null as null | { id: string; firstName: string } }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => auth, useClerk: () => ({}) }));
vi.mock('../hooks/useConversationsQuery', () => ({ useInitUserData: vi.fn() }));
vi.mock('../hooks/useUserPreferences', () => ({ useUserPreferences: () => ({ preferences: {}, needsOnboarding: false }) }));
vi.mock('../hooks/useHomepageData', () => ({ useHomepageData: () => ({ isLoading: true }) }));
vi.mock('../hooks/useSubscription', () => ({ useSubscription: () => ({}) }));
vi.mock('./AuthButton', () => ({ AuthButton: () => null }));
vi.mock('./TodayPlanCard', () => ({ TodayPlanCard: () => null }));
vi.mock('./OnboardingModal', () => ({ OnboardingModal: () => null }));
afterEach(() => { vi.useRealTimers(); auth.isLoaded = false; auth.user = null; });

it('never substitutes guest Home while a returning account takes longer than three seconds to resolve', () => {
  vi.useFakeTimers();
  const tree = <QueryClientProvider client={new QueryClient()}><MemoryRouter><HomePage /></MemoryRouter></QueryClientProvider>;
  const view = render(tree);
  act(() => { vi.advanceTimersByTime(5000); });
  expect(screen.queryByText('Start learning free')).not.toBeInTheDocument();
  expect(screen.queryByText('Today\'s word')).not.toBeInTheDocument();
  auth.isLoaded = true;
  auth.user = { id: 'stand-in-account', firstName: 'Learner' };
  view.rerender(<QueryClientProvider client={new QueryClient()}><MemoryRouter><HomePage /></MemoryRouter></QueryClientProvider>);
  expect(screen.getByRole('heading', { name: 'What would you like to learn today?' })).toBeInTheDocument();
  expect(screen.queryByText('Start learning free')).not.toBeInTheDocument();
});
