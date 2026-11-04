import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { RETURNING_ACCOUNT_TIMEOUT_MS } from '../lib/clerkSessionHint';
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
const clearSessionCookie = () => { document.cookie = '__client_uat=; expires=Thu, 01 Jan 1970 00:00:00 GMT'; };
afterEach(() => { vi.useRealTimers(); auth.isLoaded = false; auth.user = null; clearSessionCookie(); });

const home = () => <QueryClientProvider client={new QueryClient()}><MemoryRouter><HomePage /></MemoryRouter></QueryClientProvider>;

it.each([['no session cookie', ''], ['a signed-out session cookie', '__client_uat=0']])('shows a guest real Home before Clerk loads with %s', (_name, cookie) => {
  if (cookie) document.cookie = cookie;
  render(home());
  expect(screen.getByText('Start learning free')).toBeInTheDocument();
  expect(screen.queryByText('We could not check your sign-in')).not.toBeInTheDocument();
});

it('never substitutes guest Home while a returning account takes a long time to resolve', () => {
  document.cookie = '__client_uat=1793750000';
  vi.useFakeTimers();
  const view = render(home());
  expect(screen.getByRole('status')).toHaveTextContent('Loading your home page');
  expect(screen.queryByText('Start learning free')).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(RETURNING_ACCOUNT_TIMEOUT_MS); });
  expect(screen.getByRole('heading', { name: 'We could not check your sign-in' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.queryByText('Start learning free')).not.toBeInTheDocument();
  expect(screen.queryByText('Today\'s word')).not.toBeInTheDocument();
  auth.isLoaded = true;
  auth.user = { id: 'stand-in-account', firstName: 'Learner' };
  view.rerender(home());
  expect(screen.getByRole('heading', { name: 'What would you like to learn today?' })).toBeInTheDocument();
  expect(screen.queryByText('Start learning free')).not.toBeInTheDocument();
});
