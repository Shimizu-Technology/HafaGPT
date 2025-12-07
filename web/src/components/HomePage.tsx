import { useState } from 'react';
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
  Gamepad2,
  Lock,
  Unlock
} from 'lucide-react';
import { useInitUserData } from '../hooks/useConversationsQuery';
import { useQuizStats } from '../hooks/useQuizQuery';
import { useGameStats } from '../hooks/useGamesQuery';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useTheme } from '../hooks/useTheme';
import { QUIZ_CATEGORIES } from '../data/quizData';
import { DailyWord } from './DailyWord';
import { DailyWordleCard } from './DailyWordleCard';
import { AuthButton } from './AuthButton';

export function HomePage() {
  const navigate = useNavigate();
  const { user, isLoaded: isClerkLoaded } = useUser();
  const clerk = useClerk();
  const { theme, toggleTheme } = useTheme();
  const { data: initData, isLoading: isDataLoading, isFetched } = useInitUserData(null, isClerkLoaded && !!user?.id);
  const { data: quizStatsData } = useQuizStats();
  const { data: gameStatsData } = useGameStats();
  
  const [quickMessage, setQuickMessage] = useState('');
  
  const conversations = initData?.conversations || [];
  const totalConversations = conversations.length;
  
  // Use API quiz stats
  const totalQuizzes = quizStatsData?.total_quizzes || 0;
  const averageScore = Math.round(quizStatsData?.average_score || 0);
  
  // Use API game stats
  const totalGames = gameStatsData?.total_games || 0;
  
  // Best category from API
  const bestCategory = quizStatsData?.best_category ? {
    id: quizStatsData.best_category,
    percentage: Math.round(quizStatsData.best_category_percentage || 0),
    count: 1
  } : null;
  
  const bestCategoryInfo = bestCategory 
    ? QUIZ_CATEGORIES.find(c => c.id === bestCategory.id)
    : null;

  // Derived states for cleaner logic
  const isSignedIn = !!user;
  
  // Check if we're still waiting for auth to load
  const isAuthLoading = !isClerkLoaded;
  
  // Check if we're waiting for user data (only relevant if signed in)
  const isUserDataLoading = isSignedIn && isDataLoading && !isFetched;
  
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
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Upgrade button for signed-in free users */}
            {isSignedIn && (
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
              className="p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5 text-brown-600 dark:text-gray-400" /> : <Sun className="w-5 h-5 text-brown-600 dark:text-gray-400" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="text-center py-2 sm:py-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-1">
            {isSignedIn ? `Håfa Adai, ${user?.firstName || 'Learner'}!` : 'Håfa Adai!'}
          </h2>
          <p className="text-sm sm:text-base text-brown-600 dark:text-gray-400">
            {isSignedIn ? 'Ready to learn Chamorro today?' : 'Start your Chamorro learning journey'}
          </p>
        </div>

        {/* What's Available Section - Only show when NOT signed in */}
        {!isSignedIn && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg border border-cream-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Free Features */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Unlock className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Explore Free</span>
                </div>
                <p className="text-xs sm:text-sm text-brown-600 dark:text-gray-400">
                  Dictionary, Stories & Daily Word
                </p>
              </div>
              
              {/* Divider */}
              <div className="hidden sm:block w-px h-12 bg-cream-200 dark:bg-slate-600" />
              <div className="sm:hidden h-px w-full bg-cream-200 dark:bg-slate-600" />
              
              {/* Sign-up Features */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-coral-500 dark:text-ocean-400" />
                  <span className="text-sm font-semibold text-coral-600 dark:text-ocean-400">Free Account</span>
                </div>
                <p className="text-xs sm:text-sm text-brown-600 dark:text-gray-400">
                  AI Chat, Games, Quizzes, Flashcards & Progress Tracking
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats - Only show on DESKTOP when signed in and data is loaded */}
        {isSignedIn && !isUserDataLoading && (totalConversations > 0 || totalQuizzes > 0 || totalGames > 0) && (
          <div className="hidden sm:grid grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow-sm border border-cream-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-coral-600 dark:text-ocean-400">
                {totalConversations}
              </p>
              <p className="text-xs text-brown-500 dark:text-gray-400">Chats</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow-sm border border-cream-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {totalQuizzes}
              </p>
              <p className="text-xs text-brown-500 dark:text-gray-400">Quizzes</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow-sm border border-cream-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalGames}
              </p>
              <p className="text-xs text-brown-500 dark:text-gray-400">Games</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow-sm border border-cream-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {totalQuizzes > 0 ? `${averageScore}%` : '-'}
              </p>
              <p className="text-xs text-brown-500 dark:text-gray-400">Avg Score</p>
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
          <div className="sm:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {/* Chat - Account Required */}
            <Link
              to="/chat"
              className="relative flex-shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-ocean-500 active:scale-95 transition-all"
            >
              {!isSignedIn && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-coral-500 dark:bg-ocean-500 rounded-full flex items-center justify-center shadow-sm">
                  <Lock className="w-2.5 h-2.5 text-white" />
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-coral-500 dark:bg-ocean-500 rounded-full flex items-center justify-center shadow-sm">
                  <Lock className="w-2.5 h-2.5 text-white" />
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-coral-500 dark:bg-ocean-500 rounded-full flex items-center justify-center shadow-sm">
                  <Lock className="w-2.5 h-2.5 text-white" />
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-emerald-500 rounded-full shadow-sm">
                  <span className="text-[8px] font-bold text-white">FREE</span>
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-emerald-500 rounded-full shadow-sm">
                  <span className="text-[8px] font-bold text-white">FREE</span>
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-coral-500 dark:bg-ocean-500 rounded-full flex items-center justify-center shadow-sm">
                  <Lock className="w-2.5 h-2.5 text-white" />
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-coral-500 dark:bg-ocean-500 rounded-full flex items-center justify-center shadow-sm">
                  <Lock className="w-2.5 h-2.5 text-white" />
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-coral-500 dark:bg-ocean-500 rounded-full shadow-sm">
                  <Lock className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-semibold text-white">Account</span>
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-coral-500 dark:bg-ocean-500 rounded-full shadow-sm">
                  <Lock className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-semibold text-white">Account</span>
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-coral-500 dark:bg-ocean-500 rounded-full shadow-sm">
                  <Lock className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-semibold text-white">Account</span>
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 rounded-full shadow-sm">
                  <span className="text-[10px] font-bold text-white">FREE</span>
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 rounded-full shadow-sm">
                  <span className="text-[10px] font-bold text-white">FREE</span>
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-coral-500 dark:bg-ocean-500 rounded-full shadow-sm">
                  <Lock className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-semibold text-white">Account</span>
                </div>
              )}
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
              {!isSignedIn && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-coral-500 dark:bg-ocean-500 rounded-full shadow-sm">
                  <Lock className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-semibold text-white">Account</span>
                </div>
              )}
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

        {/* Daily Word - Compact on mobile, full on desktop */}
        <DailyWord compactOnMobile />

        {/* Daily Wordle Card */}
        <DailyWordleCard />

        {/* Best Category - Only show on DESKTOP if user has quiz history */}
        {bestCategoryInfo && (
          <div className="hidden sm:block bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{bestCategoryInfo.icon}</span>
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Your Best Category</p>
                  <p className="font-semibold text-brown-800 dark:text-white">{bestCategoryInfo.title}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{bestCategory.percentage}%</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">{bestCategory.count} quiz{bestCategory.count !== 1 ? 'zes' : ''}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sign in prompt for non-authenticated users */}
        {!isSignedIn && (
          <div className="bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 rounded-2xl p-5 text-white text-center">
            <h3 className="text-lg font-bold mb-2">Start Learning Today!</h3>
            <p className="text-white/80 text-sm mb-4">
              Sign in to track your progress, save conversations, and unlock all features.
            </p>
            <button
              onClick={handleSignInClick}
              className="px-6 py-2.5 bg-white text-coral-600 dark:text-ocean-600 rounded-xl font-semibold hover:bg-cream-50 transition-colors"
            >
              Sign In Free
            </button>
          </div>
        )}

        {/* Footer spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}

