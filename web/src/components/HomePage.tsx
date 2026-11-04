import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Book,
  BookMarked,
  Flame,
  Gamepad2,
  GraduationCap,
  Languages,
  MessageCircle,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useInitUserData } from '../hooks/useConversationsQuery';
import { useHomepageData } from '../hooks/useHomepageData';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../hooks/useTheme';
import { useAuthLoadTimeout } from '../hooks/useAuthLoadTimeout';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { wordOfTheDayQueryOptions } from '../hooks/useVocabularyQuery';
import { buildTodayPlan } from '../lib/todayPlan';
import { getHomepageSectionAvailability } from '../lib/homepageAvailability';
import { DEFAULT_DAILY_SESSION_MINUTES } from '../data/learningPreferences';
import { AuthButton } from './AuthButton';
import { OnboardingModal } from './OnboardingModal';
import { TodayPlanCard } from './TodayPlanCard';
import { BrandMark } from './BrandMark';
import { PublicWordCardBoundary, PublicWordCardSkeleton } from './PublicWordCardShell';
import { lazyNamed } from '../lib/lazyNamed';

// Loaded on demand so the signed-in Home and the initial bundle never carry it.
const PublicWordOfTheDay = lazyNamed(() => import('./PublicWordOfTheDay'), 'PublicWordOfTheDay');

function HomeHeader({ signedIn }: { signedIn: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const { isChristmasTheme, isNewYearTheme } = useSubscription();

  return (
    <header className="sticky top-0 z-30 border-b border-cream-200/80 bg-cream-50/95 backdrop-blur-xl dark:border-brown-700 dark:bg-brown-950/95 sm:hidden">
      {/* From the sm breakpoint up, the shared app bar carries the brand, theme, settings and account. */}
      <div className="safe-area-top mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500">
          <BrandMark className="h-10 w-10" seasonal={isChristmasTheme ? 'christmas' : isNewYearTheme ? 'newyear' : null} />
          <span className="block text-lg font-bold leading-tight text-brown-950 dark:text-cream-100">HåfaGPT</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {signedIn && (
            <Link
              to="/settings"
              aria-label="Learning settings"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-brown-100 dark:hover:bg-brown-900"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-brown-100 dark:hover:bg-brown-900"
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
          <h2 id="utility-heading" className="text-xl font-bold text-brown-950 dark:text-cream-100">Ask, translate, or look up a word</h2>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-brown-700 dark:bg-brown-900 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-coral-100 text-coral-700">
              <Languages className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-brown-900 dark:text-cream-100">Ask or translate</h3>
              <p className="mt-1 text-sm text-brown-600 dark:text-brown-100">Get help with a school message, phrase, or Chamorro question.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/chat?intent=translate" className="pressable inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-3 py-2.5 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2">
              Translate
            </Link>
            <Link to="/chat?intent=ask" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-brown-600 dark:bg-brown-900 dark:text-cream-100 dark:hover:bg-brown-700">
              Explain a phrase
            </Link>
          </div>
        </div>

        <Link
          to="/vocabulary"
          className="group flex min-h-36 items-center gap-4 rounded-2xl border border-cream-200 bg-white p-4 hover:border-coral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-brown-700 dark:bg-brown-900 dark:hover:bg-ocean-950/20 sm:p-5"
        >
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-cream-100 text-coral-700 dark:bg-brown-700">
            <Search className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-brown-900 dark:text-cream-100">Dictionary</span>
            <span className="mt-1 block text-sm text-brown-600 dark:text-brown-100">Search more than 10,000 Chamorro words and meanings.</span>
          </span>
          <ArrowRight className="h-5 w-5 flex-none text-brown-500 transition-transform group-hover:translate-x-1 dark:text-brown-300" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function ExploreSection() {
  return (
    <Link to="/library" className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-cream-200 bg-white px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-brown-700 dark:bg-brown-900">
      <span><span className="block font-bold text-brown-900 dark:text-cream-100">Browse the Library</span><span className="mt-1 block text-sm text-brown-600 dark:text-brown-100">Stories, flashcards, quizzes, games, and saved material.</span></span>
      <ArrowRight className="h-5 w-5 flex-none text-teal-700 dark:text-ocean-300" aria-hidden="true" />
    </Link>
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

export function ProgressSummary({ isLoading, hasError = false, onRetry, completedTopics, totalTopics, dueCards, streak }: ProgressSummaryProps) {
  if (isLoading) {
    return (
      <section
        aria-labelledby="progress-heading"
        aria-busy="true"
        className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-brown-700 dark:bg-brown-900 sm:p-5"
      >
        <h2 id="progress-heading" className="text-xl font-bold text-brown-950 dark:text-cream-100">Your progress</h2>
        <span className="sr-only">Loading your progress</span>
        <div className="mt-4 animate-pulse space-y-3 motion-reduce:animate-none" aria-hidden="true">
          <div className="h-2 rounded-full bg-cream-200 dark:bg-brown-700" />
          <div className="h-4 w-36 rounded bg-cream-100 dark:bg-brown-700" />
          <div className="h-16 rounded-xl bg-cream-50 dark:bg-brown-950/50" />
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section aria-labelledby="progress-heading" className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-900 dark:bg-brown-900 sm:p-5">
        <h2 id="progress-heading" className="text-xl font-bold text-brown-950 dark:text-cream-100">Progress unavailable</h2>
        <p role="alert" className="mt-2 text-sm text-brown-600 dark:text-brown-100">
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

  return (
    <section aria-labelledby="progress-heading" className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-brown-700 dark:bg-brown-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="progress-heading" className="text-xl font-bold text-brown-950 dark:text-cream-100">Your progress</h2>
        </div>
        <Link to="/dashboard" className="pressable inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-coral-700 hover:bg-coral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500">
          Details <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <p className="mt-3 text-sm text-brown-600 dark:text-brown-100">Completed lessons and scheduled review. Follow your session checklist on Today.</p>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-cream-200 rounded-xl bg-cream-50 py-3 text-center dark:divide-brown-700 dark:bg-brown-950/50">
        <div className="px-2">
          <dt className="text-xs text-brown-500 dark:text-brown-300">Path</dt>
          <dd className="mt-1 font-bold text-brown-900 dark:text-cream-100">{completedTopics}/{totalTopics}</dd>
        </div>
        <div className="px-2">
          <dt className="text-xs text-brown-500 dark:text-brown-300">Due</dt>
          <dd className="mt-1 font-bold text-brown-900 dark:text-cream-100">{dueCards}</dd>
        </div>
        <div className="px-2">
          <dt className="flex items-center justify-center gap-1 text-xs text-brown-500 dark:text-brown-300"><Flame className="h-3.5 w-3.5" aria-hidden="true" /> Streak</dt>
          <dd className="mt-1 font-bold text-brown-900 dark:text-cream-100">{streak}</dd>
        </div>
      </dl>
    </section>
  );
}

function TodayDataError({ onRetry }: { onRetry: () => void }) {
  return (
    <section aria-labelledby="today-error-heading" className="rounded-3xl border border-amber-200 bg-white p-5 dark:border-amber-900 dark:bg-brown-900 sm:p-7">
      <h2 id="today-error-heading" className="mt-1 text-2xl font-bold text-brown-950 dark:text-cream-100">Your plan is temporarily unavailable</h2>
      <p role="alert" className="mt-2 max-w-2xl text-brown-600 dark:text-brown-100">
        We could not load your learning history, so we will not guess at your next step. Your progress is safe.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 min-h-11 rounded-xl bg-amber-700 px-4 py-2.5 font-semibold text-white hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        Try loading again
      </button>
    </section>
  );
}

const SIGNED_OUT_HIGHLIGHTS = [
  { icon: MessageCircle, text: 'Quick questions and translations' },
  { icon: GraduationCap, text: '21 guided lesson topics' },
  { icon: Book, text: 'A 10,000+ word dictionary' },
  { icon: Gamepad2, text: 'Listening, stories, cards, and games' },
] as const;

function SignedOutHome({ onStart }: { onStart: () => void }) {
  const queryClient = useQueryClient();

  // Start the request now, in parallel with the card's code, instead of after it.
  useEffect(() => {
    void queryClient.prefetchQuery(wordOfTheDayQueryOptions());
  }, [queryClient]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 pb-28 sm:py-10 sm:pb-12">
      <section className="overflow-hidden rounded-3xl bg-white p-6 dark:bg-brown-900 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
          <div>
            <p lang="ch" className="font-chamorro text-5xl font-semibold leading-none tracking-tight text-coral-800 sm:text-6xl lg:text-7xl">Håfa Adai</p>
            <h1 className="mt-4 max-w-3xl text-balance text-2xl font-bold tracking-tight text-brown-950 dark:text-cream-100 sm:text-3xl">
              Learn a little Chamorro every day.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-brown-600 dark:text-brown-100 sm:text-lg">
              Ask questions, translate school and family messages, follow guided lessons, hear vocabulary, read stories, and learn through play.
            </p>
            <button
              type="button"
              onClick={onStart}
              aria-describedby="public-account-note"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-6 py-3 font-semibold text-white [@media(hover:hover)_and_(pointer:fine)]:hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
            >
              Start learning free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p id="public-account-note" className="mt-3 text-base text-brown-600 dark:text-brown-100">Free account needed — takes a minute.</p>
            <Link to="/chat?intent=translate" aria-describedby="public-account-note" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl font-semibold text-coral-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500">
              <Languages className="h-5 w-5" aria-hidden="true" /> Ask or translate
            </Link>
          </div>
          <PublicWordCardBoundary>
            <Suspense fallback={<PublicWordCardSkeleton />}>
              <PublicWordOfTheDay />
            </Suspense>
          </PublicWordCardBoundary>
        </div>
        <ul aria-label="One welcoming place for" className="mt-8 grid gap-3 border-t border-cream-200 pt-6 text-base text-brown-700 dark:border-brown-700 dark:text-brown-100 sm:grid-cols-2 lg:grid-cols-4">
          {SIGNED_OUT_HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3"><Icon className="h-5 w-5 flex-none text-coral-700" aria-hidden="true" /> {text}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="public-tools-heading">
        <h2 id="public-tools-heading" className="mt-0.5 text-2xl font-bold text-brown-950 dark:text-cream-100">Public learning tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link to="/vocabulary" className="group flex min-h-32 items-center gap-4 rounded-2xl border border-cream-200 bg-white p-5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-coral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-brown-700 dark:bg-brown-900">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-coral-700 dark:bg-brown-700"><Search className="h-6 w-6" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold text-brown-900 dark:text-cream-100">Search the dictionary</span><span className="mt-1 block text-base text-brown-600 dark:text-brown-100">Find a Chamorro word or browse a category.</span></span>
            <ArrowRight className="h-5 w-5 text-coral-700" aria-hidden="true" />
          </Link>
          <Link to="/stories" className="group flex min-h-32 items-center gap-4 rounded-2xl border border-cream-200 bg-white p-5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-coral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-brown-700 dark:bg-brown-900">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-coral-700 dark:bg-brown-700"><BookMarked className="h-6 w-6" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold text-brown-900 dark:text-cream-100">Read a Chamorro story</span><span className="mt-1 block text-base text-brown-600 dark:text-brown-100">Learn language through stories and culture.</span></span>
            <ArrowRight className="h-5 w-5 text-brown-500 transition-transform group-hover:translate-x-1 dark:text-brown-300" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-cream-200 py-6 text-center text-sm text-brown-500 dark:border-brown-700 dark:text-brown-300">
        <Link to="/about" className="inline-flex min-h-11 items-center justify-center font-semibold text-coral-700 [@media(hover:hover)_and_(pointer:fine)]:hover:underline">Why HåfaGPT was built</Link>
        <Link to="/support" className="inline-flex min-h-11 items-center justify-center [@media(hover:hover)_and_(pointer:fine)]:hover:underline">Support</Link>
        <Link to="/pricing" className="inline-flex min-h-11 items-center justify-center [@media(hover:hover)_and_(pointer:fine)]:hover:underline">Plans</Link>
        <Link to="/privacy" className="inline-flex min-h-11 items-center justify-center [@media(hover:hover)_and_(pointer:fine)]:hover:underline">Privacy</Link>
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-brown-950">
        <HomeHeader signedIn={false} />
        {authLoadTimedOut ? (
          <main className="mx-auto max-w-5xl space-y-4 px-4 py-8 text-brown-950 dark:text-cream-100">
            <h1 className="text-xl font-bold">We could not check your sign-in</h1>
            <p>Your account is still being checked. Try again or open the dictionary while you wait.</p>
            <div className="flex flex-wrap gap-4">
              <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-action px-4 py-2 text-white">Try again</button>
              <Link to="/vocabulary" className="inline-flex min-h-11 items-center text-teal-700 dark:text-ocean-300">Open the dictionary</Link>
            </div>
          </main>
        ) : (
        <main className="mx-auto max-w-5xl animate-pulse space-y-4 px-4 py-8 motion-reduce:animate-none">
          <div className="h-56 rounded-3xl bg-white dark:bg-brown-900" />
          <div className="grid gap-4 sm:grid-cols-2"><div className="h-36 rounded-2xl bg-white dark:bg-brown-900" /><div className="h-36 rounded-2xl bg-white dark:bg-brown-900" /></div>
        </main>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-brown-950 dark:bg-brown-950 dark:text-cream-100">
      <HomeHeader signedIn={isSignedIn} />
      {isLoaded && isSignedIn ? (
        <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 pb-24 sm:py-8 sm:pb-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-chamorro text-3xl font-semibold tracking-tight text-coral-800 sm:text-4xl">Håfa Adai{user?.firstName ? `, ${user.firstName}` : ''}</p>
              <h1 className="mt-2 text-lg font-semibold text-brown-700 dark:text-cream-200 sm:text-xl">What would you like to learn today?</h1>
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

          <footer className="flex flex-col items-center justify-between gap-3 border-t border-cream-200 py-6 text-sm text-brown-500 dark:border-brown-700 dark:text-brown-300 sm:flex-row">
            <Link to="/about" className="inline-flex min-h-11 items-center justify-center font-semibold text-coral-700 hover:underline">Why HåfaGPT was built</Link>
            <nav aria-label="Home information" className="flex flex-wrap items-center justify-center gap-3"><Link to="/privacy" className="inline-flex min-h-11 items-center justify-center hover:underline">Privacy</Link><Link to="/support" className="inline-flex min-h-11 items-center justify-center hover:underline">Help</Link><Link to="/dashboard" className="inline-flex min-h-11 items-center justify-center gap-1 hover:underline"><BarChart3 className="h-4 w-4" aria-hidden="true" /> Progress</Link></nav>
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


    </div>
  );
}
