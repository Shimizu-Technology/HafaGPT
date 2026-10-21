import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PricingPage from './PricingPage';
import { SharedConversation } from './SharedConversation';
const state = vi.hoisted(() => ({ signedIn: false, premium: false, loading: false, profile: vi.fn() }));
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isSignedIn: state.signedIn }), useClerk: () => ({ openUserProfile: state.profile }),
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
  PricingTable: () => <div>Checkout options</div>,
}));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: state.premium, isLoading: state.loading }) }));
afterEach(() => { vi.unstubAllGlobals(); state.signedIn = false; state.premium = false; state.loading = false; state.profile.mockClear(); });
function plans() { render(<MemoryRouter><PricingPage /></MemoryRouter>); return screen.getByRole('region', { name: 'Plans at a glance' }); }
function share() { render(<MemoryRouter initialEntries={['/share/test']}><Routes><Route path="/share/:shareId" element={<SharedConversation />} /></Routes></MemoryRouter>); }
describe('compact plan actions', () => {
  it('offers one signup per summary plan with truthful prices and daily limits', () => {
    const summary = plans();
    const free = within(summary).getByRole('article', { name: 'Free' });
    expect(free).toHaveTextContent('8 AI chat messages per day');
    expect(free).toHaveTextContent('10 learning games per day');
    expect(free).toHaveTextContent('5 quizzes per day');
    expect(within(free).getAllByRole('button')).toHaveLength(1);
    const premium = within(summary).getByRole('article', { name: 'Premium' });
    expect(premium).toHaveTextContent('$2.99'); expect(premium).toHaveTextContent('$23.88/year');
    expect(within(premium).getAllByRole('button')).toHaveLength(1);
  });
  it('lets an existing free account open and close checkout from the summary', () => {
    state.signedIn = true;
    plans();
    const action = screen.getByRole('button', { name: /upgrade now/i });
    expect(action).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(action);
    expect(action).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Checkout options')).toBeInTheDocument();
    fireEvent.click(action);
    expect(screen.queryByText('Checkout options')).not.toBeInTheDocument();
  });
  it('offers management to Premium accounts without selling an upgrade', () => {
    state.signedIn = true; state.premium = true;
    const summary = plans();
    fireEvent.click(within(summary).getByRole('button', { name: /manage subscription/i }));
    expect(state.profile).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /upgrade now/i })).not.toBeInTheDocument();
  });
  it('does not show a checkout action while account access is loading', () => {
    state.signedIn = true; state.loading = true;
    const summary = plans();
    expect(within(summary).getByRole('status')).toHaveTextContent(/checking/i);
    expect(screen.queryByRole('button', { name: /upgrade now/i })).not.toBeInTheDocument();
  });
});
describe('share recovery contracts', () => {
  it.each([404, 410, 403])('does not offer retry for unavailable %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status, ok: false }));
    share();
    expect(await screen.findByRole('alert')).toHaveTextContent(/ask.*sender.*fresh link/i);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to HåfaGPT' })).toHaveAttribute('href', '/');
  });
  it.each([408, 429, 500, 503])('keeps retry available for transient %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status, ok: false }));
    share();
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
