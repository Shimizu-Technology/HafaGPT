import { Component, Suspense, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RotateCw, UserRound } from 'lucide-react';
import { lazyNamed } from '../lib/lazyNamed';

const createAccountMenu = () => lazyNamed(() => import('./AuthButton'), 'AuthButton');

// Clerk's account menu stays out of the initial bundle; phones never load it here.
// A rejected lazy component stays rejected, so Retry swaps in a fresh one.
let AccountMenu = createAccountMenu();

interface BoundaryState { hasError: boolean }

/** Keeps a failed account-menu chunk from taking the bar and page down with it. */
class AccountMenuBoundary extends Component<{ children: ReactNode; onRetry: () => void }, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const control = 'flex h-11 w-11 flex-none items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-gray-300 dark:hover:bg-slate-800';
    return (
      <>
        <Link to="/settings" aria-label="Account and settings" className={control}>
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </Link>
        <button type="button" onClick={this.props.onRetry} aria-label="Retry loading the account menu" className={control}>
          <RotateCw className="h-5 w-5" aria-hidden="true" />
        </button>
      </>
    );
  }
}

/** The app bar's account control in a fixed-width slot, so the neighbouring controls never move. */
export function AccountSlot() {
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    AccountMenu = createAccountMenu();
    setAttempt(value => value + 1);
  };
  return (
    <div data-slot="account" className="flex h-11 w-[5.5rem] flex-none items-center justify-end">
      <AccountMenuBoundary key={attempt} onRetry={retry}>
        <Suspense fallback={null}>
          <AccountMenu />
        </Suspense>
      </AccountMenuBoundary>
    </div>
  );
}
