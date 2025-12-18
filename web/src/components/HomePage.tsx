import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Brain, 
  BookOpen, 
  Book,
  BookMarked,
  Send,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  BarChart3,
  MessagesSquare,
  Gamepad2
} from 'lucide-react';
import { useInitUserData } from '../hooks/useConversationsQuery';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../hooks/useTheme';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { DailyWord } from './DailyWord';
import { DailyWordleCard } from './DailyWordleCard';
import { AuthButton } from './AuthButton';
import { OnboardingModal } from './OnboardingModal';
import { StreakWidget } from './StreakWidget';

export function HomePage() {
  const navigate = useNavigate();
  const { user, isLoaded: isClerkLoaded } = useUser();
  const clerk = useClerk();
  const { theme, toggleTheme } = useTheme();
  // Initialize user data (for conversations list, etc.)
  useInitUserData(null, isClerkLoaded && !!user?.id);
  const { isPremium, isPromoActive, promoEndDate, isChristmasTheme, siteTheme } = useSubscription();
  const { needsOnboarding } = useUserPreferences();
  
  const [quickMessage, setQuickMessage] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Show onboarding modal for new users who haven't completed it
  useEffect(() => {
    if (needsOnboarding) {
      // Small delay for smoother UX after sign-in
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [needsOnboarding]);

  // Derived states for cleaner logic
  const isSignedIn = !!user;
  
  // Check if we're still waiting for auth to load
  const isAuthLoading = !isClerkLoaded;
  
  // Overall loading state - show skeleton while auth is loading
  const showLoadingSkeleton = isAuthLoading;

  const handleQuickChat = () => {
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }
    // Navigate to chat with the message as a query param
    if (quickMessage.trim()) {
      navigate(`/chat?message=${encodeURIComponent(quickMessage.trim())}`);
    } else {
      navigate('/chat');
    }
  };

  const handleSignInClick = () => {
    clerk.openSignIn();
  };

  // Show loading skeleton while Clerk is loading
  if (showLoadingSkeleton) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header skeleton */}
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600 flex items-center justify-center text-xl shadow-lg">
                🌺
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">
                  HåfaGPT
                </h1>
                <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400 hidden sm:block">
                  Learn Chamorro
                </p>
              </div>
            </div>
            <div className="w-20 h-9 bg-cream-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          </div>
        </header>
        
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Welcome skeleton */}
          <div className="text-center py-2 sm:py-4">
            <div className="h-8 sm:h-10 w-64 mx-auto bg-cream-200 dark:bg-slate-700 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 mx-auto bg-cream-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          
          {/* Chat box skeleton */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg border border-cream-200 dark:border-slate-700">
            <div className="h-5 w-32 bg-cream-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
            <div className="h-12 bg-cream-100 dark:bg-slate-700 rounded-xl animate-pulse" />
          </div>
          
          {/* Daily word skeleton */}
          <div className="bg-coral-50 dark:bg-slate-800 rounded-2xl p-4 border border-coral-200 dark:border-slate-700">
            <div className="h-6 w-32 bg-coral-100 dark:bg-slate-700 rounded animate-pulse mb-4" />
            <div className="h-8 w-24 bg-coral-100 dark:bg-slate-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-20 bg-coral-100 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          
          {/* Learning cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-xl border border-cream-200 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg ${
              isChristmasTheme 
                ? 'bg-gradient-to-br from-red-500 to-green-600 christmas-glow' 
                : 'bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600'
            }`}>
              {isChristmasTheme ? '🎄' : '🌺'}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">
                HåfaGPT
              </h1>
              <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400 hidden sm:block">
                Learn Chamorro
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Upgrade button for signed-in free users only (hide for premium) */}
            {isSignedIn && !isPremium && (
              <Link
                to="/pricing"
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 text-white text-[11px] sm:text-xs font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all"
                title="Upgrade to Premium"
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
              {theme === 'light' ? <Moon className="w-5 h-5 text-brown-600 dark:text-gray-400" /> : <Sun className="w-5 h-5 text-brown-600 dark:text-gray-400" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-page-enter">
        {/* Welcome Section */}
        <div className="text-center py-2 sm:py-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-1">
            {isSignedIn ? `Håfa Adai, ${user?.firstName || 'Learner'}!` : 'Håfa Adai!'}
          </h2>
          <p className="text-sm sm:text-base text-brown-600 dark:text-gray-400">
            {isSignedIn ? 'Ready to learn Chamorro today?' : 'Start your Chamorro learning journey'}
          </p>
        </div>

        {/* Promo Banner - Theme-aware styling */}
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
            {/* Decorative elements based on theme */}
            {siteTheme === 'christmas' && (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1 left-4 text-2xl">❄</div>
                <div className="absolute top-2 right-8 text-lg">❄</div>
                <div className="absolute bottom-1 left-1/4 text-xl">❄</div>
                <div className="absolute bottom-2 right-1/3 text-lg">❄</div>
              </div>
            )}
            {siteTheme === 'newyear' && (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1 left-4 text-2xl">✨</div>
                <div className="absolute top-2 right-8 text-lg">🎊</div>
                <div className="absolute bottom-1 left-1/4 text-xl">✨</div>
                <div className="absolute bottom-2 right-1/3 text-lg">🎊</div>
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


        {/* Quick Chat Box */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg border border-cream-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
            <h3 className="font-semibold text-brown-800 dark:text-white">Ask HåfaGPT</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickChat()}
              placeholder={isSignedIn ? "How do you say 'hello' in Chamorro?" : "Sign in to start chatting..."}
              disabled={!isSignedIn}
              className="flex-1 px-4 py-3 rounded-xl bg-cream-50 dark:bg-slate-700 border border-cream-200 dark:border-slate-600 text-brown-800 dark:text-white placeholder-brown-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-coral-400 dark:focus:ring-ocean-400 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
            />
            <button
              onClick={isSignedIn ? handleQuickChat : handleSignInClick}
              className="px-4 sm:px-5 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-medium hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{isSignedIn ? 'Chat' : 'Sign In'}</span>
            </button>
          </div>
          {/* Quick suggestions - horizontal scroll on mobile */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1 sm:pb-0">
            {['How do you say hello?', 'Teach me greetings', 'Numbers 1-10'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  if (!isSignedIn) {
                    clerk.openSignIn();
                    return;
                  }
                  setQuickMessage(suggestion);
                }}
                className="flex-shrink-0 px-3 py-1.5 text-xs sm:text-sm bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-full hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Learning Actions - Horizontal scroll on mobile, grid on desktop */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide px-1">
            Start Learning
          </h3>
          
          {/* Mobile: Horizontal scrollable row */}
          <div className="sm:hidden flex gap-3 overflow-x-auto pt-3 pb-2 -mx-4 px-4 scrollbar-hide">
            {/* Chat - Account Required */}
            <Link
              to="/chat"
              className="relative flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-ocean-500 active:scale-95 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-coral-900/30 dark:to-coral-800/30 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-coral-600 dark:text-coral-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Chat</p>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">AI Tutor</p>
              </div>
            </Link>

            {/* Quiz - Account Required */}
            <Link
              to="/quiz"
              className="relative flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 active:scale-95 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                <Brain className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Quiz</p>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Test yourself</p>
              </div>
            </Link>

            {/* Flashcards - Account Required */}
            <Link
              to="/flashcards"
              className="relative flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 active:scale-95 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Flashcards</p>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Study vocab</p>
              </div>
            </Link>

            {/* Vocabulary - FREE */}
            <Link
              to="/vocabulary"
              className="relative flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 active:scale-95 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 flex items-center justify-center">
                <Book className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Vocabulary</p>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Browse words</p>
              </div>
            </Link>

            {/* Stories - FREE */}
            <Link
              to="/stories"
              className="relative flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 active:scale-95 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900/30 dark:to-orange-800/30 flex items-center justify-center">
                <BookMarked className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Stories</p>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Read & learn</p>
              </div>
            </Link>

            {/* Practice - Account Required */}
            <Link
              to="/practice"
              className="relative flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500 active:scale-95 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30 flex items-center justify-center">
                <MessagesSquare className="w-7 h-7 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Practice</p>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Conversations</p>
              </div>
            </Link>

            {/* Games - Account Required */}
            <Link
              to="/games"
              className="relative flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 active:scale-95 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 flex items-center justify-center">
                <Gamepad2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-brown-800 dark:text-white text-sm">Games</p>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Play & learn</p>
              </div>
            </Link>

            {/* Progress - Only show when signed in */}
            {isSignedIn && (
              <Link
                to="/dashboard"
                className="flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center">
                  <BarChart3 className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-brown-800 dark:text-white text-sm">Progress</p>
                  <p className="text-[10px] text-brown-500 dark:text-gray-400">Your stats</p>
                </div>
              </Link>
            )}
          </div>
          
          {/* Desktop: Grid layout */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Chat - Account Required */}
            <Link
              to="/chat"
              className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-ocean-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-coral-900/30 dark:to-coral-800/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-coral-600 dark:text-coral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brown-800 dark:text-white">Chat</p>
                <p className="text-xs text-brown-500 dark:text-gray-400 truncate">AI Tutor</p>
              </div>
              <ChevronRight className="w-5 h-5 text-brown-300 dark:text-gray-600 group-hover:text-coral-500 dark:group-hover:text-ocean-400 transition-colors" />
            </Link>

            {/* Quiz - Account Required */}
            <Link
              to="/quiz"
              className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brown-800 dark:text-white">Quiz</p>
                <p className="text-xs text-brown-500 dark:text-gray-400 truncate">Test yourself</p>
              </div>
              <ChevronRight className="w-5 h-5 text-brown-300 dark:text-gray-600 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
            </Link>

            {/* Flashcards - Account Required */}
            <Link
              to="/flashcards"
              className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brown-800 dark:text-white">Flashcards</p>
                <p className="text-xs text-brown-500 dark:text-gray-400 truncate">Study vocab</p>
              </div>
              <ChevronRight className="w-5 h-5 text-brown-300 dark:text-gray-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors" />
            </Link>

            {/* Vocabulary - FREE */}
            <Link
              to="/vocabulary"
              className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 flex items-center justify-center">
                <Book className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brown-800 dark:text-white">Vocabulary</p>
                <p className="text-xs text-brown-500 dark:text-gray-400 truncate">Browse words</p>
              </div>
              <ChevronRight className="w-5 h-5 text-brown-300 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
            </Link>

            {/* Stories - FREE */}
            <Link
              to="/stories"
              className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900/30 dark:to-orange-800/30 flex items-center justify-center">
                <BookMarked className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brown-800 dark:text-white">Stories</p>
                <p className="text-xs text-brown-500 dark:text-gray-400 truncate">Read & learn</p>
              </div>
              <ChevronRight className="w-5 h-5 text-brown-300 dark:text-gray-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
            </Link>

            {/* Practice - Account Required */}
            <Link
              to="/practice"
              className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30 flex items-center justify-center">
                <MessagesSquare className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brown-800 dark:text-white">Practice</p>
                <p className="text-xs text-brown-500 dark:text-gray-400 truncate">Conversations</p>
              </div>
              <ChevronRight className="w-5 h-5 text-brown-300 dark:text-gray-600 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
            </Link>

            {/* Games - Account Required */}
            <Link
              to="/games"
              className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brown-800 dark:text-white">Games</p>
                <p className="text-xs text-brown-500 dark:text-gray-400 truncate">Play & learn</p>
              </div>
              <ChevronRight className="w-5 h-5 text-brown-300 dark:text-gray-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
            </Link>

            {/* Progress - Only show when signed in */}
            {isSignedIn && (
              <Link
                to="/dashboard"
                className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brown-800 dark:text-white">Progress</p>
                  <p className="text-xs text-brown-500 dark:text-gray-400 truncate">Your stats</p>
                </div>
                <ChevronRight className="w-5 h-5 text-brown-300 dark:text-gray-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
              </Link>
            )}
          </div>
        </div>

        {/* Learning Streak - Only show for signed in users */}
        {user && <StreakWidget />}

        {/* Daily Word - Compact on mobile, full on desktop */}
        <DailyWord compactOnMobile />

        {/* Daily Wordle Card */}
        <DailyWordleCard />

        {/* Sign in prompt for non-authenticated users */}
        {!isSignedIn && (
          <div className={`rounded-2xl p-5 text-white text-center ${
            isChristmasTheme 
              ? 'bg-gradient-to-r from-red-600 to-green-600 christmas-glow' 
              : 'bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600'
          }`}>
            <h3 className="text-lg font-bold mb-2">
              {isChristmasTheme ? '🎁 Start Learning Today!' : 'Start Learning Today!'}
            </h3>
            <p className="text-white/80 text-sm mb-4">
              Sign in to track your progress, save conversations, and unlock all features.
            </p>
            <button
              onClick={handleSignInClick}
              className={`px-6 py-2.5 bg-white rounded-xl font-semibold hover:bg-cream-50 transition-colors ${
                isChristmasTheme ? 'text-red-600' : 'text-coral-600 dark:text-ocean-600'
              }`}
            >
              Sign In Free
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 mt-4 border-t border-cream-200/50 dark:border-slate-700/50">
          {/* Our Story link - moved from header for cleaner nav */}
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

