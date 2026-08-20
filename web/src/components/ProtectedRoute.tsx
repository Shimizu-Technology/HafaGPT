import { useUser, SignInButton, SignUpButton } from '@clerk/clerk-react';
import { useLocation, Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Brain, 
  BookOpen, 
  MessagesSquare, 
  Gamepad2,
  BarChart3,
  ArrowLeft,
  Sparkles,
  Check,
  LogIn,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { usePromoStatus } from '../hooks/useSubscription';
import { useAuthLoadTimeout } from '../hooks/useAuthLoadTimeout';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Feature info based on the current route
const getFeatureInfo = (pathname: string) => {
  if (pathname.startsWith('/chat')) {
    return {
      icon: MessageSquare,
      title: 'AI Chat',
      description: 'Have conversations with our Chamorro AI tutor',
      color: 'coral',
      benefits: ['Ask questions in English or Chamorro', 'Get instant translations', 'Learn grammar & pronunciation']
    };
  }
  if (pathname.startsWith('/learning') || pathname.startsWith('/learn/')) {
    return {
      icon: BookOpen,
      title: 'Learning Path',
      description: 'Follow guided Chamorro lessons and save your progress',
      color: 'teal',
      benefits: ['21 guided lessons', 'Learn at your own pace', 'Save your progress']
    };
  }
  if (pathname.startsWith('/quiz')) {
    return {
      icon: Brain,
      title: 'Quizzes',
      description: 'Test your Chamorro knowledge',
      color: 'purple',
      benefits: ['Multiple quiz categories', 'Track your scores', 'Review your answers']
    };
  }
  if (pathname.startsWith('/flashcards')) {
    return {
      icon: BookOpen,
      title: 'Flashcards',
      description: 'Study vocabulary with flashcards',
      color: 'teal',
      benefits: ['Curated word categories', 'Create custom decks', 'Track progress']
    };
  }
  if (pathname.startsWith('/practice')) {
    return {
      icon: MessagesSquare,
      title: 'Conversation Practice',
      description: 'Practice real Chamorro conversations',
      color: 'rose',
      benefits: ['Role-play scenarios', 'AI conversation partner', 'Get feedback on your responses']
    };
  }
  if (pathname.startsWith('/games')) {
    return {
      icon: Gamepad2,
      title: 'Learning Games',
      description: 'Learn Chamorro through fun games',
      color: 'emerald',
      benefits: ['Action games like Falling Words', 'Memory match & word puzzles', 'Track high scores & compete']
    };
  }
  if (pathname.startsWith('/dashboard')) {
    return {
      icon: BarChart3,
      title: 'Your Progress',
      description: 'Track your learning journey',
      color: 'amber',
      benefits: ['View your stats', 'See quiz history', 'Track improvement over time']
    };
  }
  if (pathname.startsWith('/settings')) {
    return {
      icon: Sparkles,
      title: 'Settings',
      description: 'Personalize your HåfaGPT learning experience',
      color: 'coral',
      benefits: ['Choose your learning level', 'Set language preferences', 'Manage your account']
    };
  }
  return {
    icon: Sparkles,
    title: 'Account Feature',
    description: 'Sign in to save your progress and preferences',
    color: 'coral',
    benefits: ['Full access to all features', 'Save your progress', 'Track your learning']
  };
};

/**
 * Protected route wrapper that requires authentication.
 * Shows a compelling sign-up page if user is not authenticated.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useUser();
  const authLoadTimedOut = useAuthLoadTimeout(isLoaded);
  const location = useLocation();
  const featureInfo = getFeatureInfo(location.pathname);
  const FeatureIcon = featureInfo.icon;
  const { data: promo } = usePromoStatus();
  const isChristmasTheme = promo?.theme === 'christmas';
  const isNewYearTheme = promo?.theme === 'newyear';

  // Show loading state while Clerk is initializing
  if (!isLoaded && !authLoadTimedOut) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 dark:border-ocean-500"></div>
          <p className="mt-4 text-brown-800 dark:text-gray-200">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoaded && authLoadTimedOut) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream-50 px-4 pb-24 dark:bg-slate-900">
        <section className="w-full max-w-md rounded-3xl border border-cream-200 bg-white p-7 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800" role="alert">
          <h1 className="text-2xl font-bold tracking-tight text-brown-900 dark:text-white">We could not check your sign-in</h1>
          <p className="mt-3 text-sm leading-relaxed text-brown-600 dark:text-gray-300">
            This browser is taking too long to read its saved account state. Your account and learning progress are safe.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void window.__hafagptRecoverStaleBuild?.()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-ocean-500 dark:hover:bg-ocean-600"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Repair and reload
            </button>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cream-300 px-4 py-2.5 text-sm font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
            >
              Return home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Show sign-in page if not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
        {/* Back button */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-cream-200 dark:border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-3 safe-area-top">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-brown-600 dark:text-gray-300 hover:text-brown-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          {/* Feature Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl border border-cream-200 dark:border-slate-700">
            {/* Logo & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="text-3xl">{isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}</span>
                <span className="text-2xl font-bold text-brown-800 dark:text-white">HåfaGPT</span>
              </div>
            </div>

            {/* Feature Info */}
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-ocean-900/50 dark:to-ocean-800/50 flex items-center justify-center mb-4`}>
                <FeatureIcon className="w-8 h-8 text-coral-600 dark:text-ocean-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-2">
                  {featureInfo.title}
                </h1>
                <p className="text-brown-600 dark:text-gray-400">
                  {featureInfo.description}
                </p>
              </div>

              {/* Benefits */}
            <div className="bg-cream-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
              <ul className="space-y-2">
                  {featureInfo.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    <span className="text-sm text-brown-700 dark:text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
            </div>

            {/* CTA Section */}
            <div className="space-y-3">
              <p className="text-center text-sm text-brown-600 dark:text-gray-400 mb-4">
                Sign in to access <span className="font-semibold">{featureInfo.title}</span>
              </p>

              {/* Primary CTA - Sign Up */}
              <SignUpButton mode="modal">
                <button className="w-full py-3.5 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Create Free Account
                </button>
              </SignUpButton>

              {/* Secondary CTA - Sign In */}
              <SignInButton mode="modal">
                <button className="w-full py-3 border-2 border-coral-300 dark:border-ocean-500 text-coral-600 dark:text-ocean-400 hover:bg-coral-50 dark:hover:bg-ocean-900/30 rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Already have an account? Sign In
                </button>
              </SignInButton>

              {/* Free Account Note */}
              <p className="text-center text-xs text-brown-500 dark:text-gray-500 pt-2">
                ✨ 100% free • No credit card required
                  </p>
                </div>
              </div>

              {/* Explore Free Content */}
          <div className="mt-6 text-center">
                <p className="text-sm text-brown-500 dark:text-gray-500">
                  Just browsing?{' '}
                  <Link to="/vocabulary" className="text-coral-600 dark:text-ocean-400 hover:underline font-medium">
                    Explore free content →
                  </Link>
                </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
