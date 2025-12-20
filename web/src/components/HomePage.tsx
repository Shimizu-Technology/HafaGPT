import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Brain, 
  BookOpen, 
  Book,
  BookMarked,
  Send,
  ArrowRight,
  Moon,
  Sun,
  BarChart3,
  MessagesSquare,
  Gamepad2,
  Flame,
  Trophy,
  Sparkles
} from 'lucide-react';
import { useInitUserData } from '../hooks/useConversationsQuery';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../hooks/useTheme';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useStreak } from '../hooks/useStreak';
import { DailyWord } from './DailyWord';
import { DailyWordleCard } from './DailyWordleCard';
import { AuthButton } from './AuthButton';
import { OnboardingModal } from './OnboardingModal';

export function HomePage() {
  const navigate = useNavigate();
  const { user, isLoaded: isClerkLoaded } = useUser();
  const clerk = useClerk();
  const { theme, toggleTheme } = useTheme();
  useInitUserData(null, isClerkLoaded && !!user?.id);
  const { isPremium, isPromoActive, promoEndDate, isChristmasTheme, siteTheme } = useSubscription();
  const { needsOnboarding } = useUserPreferences();
  const { streak: streakData } = useStreak();
  
  const [quickMessage, setQuickMessage] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  useEffect(() => {
    if (needsOnboarding) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [needsOnboarding]);

  const isSignedIn = !!user;
  const isAuthLoading = !isClerkLoaded;
  const showLoadingSkeleton = isAuthLoading;

  const handleQuickChat = () => {
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }
    if (quickMessage.trim()) {
      navigate(`/chat?message=${encodeURIComponent(quickMessage.trim())}`);
    } else {
      navigate('/chat');
    }
  };

  const handleSignInClick = () => {
    clerk.openSignIn();
  };

  // Loading skeleton
  if (showLoadingSkeleton) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-400 to-coral-600 flex items-center justify-center text-xl shadow-lg">
                🌺
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">HåfaGPT</h1>
              </div>
            </div>
            <div className="w-20 h-9 bg-cream-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          </div>
        </header>
        
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="h-32 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-cream-100 to-coral-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-cream-200/50 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg ${
              isChristmasTheme 
                ? 'bg-gradient-to-br from-red-500 to-green-600 christmas-glow' 
                : 'bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600'
            }`}>
              {isChristmasTheme ? '🎄' : '🌺'}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">HåfaGPT</h1>
              <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400 hidden sm:block">
                Learn Chamorro
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isSignedIn && !isPremium && (
              <Link
                to="/pricing"
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[11px] sm:text-xs font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="sm:hidden">Pro</span>
                <span className="hidden sm:inline">Upgrade</span>
              </Link>
            )}
            <AuthButton />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5 text-brown-600" /> : <Sun className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-24 sm:pb-8">
        
        {/* Promo Banner */}
        {isPromoActive && (
          <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white text-center shadow-lg ${
            siteTheme === 'christmas' 
              ? 'bg-gradient-to-r from-red-600 to-green-600' 
              : siteTheme === 'newyear'
              ? 'bg-gradient-to-r from-purple-600 to-pink-500'
              : siteTheme === 'chamorro'
              ? 'bg-gradient-to-r from-blue-600 to-red-500'
              : 'bg-gradient-to-r from-coral-500 to-teal-500 dark:from-ocean-500 dark:to-teal-600'
          }`}>
            {siteTheme === 'christmas' && (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1 left-4 text-2xl">❄</div>
                <div className="absolute top-2 right-8 text-lg">❄</div>
                <div className="absolute bottom-1 left-1/4 text-xl">❄</div>
              </div>
            )}
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <span className="text-2xl">
                {siteTheme === 'christmas' ? '🎄' : siteTheme === 'newyear' ? '🎆' : siteTheme === 'chamorro' ? '🇬🇺' : '🎉'}
              </span>
              <div>
                <p className="font-bold text-base sm:text-lg">
                  {siteTheme === 'christmas' 
                    ? 'Felis Påsgua! Holiday Gift: Unlimited Access!'
                    : siteTheme === 'newyear'
                    ? 'Happy New Year! Celebrate with Unlimited Access!'
                    : 'Special Promo: Unlimited Access!'
                  }
                </p>
                <p className="text-white/90 text-xs sm:text-sm">
                  {isSignedIn 
                    ? `Enjoy unlimited learning through ${promoEndDate ? new Date(promoEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'the promo period'}!`
                    : `Create a free account for unlimited access through ${promoEndDate ? new Date(promoEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'the promo period'}!`
                  }
                </p>
              </div>
              <span className="text-2xl">
                {siteTheme === 'christmas' ? '🎁' : siteTheme === 'newyear' ? '🥳' : siteTheme === 'chamorro' ? '🌺' : '🎊'}
              </span>
            </div>
          </div>
        )}

        {/* Hero Section - Different for signed in vs signed out */}
        {isSignedIn ? (
          /* Signed In: Personalized greeting with streak */
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-cream-200/50 dark:border-slate-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-1">
                  Håfa Adai, {user?.firstName || 'Learner'}! 👋
                </h2>
                <p className="text-brown-600 dark:text-gray-400">
                  Ready to continue your Chamorro journey?
                </p>
              </div>
              
              {/* Streak Badge */}
              {streakData && streakData.current_streak > 0 && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-4 py-3 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {streakData.current_streak}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 font-medium">
                      Day Streak
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Chat */}
            <div className="mt-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickChat()}
                  placeholder="Ask me anything in Chamorro..."
                  className="flex-1 px-4 py-3 rounded-xl bg-cream-50 dark:bg-slate-700 border border-cream-200 dark:border-slate-600 text-brown-800 dark:text-white placeholder-brown-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-coral-400 dark:focus:ring-ocean-400"
                />
                <button
                  onClick={handleQuickChat}
                  className="px-5 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-medium hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Chat</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Signed Out: Value proposition hero */
          <div className="bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 rounded-3xl p-6 sm:p-10 text-white text-center shadow-xl">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Håfa Adai! 🌺
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-2">
              Learn Chamorro with AI
            </p>
            <p className="text-white/70 mb-6 max-w-lg mx-auto">
              Your personal AI tutor for the Chamorro language. Chat, play games, take quizzes, and explore 10,000+ words.
            </p>
            <button
              onClick={handleSignInClick}
              className="px-8 py-3 bg-white text-coral-600 dark:text-ocean-600 rounded-xl font-bold text-lg hover:bg-cream-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Start Learning Free
            </button>
          </div>
        )}

        {/* Primary Actions - 3 Big Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide px-1">
            Start Learning
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AI Chat - Primary Feature */}
            <Link
              to="/chat"
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200/50 dark:border-slate-700/50 hover:shadow-xl hover:scale-[1.02] transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-coral-100 to-coral-200/50 dark:from-coral-900/20 dark:to-coral-800/10 rounded-bl-[80px] -mr-4 -mt-4" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 dark:from-coral-500 dark:to-coral-700 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-lg font-bold text-brown-800 dark:text-white mb-1">Chat with AI</h4>
                <p className="text-sm text-brown-600 dark:text-gray-400 mb-4">
                  Ask questions, get translations, learn phrases
                </p>
                <div className="flex items-center text-coral-500 dark:text-coral-400 font-medium text-sm">
                  Start chatting <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Games - Engagement Feature */}
            <Link
              to="/games"
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200/50 dark:border-slate-700/50 hover:shadow-xl hover:scale-[1.02] transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-emerald-200/50 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-bl-[80px] -mr-4 -mt-4" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Gamepad2 className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-lg font-bold text-brown-800 dark:text-white mb-1">Play Games</h4>
                <p className="text-sm text-brown-600 dark:text-gray-400 mb-4">
                  Wordle, Memory Match, Word Scramble & more
                </p>
                <div className="flex items-center text-emerald-500 dark:text-emerald-400 font-medium text-sm">
                  Play now <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Quiz - Learning Feature */}
            <Link
              to="/quiz"
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200/50 dark:border-slate-700/50 hover:shadow-xl hover:scale-[1.02] transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-purple-200/50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-bl-[80px] -mr-4 -mt-4" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-700 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-lg font-bold text-brown-800 dark:text-white mb-1">Take a Quiz</h4>
                <p className="text-sm text-brown-600 dark:text-gray-400 mb-4">
                  Test your knowledge with fun quizzes
                </p>
                <div className="flex items-center text-purple-500 dark:text-purple-400 font-medium text-sm">
                  Start quiz <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Secondary Actions - Compact Row */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide px-1">
            Explore & Practice
          </h3>
          
          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 scrollbar-hide">
            <Link
              to="/flashcards"
              className="flex-shrink-0 flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-cream-200/50 dark:border-slate-700/50 hover:shadow-lg hover:border-teal-300 dark:hover:border-teal-600 transition-all min-w-[160px] sm:min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Flashcards</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">Study vocab</p>
              </div>
            </Link>

            <Link
              to="/vocabulary"
              className="flex-shrink-0 flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-cream-200/50 dark:border-slate-700/50 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all min-w-[160px] sm:min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 flex items-center justify-center">
                <Book className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Dictionary</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">10,000+ words</p>
              </div>
            </Link>

            <Link
              to="/stories"
              className="flex-shrink-0 flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-cream-200/50 dark:border-slate-700/50 hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-600 transition-all min-w-[160px] sm:min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900/30 dark:to-orange-800/30 flex items-center justify-center">
                <BookMarked className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Stories</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">Read & learn</p>
              </div>
            </Link>

            <Link
              to="/practice"
              className="flex-shrink-0 flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-cream-200/50 dark:border-slate-700/50 hover:shadow-lg hover:border-rose-300 dark:hover:border-rose-600 transition-all min-w-[160px] sm:min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30 flex items-center justify-center">
                <MessagesSquare className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Practice</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">Conversations</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Daily Section - Compact 2-column grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide px-1">
            Today's Learning
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DailyWord compactOnMobile={false} />
            <DailyWordleCard />
          </div>
        </div>

        {/* Progress Link - Only for signed in users */}
        {isSignedIn && (
          <Link
            to="/dashboard"
            className="flex items-center justify-between p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl shadow-md border border-amber-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-brown-800 dark:text-white">View Your Progress</p>
                <p className="text-sm text-brown-600 dark:text-gray-400">
                  Stats, achievements, and learning history
                </p>
              </div>
            </div>
            <BarChart3 className="w-6 h-6 text-amber-500 dark:text-amber-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        {/* Sign in prompt for non-authenticated users */}
        {!isSignedIn && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200/50 dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-coral-900/30 dark:to-coral-800/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-coral-500 dark:text-coral-400" />
            </div>
            <h3 className="text-lg font-bold text-brown-800 dark:text-white mb-2">
              Unlock All Features
            </h3>
            <p className="text-brown-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
              Create a free account to save your progress, chat with AI, play games, and track your learning journey.
            </p>
            <button
              onClick={handleSignInClick}
              className="px-6 py-2.5 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Sign Up Free
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 mt-4 border-t border-cream-200/50 dark:border-slate-700/50">
          <Link 
            to="/about" 
            className="inline-flex items-center gap-1.5 text-sm font-medium text-coral-600 dark:text-ocean-400 hover:text-coral-700 dark:hover:text-ocean-300 transition-colors mb-4"
          >
            ❤️ Our Story — Why I built HåfaGPT
          </Link>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-0">
            <p className="text-xs text-brown-500 dark:text-gray-500">
              Built by{' '}
              <a 
                href="https://shimizu-technology.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-coral-600 dark:text-ocean-400 hover:underline font-medium"
              >
                Shimizu Technology
              </a>
            </p>
            <span className="hidden sm:inline text-brown-400 dark:text-gray-600 mx-2">•</span>
            <p className="text-xs text-brown-500 dark:text-gray-500">
              <a 
                href="https://codeschoolofguam.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-coral-600 dark:text-ocean-400 hover:underline"
              >
                Learn to code at Code School of Guam
              </a>
            </p>
          </div>
        </footer>
      </div>
      
      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </div>
  );
}
