import { useUser } from '@clerk/clerk-react';
import { SignIn } from '@clerk/clerk-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route wrapper that requires authentication.
 * Shows Clerk sign-in modal if user is not authenticated.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useUser();

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 dark:border-ocean-500"></div>
          <p className="mt-4 text-brown-800 dark:text-gray-200">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in page if not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-brown-800 dark:text-gray-100 mb-2">
              🌺 HåfaGPT
            </h1>
            <p className="text-brown-600 dark:text-gray-300">
              Learn Chamorro with AI - Free Forever
            </p>
          </div>
          <SignIn 
            routing="hash"
            signUpUrl="#/sign-up"
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'shadow-xl rounded-2xl',
              }
            }}
          />
          <p className="mt-6 text-center text-sm text-brown-600 dark:text-gray-400">
            Sign in to save your progress, access flashcards, and more.
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}

