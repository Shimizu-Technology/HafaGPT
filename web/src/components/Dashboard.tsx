import { useState, useEffect } from 'react';
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
  Target,
  ChevronRight
} from 'lucide-react';
import { useInitUserData } from '../hooks/useConversationsQuery';
import { useUser } from '@clerk/clerk-react';
import { QUIZ_CATEGORIES } from '../data/quizData';

// Types for localStorage quiz data
interface QuizAttempt {
  categoryId: string;
  score: number;
  total: number;
  timestamp: number;
}

interface QuizStats {
  attempts: QuizAttempt[];
}

// Helper to get quiz stats from localStorage
function getQuizStats(): QuizStats {
  try {
    const stored = localStorage.getItem('hafagpt_quiz_stats');
    return stored ? JSON.parse(stored) : { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

// Helper to save quiz attempt
export function saveQuizAttempt(categoryId: string, score: number, total: number) {
  const stats = getQuizStats();
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
  const { data: initData, isLoading } = useInitUserData(null, isLoaded && !!user?.id);
  
  const [quizStats, setQuizStats] = useState<QuizStats>({ attempts: [] });
  
  // Load quiz stats from localStorage
  useEffect(() => {
    setQuizStats(getQuizStats());
  }, []);
  
  const conversations = initData?.conversations || [];
  const totalConversations = conversations.length;
  
  // Calculate total messages from conversations
  const totalMessages = conversations.reduce((sum, conv) => sum + (conv.message_count || 0), 0);
  
  // Calculate quiz stats
  const totalQuizzes = quizStats.attempts.length;
  const averageScore = totalQuizzes > 0 
    ? Math.round(quizStats.attempts.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / totalQuizzes)
    : 0;
  
  // Get best quiz category
  const categoryScores = quizStats.attempts.reduce((acc, attempt) => {
    if (!acc[attempt.categoryId]) {
      acc[attempt.categoryId] = { total: 0, correct: 0, count: 0 };
    }
    acc[attempt.categoryId].total += attempt.total;
    acc[attempt.categoryId].correct += attempt.score;
    acc[attempt.categoryId].count += 1;
    return acc;
  }, {} as Record<string, { total: number; correct: number; count: number }>);
  
  const bestCategory = Object.entries(categoryScores)
    .map(([id, stats]) => ({
      id,
      percentage: Math.round((stats.correct / stats.total) * 100),
      count: stats.count
    }))
    .sort((a, b) => b.percentage - a.percentage)[0];
  
  const bestCategoryInfo = bestCategory 
    ? QUIZ_CATEGORIES.find(c => c.id === bestCategory.id)
    : null;
  
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

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl">
              🌺
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              Conversations
            </p>
          </div>

          {/* Messages */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-cream-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-brown-800 dark:text-white">
              {isLoading ? '...' : totalMessages}
            </p>
            <p className="text-xs text-brown-500 dark:text-gray-400">
              Messages
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
              Quizzes Taken
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
              Quiz Average
            </p>
          </div>
        </div>

        {/* Best Category Card */}
        {bestCategoryInfo && (
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
        </div>

        {/* Recent Quiz History */}
        {quizStats.attempts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 uppercase tracking-wide px-1">
              Recent Quizzes
            </h3>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 divide-y divide-cream-100 dark:divide-slate-700">
              {quizStats.attempts.slice(-5).reverse().map((attempt, idx) => {
                const category = QUIZ_CATEGORIES.find(c => c.id === attempt.categoryId);
                const percentage = Math.round((attempt.score / attempt.total) * 100);
                const date = new Date(attempt.timestamp);
                
                return (
                  <div key={idx} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{category?.icon || '📝'}</span>
                      <div>
                        <p className="font-medium text-brown-800 dark:text-white text-sm">
                          {category?.title || 'Quiz'}
                        </p>
                        <p className="text-xs text-brown-500 dark:text-gray-400">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      percentage >= 80 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : percentage >= 60
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalConversations === 0 && totalQuizzes === 0 && (
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
            🔥 Learning streaks • 🏆 Achievements • 📊 Detailed analytics • 📚 Flashcard progress
          </p>
        </div>
      </div>
    </div>
  );
}

