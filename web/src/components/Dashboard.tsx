import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Brain,
  BookOpen,
  Trophy,
  TrendingUp,
  Flame,
  ChevronRight,
  Gamepad2,
  Star,
  Flower2,
  TreePine,
  Sparkles,
  History,
} from 'lucide-react';
import { useInitUserData } from '../hooks/useConversationsQuery';
import { useQuizStats } from '../hooks/useQuizQuery';
import { useGameStats } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { usePromoStatus } from '../hooks/useSubscription';
import { QUIZ_CATEGORIES } from '../data/quizData';
import { StreakWidget } from './StreakWidget';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { appRoutes } from '../lib/routes';

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
  const bestCategory = quizStatsData?.best_category
    ? {
        id: quizStatsData.best_category,
        percentage: Math.round(quizStatsData.best_category_percentage || 0),
        count: 1, // API doesn't return count, but we don't display it
      }
    : null;

  const bestCategoryInfo = bestCategory ? QUIZ_CATEGORIES.find((c) => c.id === bestCategory.id) : null;

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

  const SeasonalIcon = isChristmasTheme ? TreePine : isNewYearTheme ? Sparkles : Flower2;

  const stats = [
    {
      label: 'Chats',
      value: isLoading ? '…' : totalConversations,
      icon: MessageSquare,
      tone: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950/50',
    },
    {
      label: 'Quizzes',
      value: totalQuizzes,
      icon: Brain,
      tone: 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-950/50',
    },
    {
      label: 'Average quiz',
      value: totalQuizzes > 0 ? `${averageScore}%` : '—',
      icon: Trophy,
      tone: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/50',
    },
    {
      label: 'Games',
      value: totalGames,
      icon: Gamepad2,
      tone: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50',
    },
    {
      label: 'Average stars',
      value: totalGames > 0 ? averageStars.toFixed(1) : '—',
      icon: Star,
      tone: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-950/50',
    },
  ];

  const learningActions = [
    {
      to: '/chat',
      title: 'Ask HåfaGPT',
      description: 'Get help with a word or phrase',
      icon: MessageSquare,
      tone: 'text-coral-700 bg-coral-100 dark:text-teal-300 dark:bg-teal-950/50',
    },
    {
      to: '/quiz',
      title: 'Take a quiz',
      description: 'Check what you remember',
      icon: Brain,
      tone: 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-950/50',
    },
    {
      to: '/flashcards',
      title: 'Study flashcards',
      description: 'Review useful vocabulary',
      icon: BookOpen,
      tone: 'text-teal-700 bg-teal-100 dark:text-teal-300 dark:bg-teal-950/50',
    },
    {
      to: '/games',
      title: 'Play a game',
      description: 'Practice through play',
      icon: Gamepad2,
      tone: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50',
    },
  ];

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Your progress"
        subtitle="See what you have practiced and choose what to do next."
        icon={TrendingUp}
        backTo="/"
        backLabel="Back home"
        maxWidthClassName="max-w-5xl"
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:py-8">
        <section
          className={`rounded-3xl border p-5 sm:p-6 ${isChristmasTheme ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-coral-200 bg-white dark:border-ocean-800 dark:bg-slate-800'}`}
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-teal-950/50 dark:text-teal-300">
              <SeasonalIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Learning overview</p>
              <h2 className="text-lg font-bold leading-snug text-brown-950 dark:text-white sm:text-xl">
                Håfa Adai, {user?.firstName || 'Learner'}!
              </h2>
              <p className="mt-1 text-sm text-brown-500 dark:text-gray-400">Member since {memberSince}</p>
            </div>
          </div>
        </section>

        <StreakWidget />

        <section aria-labelledby="progress-summary-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">At a glance</p>
              <h2 id="progress-summary-title" className="text-xl font-bold text-brown-950 dark:text-white">
                Your activity
              </h2>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              <Link
                to="/dashboard/quiz-history"
                className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-coral-700 hover:bg-coral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-teal-300 dark:hover:bg-teal-950/30"
              >
                <History className="h-4 w-4" aria-hidden="true" /> Quiz history
              </Link>
              <Link
                to={appRoutes.gameHistory}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-coral-700 hover:bg-coral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-teal-300 dark:hover:bg-teal-950/30"
              >
                <History className="h-4 w-4" aria-hidden="true" /> Game history
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map(({ label, value, icon: Icon, tone }) => (
              <div
                key={label}
                className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-2xl font-bold text-brown-950 dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-brown-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {bestCategory && bestCategoryInfo && (
          <section
            className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
            aria-label="Best quiz category"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Strongest quiz topic
                </p>
                <p className="truncate font-bold text-brown-950 dark:text-white">{bestCategoryInfo.title}</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{bestCategory.percentage}%</p>
          </section>
        )}

        <section aria-labelledby="continue-learning-title">
          <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Keep going</p>
          <h2 id="continue-learning-title" className="mb-3 text-xl font-bold text-brown-950 dark:text-white">
            Choose your next activity
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {learningActions.map(({ to, title, description, icon: Icon, tone }) => (
              <Link
                key={to}
                to={to}
                className="group flex min-h-20 items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 hover:border-coral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700"
              >
                <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-brown-950 dark:text-white">{title}</span>
                  <span className="block text-sm text-brown-500 dark:text-gray-400">{description}</span>
                </span>
                <ChevronRight
                  className="h-5 w-5 flex-none text-brown-400 group-hover:text-coral-600 dark:text-gray-500 dark:group-hover:text-teal-300"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>

        {quizStatsData && quizStatsData.recent_results.length > 0 && (
          <section aria-labelledby="recent-quizzes-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="recent-quizzes-title" className="text-xl font-bold text-brown-950 dark:text-white">
                Recent quizzes
              </h2>
              <Link
                to="/dashboard/quiz-history"
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-coral-700 hover:bg-coral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-teal-300 dark:hover:bg-teal-950/30"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-cream-100 overflow-hidden rounded-2xl border border-cream-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
              {quizStatsData.recent_results.slice(0, 5).map((result, idx) => {
                const percentage = Math.round(result.percentage);
                const date = new Date(result.created_at);
                const isDictionary = result.category_id.startsWith('dict-');

                return (
                  <Link
                    key={idx}
                    to={`/quiz/review/${result.id}`}
                    className="group flex min-h-20 items-center justify-between gap-3 p-4 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500 dark:hover:bg-slate-700/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                        <Brain className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-brown-950 dark:text-white">
                            {result.category_title || 'Quiz'}
                          </p>
                          {isDictionary && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                              Dictionary
                            </span>
                          )}
                        </div>
                        <time className="text-xs text-brown-500 dark:text-gray-400" dateTime={result.created_at}>
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </time>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          percentage >= 80
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : percentage >= 60
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {percentage}%
                      </span>
                      <ChevronRight
                        className="h-4 w-4 text-brown-400 group-hover:text-coral-600 dark:text-gray-500 dark:group-hover:text-teal-300"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {gameStatsData && gameStatsData.recent_results.length > 0 && (
          <section aria-labelledby="recent-games-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="recent-games-title" className="text-xl font-bold text-brown-950 dark:text-white">Recent games</h2>
              <Link to={appRoutes.gameHistory} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-coral-700 hover:bg-coral-50 dark:text-teal-300 dark:hover:bg-teal-950/30">View all</Link>
            </div>
            <div className="divide-y divide-cream-100 overflow-hidden rounded-2xl border border-cream-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
              {gameStatsData.recent_results.slice(0, 5).map((result, idx) => {
                const date = new Date(result.created_at);

                return (
                  <Link key={result.id || idx} to={appRoutes.gameResult(result.id, { returnTo: '/dashboard' })} className="group flex min-h-20 items-center justify-between gap-3 p-4 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500 dark:hover:bg-slate-700/50">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-brown-950 dark:text-white">
                            {result.category_title || result.category_id}
                          </p>
                          <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-brown-600 dark:bg-slate-700 dark:text-gray-300">
                            {result.difficulty}
                          </span>
                        </div>
                        <time className="text-xs text-brown-500 dark:text-gray-400" dateTime={result.created_at}>
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {result.moves} moves
                        </time>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <div className="flex items-center gap-0.5" aria-label={`${result.stars || 0} out of 3 stars`}>
                        {[1, 2, 3].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${star <= (result.stars || 0) ? 'fill-amber-400 text-amber-400' : 'text-cream-300 dark:text-slate-600'}`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-brown-700 dark:text-gray-200">{result.score}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-none text-brown-400 group-hover:text-coral-600 dark:text-gray-500" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {totalConversations === 0 && totalQuizzes === 0 && totalGames === 0 && (
          <section className="rounded-3xl border border-coral-200 bg-white p-6 text-center dark:border-ocean-800 dark:bg-slate-800">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-teal-950/50 dark:text-teal-300">
              <Flame className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-bold text-brown-950 dark:text-white">Start your learning record</h2>
            <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">
              Complete any activity and your progress will appear here.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/chat"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                Ask a question
              </Link>
              <Link
                to="/quiz"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cream-300 bg-white px-6 font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                Take a quiz
              </Link>
            </div>
          </section>
        )}
      </main>
    </LearnerPageShell>
  );
}
