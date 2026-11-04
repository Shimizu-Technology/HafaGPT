import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuthLoadTimeout } from '../hooks/useAuthLoadTimeout';
import { lazyNamed } from '../lib/lazyNamed';

// Only a signed-out visitor needs the gate, so its copy and previews stay out of the entry bundle.
const SignInGate = lazyNamed(() => import('./SignInGate'), 'SignInGate');

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route wrapper that requires authentication.
 * A signed-out visitor sees the sign-in gate, which previews Learn and Games read-only.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useUser();
  const authLoadTimedOut = useAuthLoadTimeout(isLoaded);

  // Show loading state while Clerk is initializing
  if (!isLoaded && !authLoadTimedOut) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-brown-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 dark:border-ocean-500"></div>
          <p className="mt-4 text-brown-800 dark:text-cream-200">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoaded && authLoadTimedOut) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream-50 px-4 pb-24 dark:bg-brown-950">
        <section className="w-full max-w-md rounded-3xl border border-cream-200 bg-white p-7 text-center dark:border-brown-700 dark:bg-brown-900" role="alert">
          <h1 className="text-2xl font-bold tracking-tight text-brown-900 dark:text-cream-100">We could not check your sign-in</h1>
          <p className="mt-3 text-sm leading-relaxed text-brown-600 dark:text-brown-100">
            This browser is taking too long to read its saved account state. Your account and learning progress are safe.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void window.__hafagptRecoverStaleBuild?.()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-4 py-2.5 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Repair and reload
            </button>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cream-300 px-4 py-2.5 text-sm font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-brown-600 dark:text-cream-100 dark:hover:bg-brown-700"
            >
              Return home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!isSignedIn) return <SignInGate />;

  // User is authenticated, render the protected content
  return <>{children}</>;
}
