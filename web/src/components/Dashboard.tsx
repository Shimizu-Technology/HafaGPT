import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageSquare, 
  Brain, 
  BookOpen, 
  Calendar,
  Trophy,
  TrendingUp,
  Flame,
  ChevronRight,
  Gamepad2,
  Star
} from 'lucide-react';
import { useInitUserData } from '../hooks/useConversationsQuery';
import { useQuizStats } from '../hooks/useQuizQuery';
import { useGameStats } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { usePromoStatus } from '../hooks/useSubscription';
import { QUIZ_CATEGORIES } from '../data/quizData';
import { StreakWidget } from './StreakWidget';

// Types for localStorage quiz data (fallback)
interface LocalQuizAttempt {
  categoryId: string;
  score: number;
  total: number;
  timestamp: number;
}

interface LocalQuizStats {
  attempts: LocalQuizAttempt[];
}

// Helper to get quiz stats from localStorage (fallback for offline)
function getLocalQuizStats(): LocalQuizStats {
  try {
    const stored = localStorage.getItem('hafagpt_quiz_stats');
    return stored ? JSON.parse(stored) : { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

// Helper to save quiz attempt to localStorage (always save locally too)
export function saveQuizAttempt(categoryId: string, score: number, total: number) {
  const stats = getLocalQuizStats();
  stats.attempts.push({
    categoryId,
    score,
    total,
    timestamp: Date.now()
  });
  // Keep only last 50 attempts to prevent localStorage bloat
  if (stats.attempts.length > 50) {
    stats.attempts = stats.attempts.slice(-50);
  }
  localStorage.setItem('hafagpt_quiz_stats', JSON.stringify(stats));
}

export function Dashboard() {
  const { user, isLoaded } = useUser();
  const { data: initData, isLoading: conversationsLoading } = useInitUserData(null, isLoaded && !!user?.id);
  const { data: quizStatsData, isLoading: quizLoading } = useQuizStats();
  const { data: gameStatsData, isLoading: gamesLoading } = useGameStats();
  const { data: promo } = usePromoStatus();
  const isChristmasTheme = promo?.theme === 'christmas';
  const isNewYearTheme = promo?.theme === 'newyear';
  
  const isLoading = conversationsLoading || quizLoading || gamesLoading;
  
  const conversations = initData?.conversations || [];
  const totalConversations = conversations.length;
  
  // Use API quiz stats (or 0 if not loaded yet)
  const totalQuizzes = quizStatsData?.total_quizzes || 0;
  const averageScore = Math.round(quizStatsData?.average_score || 0);
  
  // Best category from API
  const bestCategory = quizStatsData?.best_category ? {
    id: quizStatsData.best_category,
    percentage: Math.round(quizStatsData.best_category_percentage || 0),
    count: 1 // API doesn't return count, but we don't display it
  } : null;
  
  const bestCategoryInfo = bestCategory 
    ? QUIZ_CATEGORIES.find(c => c.id === bestCategory.id)
    : null;
  
  // Use API game stats
  const totalGames = gameStatsData?.total_games || 0;
  const averageStars = gameStatsData?.average_stars || 0;
  
  // Calculate streak (days with activity)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Member since date
  const memberSince = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently';

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-brown-800 dark:text-white">
                Your Progress
              </h1>
              <p className="text-xs text-brown-500 dark:text-gray-400">
                Track your Chamorro learning journey
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content - extra bottom padding on mobile for bottom nav */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20 sm:pb-6 space-y-6">
        {/* Welcome Card */}
        <div className={`rounded-2xl p-6 text-white shadow-xl ${
          isChristmasTheme 
            ? 'bg-gradient-to-br from-red-600 to-green-600' 
            : 'bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl">
              {isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                Håfa Adai, {user?.firstName || 'Learner'}!
              </h2>
              <p className="text-white/80 text-sm">
                Member since {memberSince}
              </p>
            </div>
          </div>
        </div>

        {/* Learning Streak */}
        <StreakWidget />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Conversations */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">
              {isLoading ? '...' : totalConversations}
            </p>
            <p className="text-xs text-brown-500 dark:text-gray-400">
              Chats
            </p>
          </div>

          {/* Quizzes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">
              {totalQuizzes}
            </p>
            <p className="text-xs text-brown-500 dark:text-gray-400">
              Quizzes
            </p>
          </div>

          {/* Avg Score */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">
              {totalQuizzes > 0 ? `${averageScore}%` : '-'}
            </p>
            <p className="text-xs text-brown-500 dark:text-gray-400">
              Avg Score
            </p>
          </div>

          {/* Games Played */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">
              {totalGames}
            </p>
            <p className="text-xs text-brown-500 dark:text-gray-400">
              Games
            </p>
          </div>

          {/* Avg Stars */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white flex items-center gap-1">
              {totalGames > 0 ? averageStars.toFixed(1) : '-'}
              {totalGames > 0 && <span className="text-yellow-500 text-lg">⭐</span>}
            </p>
            <p className="text-xs text-brown-500 dark:text-gray-400">
              Avg Stars
            </p>
          </div>
        </div>

        {/* Best Category Card */}
        {bestCategory && bestCategoryInfo && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-cream-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center text-2xl">
                  {bestCategoryInfo.icon}
                </div>
                <div>
                  <p className="text-xs text-brown-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                    Best Category
                  </p>
                  <p className="text-lg font-bold text-brown-800 dark:text-white">
                    {bestCategoryInfo.title}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {bestCategory.percentage}%
                </p>
                <p className="text-xs text-brown-500 dark:text-gray-400">
                  {bestCategory.count} {bestCategory.count === 1 ? 'quiz' : 'quizzes'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide px-1">
            Continue Learning
          </h3>
          
          <Link
            to="/chat"
            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-ocean-500 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-coral-100 dark:bg-coral-900/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-coral-600 dark:text-coral-400" />
              </div>
              <div>
                <p className="font-semibold text-brown-800 dark:text-white">Chat with HåfaGPT</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">Ask questions, practice phrases</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-brown-400 dark:text-gray-500 group-hover:text-coral-500 dark:group-hover:text-ocean-400 transition-colors" />
          </Link>

          <Link
            to="/quiz"
            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-ocean-500 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-brown-800 dark:text-white">Take a Quiz</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">Test your knowledge</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-brown-400 dark:text-gray-500 group-hover:text-coral-500 dark:group-hover:text-ocean-400 transition-colors" />
          </Link>

          <Link
            to="/flashcards"
            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-ocean-500 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-semibold text-brown-800 dark:text-white">Study Flashcards</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">Review vocabulary</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-brown-400 dark:text-gray-500 group-hover:text-coral-500 dark:group-hover:text-ocean-400 transition-colors" />
          </Link>

          <Link
            to="/games"
            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-ocean-500 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-brown-800 dark:text-white">Play Games</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">Memory match & more</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-brown-400 dark:text-gray-500 group-hover:text-coral-500 dark:group-hover:text-ocean-400 transition-colors" />
          </Link>
        </div>

        {/* Recent Quiz History */}
        {quizStatsData && quizStatsData.recent_results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide">
                Recent Quizzes
              </h3>
              <Link
                to="/dashboard/quiz-history"
                className="text-sm text-coral-600 dark:text-ocean-400 hover:underline font-medium"
              >
                View All
              </Link>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 divide-y divide-cream-100 dark:divide-slate-700">
              {quizStatsData.recent_results.slice(0, 5).map((result, idx) => {
                const category = QUIZ_CATEGORIES.find(c => c.id === result.category_id.replace('dict-', ''));
                const percentage = Math.round(result.percentage);
                const date = new Date(result.created_at);
                const isDictionary = result.category_id.startsWith('dict-');
                
                return (
                  <Link 
                    key={idx} 
                    to={`/quiz/review/${result.id}`}
                    className="flex items-center justify-between p-4 hover:bg-cream-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{category?.icon || '📝'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-brown-800 dark:text-white text-sm">
                            {result.category_title || category?.title || 'Quiz'}
                          </p>
                          {isDictionary && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                              Dict
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-brown-500 dark:text-gray-400">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        percentage >= 80 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : percentage >= 60
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {percentage}%
                      </div>
                      <ChevronRight className="w-4 h-4 text-brown-400 dark:text-gray-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Game History */}
        {gameStatsData && gameStatsData.recent_results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide">
                Recent Games
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 divide-y divide-cream-100 dark:divide-slate-700">
              {gameStatsData.recent_results.slice(0, 5).map((result, idx) => {
                const date = new Date(result.created_at);
                const gameIcons: Record<string, string> = {
                  memory_match: '🧩',
                  word_scramble: '🔤',
                  speed_round: '⚡',
                };
                
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{gameIcons[result.game_type] || '🎮'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-brown-800 dark:text-white text-sm">
                            {result.category_title || result.category_id}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            result.mode === 'beginner' 
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          }`}>
                            {result.mode === 'beginner' ? '🌟' : '📚'} {result.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-brown-500 dark:text-gray-400">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {result.moves} moves
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((star) => (
                          <span
                            key={star}
                            className={`text-sm ${
                              star <= (result.stars || 0) ? 'opacity-100' : 'opacity-30'
                            }`}
                          >
                            ⭐
                          </span>
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-brown-600 dark:text-gray-300">
                        {result.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalConversations === 0 && totalQuizzes === 0 && totalGames === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-coral-100 dark:bg-ocean-900/30 flex items-center justify-center">
              <Flame className="w-10 h-10 text-coral-500 dark:text-ocean-400" />
            </div>
            <h3 className="text-lg font-semibold text-brown-800 dark:text-white mb-2">
              Start Your Journey!
            </h3>
            <p className="text-brown-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Chat with HåfaGPT or take a quiz to begin tracking your Chamorro learning progress.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/chat"
                className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Start Chatting
              </Link>
              <Link
                to="/quiz"
                className="px-6 py-3 bg-white dark:bg-slate-700 text-brown-800 dark:text-white rounded-xl font-semibold border-2 border-coral-200 dark:border-ocean-600 hover:bg-coral-50 dark:hover:bg-slate-600 transition-all"
              >
                Take a Quiz
              </Link>
            </div>
          </div>
        )}

        {/* Coming Soon */}
        <div className="bg-gradient-to-r from-cream-100 to-cream-200 dark:from-slate-800 dark:to-slate-700 rounded-xl p-5 border border-cream-300 dark:border-slate-600">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
            <h3 className="font-semibold text-brown-800 dark:text-white">Coming Soon</h3>
          </div>
          <p className="text-sm text-brown-600 dark:text-gray-400">
            🏆 Achievements • 📊 Detailed analytics • 📚 Flashcard progress
          </p>
        </div>
      </div>
    </div>
  );
}

