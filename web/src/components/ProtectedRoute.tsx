import { useUser } from '@clerk/clerk-react';
import { SignIn } from '@clerk/clerk-react';
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
  Check
} from 'lucide-react';

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
      benefits: ['Memory match games', 'Track your high scores', 'Multiple difficulty levels']
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
  return {
    icon: Sparkles,
    title: 'Premium Feature',
    description: 'Sign up to unlock this feature',
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
  const location = useLocation();
  const featureInfo = getFeatureInfo(location.pathname);
  const FeatureIcon = featureInfo.icon;

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
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
        {/* Back button */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-cream-200 dark:border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-brown-600 dark:text-gray-300 hover:text-brown-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
            {/* Feature Info - Left Side */}
            <div className="w-full lg:w-1/2 lg:sticky lg:top-24">
              {/* Feature Header */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200 dark:border-slate-700 mb-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${featureInfo.color}-100 to-${featureInfo.color}-200 dark:from-${featureInfo.color}-900/30 dark:to-${featureInfo.color}-800/30 flex items-center justify-center mb-4`}>
                  <FeatureIcon className={`w-8 h-8 text-${featureInfo.color}-600 dark:text-${featureInfo.color}-400`} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-2">
                  {featureInfo.title}
                </h1>
                <p className="text-brown-600 dark:text-gray-400">
                  {featureInfo.description}
                </p>
              </div>

              {/* Benefits */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide mb-4">
                  What you'll get
                </h3>
                <ul className="space-y-3">
                  {featureInfo.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-brown-700 dark:text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Free Account Banner */}
                <div className="mt-6 p-4 bg-gradient-to-r from-coral-50 to-coral-100 dark:from-ocean-900/20 dark:to-ocean-800/20 rounded-xl border border-coral-200 dark:border-ocean-700">
                  <p className="text-sm font-medium text-coral-700 dark:text-ocean-300">
                    ✨ Creating an account is <span className="font-bold">100% free</span>
                  </p>
                  <p className="text-xs text-coral-600 dark:text-ocean-400 mt-1">
                    No credit card required. Start learning immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Sign In Form - Right Side */}
            <div className="w-full lg:w-1/2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200 dark:border-slate-700">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <span className="text-2xl">🌺</span>
                    <h2 className="text-xl font-bold text-brown-800 dark:text-white">HåfaGPT</h2>
                  </div>
                  <p className="text-sm text-brown-600 dark:text-gray-400">
                    Sign in or create a free account
                  </p>
                </div>
                
                <SignIn 
                  routing="hash"
                  signUpUrl="#/sign-up"
                  appearance={{
                    elements: {
                      rootBox: 'mx-auto w-full',
                      card: 'shadow-none border-0 p-0 bg-transparent',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      socialButtonsBlockButton: 'border border-cream-200 dark:border-slate-600',
                      formFieldInput: 'border-cream-200 dark:border-slate-600 focus:ring-coral-500 dark:focus:ring-ocean-500',
                      formButtonPrimary: 'bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700',
                      footerActionLink: 'text-coral-600 dark:text-ocean-400 hover:text-coral-700 dark:hover:text-ocean-300',
                    }
                  }}
                />
              </div>

              {/* Explore Free Content */}
              <div className="mt-4 text-center">
                <p className="text-sm text-brown-500 dark:text-gray-500">
                  Just browsing?{' '}
                  <Link to="/vocabulary" className="text-coral-600 dark:text-ocean-400 hover:underline font-medium">
                    Explore free content →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}

