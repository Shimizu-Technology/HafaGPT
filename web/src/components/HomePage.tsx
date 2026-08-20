import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Book,
  BookMarked,
  Brain,
  Flame,
  Gamepad2,
  GraduationCap,
  Languages,
  Layers,
  MessageCircle,
  MessagesSquare,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useInitUserData } from '../hooks/useConversationsQuery';
import { useHomepageData } from '../hooks/useHomepageData';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../hooks/useTheme';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useAuthLoadTimeout } from '../hooks/useAuthLoadTimeout';
import { buildTodayPlan } from '../lib/todayPlan';
import { getHomepageSectionAvailability } from '../lib/homepageAvailability';
import { DEFAULT_DAILY_SESSION_MINUTES } from '../data/learningPreferences';
import { AuthButton } from './AuthButton';
import { OnboardingModal } from './OnboardingModal';
import { TodayPlanCard } from './TodayPlanCard';

const EXPLORE_ITEMS = [
  { to: '/learning', label: 'Lessons', description: 'Follow a guided path', icon: GraduationCap, tone: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950/50' },
  { to: '/stories', label: 'Stories', description: 'Read and listen', icon: BookMarked, tone: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/50' },
  { to: '/flashcards', label: 'Flashcards', description: 'Build vocabulary', icon: Layers, tone: 'text-teal-700 bg-teal-100 dark:text-teal-300 dark:bg-teal-950/50' },
  { to: '/quiz', label: 'Quizzes', description: 'Check understanding', icon: Brain, tone: 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-950/50' },
  { to: '/practice', label: 'Speaking', description: 'Practice conversations', icon: MessagesSquare, tone: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/50' },
  { to: '/games', label: 'Games', description: 'Learn through play', icon: Gamepad2, tone: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50' },
] as const;

function HomeHeader({ signedIn }: { signedIn: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const { isChristmasTheme, isNewYearTheme } = useSubscription();

  return (
    <header className="sticky top-0 z-30 border-b border-cream-200/80 bg-cream-50/95 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
      <div className="safe-area-top mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-coral-600 text-lg text-white shadow-sm dark:bg-ocean-500" aria-hidden="true">
            {isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}
          </span>
          <span>
            <span className="block text-lg font-bold leading-tight text-brown-950 dark:text-white">HåfaGPT</span>
            <span className="hidden text-xs text-brown-500 dark:text-gray-400 sm:block">Learn Chamorro with confidence</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {signedIn && (
            <Link
              to="/settings"
              aria-label="Learning settings"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-gray-300 dark:hover:bg-slate-800"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
          </button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

function UtilityLinks() {
  return (
    <section aria-labelledby="utility-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Quick help</p>
          <h2 id="utility-heading" className="mt-0.5 text-xl font-bold text-brown-950 dark:text-white">Ask, translate, or look up a word</h2>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300">
              <Languages className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-brown-900 dark:text-white">Ask or translate</h3>
              <p className="mt-1 text-sm text-brown-600 dark:text-gray-300">Get help with a school message, phrase, or Chamorro question.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/chat?intent=translate" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-coral-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-ocean-500 dark:hover:bg-ocean-600">
              Translate
            </Link>
            <Link to="/chat?intent=ask" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
              Ask a question
            </Link>
          </div>
        </div>

        <Link
          to="/vocabulary"
          className="group flex min-h-36 items-center gap-4 rounded-2xl border border-cream-200 bg-white p-4 hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20 sm:p-5"
        >
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Search className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-brown-900 dark:text-white">Dictionary</span>
            <span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">Search more than 10,000 Chamorro words and meanings.</span>
          </span>
          <ArrowRight className="h-5 w-5 flex-none text-indigo-600 transition-transform group-hover:translate-x-1 dark:text-indigo-300" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function ExploreSection() {
  return (
    <section aria-labelledby="explore-heading">
      <div className="mb-3">
        <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Choose your way</p>
        <h2 id="explore-heading" className="mt-0.5 text-xl font-bold text-brown-950 dark:text-white">Explore</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {EXPLORE_ITEMS.map(({ to, label, description, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className="group min-h-32 rounded-2xl border border-cream-200 bg-white p-3 hover:border-coral-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-700 sm:p-4"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="mt-3 block text-sm font-bold text-brown-900 dark:text-white">{label}</span>
            <span className="mt-0.5 block text-xs leading-snug text-brown-500 dark:text-gray-400">{description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

interface ProgressSummaryProps {
  isLoading: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  todayMinutes: number;
  goalMinutes: number;
  completedTopics: number;
  totalTopics: number;
  dueCards: number;
  streak: number;
}

export function ProgressSummary({ isLoading, hasError = false, onRetry, todayMinutes, goalMinutes, completedTopics, totalTopics, dueCards, streak }: ProgressSummaryProps) {
  if (isLoading) {
    return (
      <section
        aria-labelledby="progress-heading"
        aria-busy="true"
        className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5"
      >
        <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">At a glance</p>
        <h2 id="progress-heading" className="mt-0.5 text-xl font-bold text-brown-950 dark:text-white">Your progress</h2>
        <span className="sr-only">Loading your progress</span>
        <div className="mt-4 animate-pulse space-y-3 motion-reduce:animate-none" aria-hidden="true">
          <div className="h-2 rounded-full bg-cream-200 dark:bg-slate-700" />
          <div className="h-4 w-36 rounded bg-cream-100 dark:bg-slate-700" />
          <div className="h-16 rounded-xl bg-cream-50 dark:bg-slate-900/50" />
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section aria-labelledby="progress-heading" className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-900 dark:bg-slate-800 sm:p-5">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">At a glance</p>
        <h2 id="progress-heading" className="mt-0.5 text-xl font-bold text-brown-950 dark:text-white">Progress unavailable</h2>
        <p role="alert" className="mt-2 text-sm text-brown-600 dark:text-gray-300">
          We could not load your progress. Nothing was reset or changed.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 min-h-11 rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/30"
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  const progress = goalMinutes > 0 ? Math.min(100, Math.round((todayMinutes / goalMinutes) * 100)) : 0;
  return (
    <section aria-labelledby="progress-heading" className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">At a glance</p>
          <h2 id="progress-heading" className="mt-0.5 text-xl font-bold text-brown-950 dark:text-white">Your progress</h2>
        </div>
        <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-coral-700 hover:bg-coral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-ocean-300 dark:hover:bg-ocean-950/30">
          Details <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {goalMinutes === 0 ? (
        <div className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-cream-50 px-3 py-2 dark:bg-slate-900/50">
          <p className="text-sm text-brown-600 dark:text-gray-300">Daily time goal is off</p>
          <Link to="/settings" className="text-sm font-semibold text-coral-700 hover:underline dark:text-ocean-300">Set a goal</Link>
        </div>
      ) : (
        <>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700"
            role="progressbar"
            aria-label="Daily learning goal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-brown-600 dark:text-gray-300">{todayMinutes} of {goalMinutes} minutes today</p>
        </>
      )}
      <dl className="mt-4 grid grid-cols-3 divide-x divide-cream-200 rounded-xl bg-cream-50 py-3 text-center dark:divide-slate-700 dark:bg-slate-900/50">
        <div className="px-2">
          <dt className="text-xs text-brown-500 dark:text-gray-400">Path</dt>
          <dd className="mt-1 font-bold text-brown-900 dark:text-white">{completedTopics}/{totalTopics}</dd>
        </div>
        <div className="px-2">
          <dt className="text-xs text-brown-500 dark:text-gray-400">Due</dt>
          <dd className="mt-1 font-bold text-brown-900 dark:text-white">{dueCards}</dd>
        </div>
        <div className="px-2">
          <dt className="flex items-center justify-center gap-1 text-xs text-brown-500 dark:text-gray-400"><Flame className="h-3.5 w-3.5" aria-hidden="true" /> Streak</dt>
          <dd className="mt-1 font-bold text-brown-900 dark:text-white">{streak}</dd>
        </div>
      </dl>
    </section>
  );
}

function TodayDataError({ onRetry }: { onRetry: () => void }) {
  return (
    <section aria-labelledby="today-error-heading" className="rounded-3xl border border-amber-200 bg-white p-5 dark:border-amber-900 dark:bg-slate-800 sm:p-7">
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Today</p>
      <h2 id="today-error-heading" className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">Your plan is temporarily unavailable</h2>
      <p role="alert" className="mt-2 max-w-2xl text-brown-600 dark:text-gray-300">
        We could not load your learning history, so we will not guess at your next step. Your progress is safe.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 min-h-11 rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        Try loading again
      </button>
    </section>
  );
}

function SignedOutHome({ onStart }: { onStart: () => void }) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 pb-28 sm:py-10 sm:pb-12">
      <section className="overflow-hidden rounded-3xl border border-coral-200 bg-white p-6 dark:border-ocean-800 dark:bg-slate-800 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-coral-100 px-3 py-1.5 text-sm font-semibold text-coral-800 dark:bg-ocean-950 dark:text-ocean-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Built for Chamorro learning
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-brown-950 dark:text-white sm:text-5xl">
              Learn a little Chamorro every day.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-brown-600 dark:text-gray-300 sm:text-lg">
              Ask questions, translate school and family messages, follow guided lessons, hear vocabulary, read stories, and learn through play.
            </p>
            <button
              type="button"
              onClick={onStart}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-6 py-3 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-ocean-500 dark:hover:bg-ocean-600"
            >
              Start learning free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="rounded-3xl bg-cream-50 p-5 dark:bg-slate-900/60 sm:p-6">
            <p className="text-sm font-semibold text-brown-700 dark:text-gray-200">One welcoming place for</p>
            <ul className="mt-4 space-y-3 text-sm text-brown-700 dark:text-gray-300">
              <li className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-coral-600" aria-hidden="true" /> Quick questions and translations</li>
              <li className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-blue-600" aria-hidden="true" /> 21 guided lesson topics</li>
              <li className="flex items-center gap-3"><Book className="h-5 w-5 text-indigo-600" aria-hidden="true" /> A 10,000+ word dictionary</li>
              <li className="flex items-center gap-3"><Gamepad2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> Listening, stories, cards, and games</li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="public-tools-heading">
        <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Try it now</p>
        <h2 id="public-tools-heading" className="mt-0.5 text-2xl font-bold text-brown-950 dark:text-white">Public learning tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link to="/vocabulary" className="group flex min-h-32 items-center gap-4 rounded-2xl border border-cream-200 bg-white p-5 hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:bg-slate-800">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><Search className="h-6 w-6" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold text-brown-900 dark:text-white">Search the dictionary</span><span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">Find a Chamorro word or browse a category.</span></span>
            <ArrowRight className="h-5 w-5 text-indigo-600 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link to="/stories" className="group flex min-h-32 items-center gap-4 rounded-2xl border border-cream-200 bg-white p-5 hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:bg-slate-800">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><BookMarked className="h-6 w-6" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold text-brown-900 dark:text-white">Read a Chamorro story</span><span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">Learn language through stories and culture.</span></span>
            <ArrowRight className="h-5 w-5 text-amber-600 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-cream-200 py-6 text-center text-sm text-brown-500 dark:border-slate-700 dark:text-gray-400">
        <Link to="/about" className="font-semibold text-coral-700 hover:underline dark:text-ocean-300">Why HåfaGPT was built</Link>
        <span className="mx-2" aria-hidden="true">·</span>
        <Link to="/privacy" className="hover:underline">Privacy</Link>
      </footer>
    </main>
  );
}

export function HomePage() {
  const { user, isLoaded } = useUser();
  const authLoadTimedOut = useAuthLoadTimeout(isLoaded);
  const clerk = useClerk();
  const isSignedIn = Boolean(user);
  useInitUserData(null, isLoaded && isSignedIn);
  const { preferences, needsOnboarding } = useUserPreferences();
  const {
    isLoading,
    error: homepageError,
    refetch: refetchHomepage,
    streak,
    xp,
    weakAreas,
    srSummary,
    recommended,
    allProgress,
  } = useHomepageData();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { todayUnavailable, progressUnavailable } = getHomepageSectionAvailability({
    isLoading,
    hasRequestError: Boolean(homepageError),
    xp,
    weak_areas: weakAreas,
    sr_summary: srSummary,
    recommended,
    all_progress: allProgress,
    streak,
  });

  useEffect(() => {
    if (!needsOnboarding) {
      setShowOnboarding(false);
      return;
    }
    const timer = window.setTimeout(() => setShowOnboarding(true), 500);
    return () => window.clearTimeout(timer);
  }, [needsOnboarding, user?.id]);

  const todayPlan = useMemo(() => {
    if (isLoading || todayUnavailable) return null;
    return buildTodayPlan({
      preferences,
      recommended,
      srSummary,
      weakAreas,
      xp,
    });
  }, [isLoading, preferences, recommended, srSummary, todayUnavailable, weakAreas, xp]);

  if (!isLoaded && !authLoadTimedOut) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-slate-900">
        <HomeHeader signedIn={false} />
        <main className="mx-auto max-w-6xl animate-pulse space-y-4 px-4 py-8 motion-reduce:animate-none">
          <div className="h-56 rounded-3xl bg-white dark:bg-slate-800" />
          <div className="grid gap-4 sm:grid-cols-2"><div className="h-36 rounded-2xl bg-white dark:bg-slate-800" /><div className="h-36 rounded-2xl bg-white dark:bg-slate-800" /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-brown-950 dark:bg-slate-900 dark:text-white">
      <HomeHeader signedIn={isSignedIn} />
      {isLoaded && isSignedIn ? (
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 pb-24 sm:py-8 sm:pb-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Håfa Adai{user?.firstName ? `, ${user.firstName}` : ''}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-brown-950 dark:text-white sm:text-3xl">What would you like to learn today?</h1>
            </div>
            {streak && streak.current_streak > 0 && (
              <div className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <Flame className="h-4 w-4" aria-hidden="true" /> {streak.current_streak}-day streak
              </div>
            )}
          </div>

          {todayUnavailable ? (
            <TodayDataError onRetry={() => void refetchHomepage()} />
          ) : (
            <TodayPlanCard plan={todayPlan} isLoading={isLoading} />
          )}
          <UtilityLinks />
          <ExploreSection />
          <ProgressSummary
            isLoading={isLoading}
            hasError={progressUnavailable}
            onRetry={() => void refetchHomepage()}
            todayMinutes={xp?.today_minutes ?? 0}
            goalMinutes={xp?.daily_goal_minutes ?? DEFAULT_DAILY_SESSION_MINUTES}
            completedTopics={allProgress?.summary.total_completed ?? 0}
            totalTopics={allProgress?.summary.total_topics ?? 21}
            dueCards={srSummary?.due_today ?? 0}
            streak={streak?.current_streak ?? 0}
          />

          <footer className="flex flex-col items-center justify-between gap-3 border-t border-cream-200 py-6 text-sm text-brown-500 dark:border-slate-700 dark:text-gray-400 sm:flex-row">
            <Link to="/about" className="font-semibold text-coral-700 hover:underline dark:text-ocean-300">Why HåfaGPT was built</Link>
            <div className="flex items-center gap-3"><Link to="/privacy" className="hover:underline">Privacy</Link><Link to="/support" className="hover:underline">Help</Link><Link to="/dashboard" className="inline-flex items-center gap-1 hover:underline"><BarChart3 className="h-4 w-4" aria-hidden="true" /> Progress</Link></div>
          </footer>
        </main>
      ) : (
        <SignedOutHome onStart={() => clerk.openSignUp()} />
      )}

      <OnboardingModal
        isOpen={showOnboarding && needsOnboarding}
        onClose={() => setShowOnboarding(false)}
        accountKey={user?.id}
      />

      {isLoaded && !isSignedIn && (
        <div className="fixed above-bottom-nav left-0 right-0 z-30 px-4 pb-2 sm:hidden">
          <button type="button" onClick={() => clerk.openSignUp()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 py-3 font-semibold text-white shadow-lg">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Start learning free
          </button>
        </div>
      )}
    </div>
  );
}
