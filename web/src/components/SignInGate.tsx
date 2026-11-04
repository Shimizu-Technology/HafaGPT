import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { Link, useLocation } from 'react-router-dom';
import { usePromoStatus } from '../hooks/useSubscription';
import { gateChoiceFor } from '../lib/gateChoice';
import { BrandMark } from './BrandMark';
import { GamesPreview, LearningPathPreview } from './GatePreview';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

interface FeatureInfo {
  title: string;
  description: string;
  subtitle?: string;
}

// Copy for the gate, chosen by route. Titles match the page a signed-in learner sees.
function getFeatureInfo(pathname: string): FeatureInfo {
  if (pathname.startsWith('/chat')) {
    return { title: 'AI Chat', description: 'Have conversations with our Chamorro AI tutor' };
  }
  if (pathname.startsWith('/learning') || pathname.startsWith('/learn/')) {
    return {
      title: 'Learning path',
      description: 'Follow guided Chamorro lessons and save your progress',
      subtitle: 'Build skills one short topic at a time',
    };
  }
  if (pathname.startsWith('/quiz')) {
    return { title: 'Quizzes', description: 'Test your Chamorro knowledge' };
  }
  if (pathname.startsWith('/flashcards')) {
    return { title: 'Flashcards', description: 'Study vocabulary with flashcards' };
  }
  if (pathname.startsWith('/practice')) {
    return { title: 'Conversation practice', description: 'Practice real Chamorro conversations' };
  }
  if (pathname.startsWith('/games/results')) {
    return { title: 'Game results', description: 'Game results are saved to your account' };
  }
  if (pathname.startsWith('/games')) {
    return {
      title: 'Games',
      description: 'Learn Chamorro through short games and save your scores',
      subtitle: 'Short activities for every kind of learner',
    };
  }
  if (pathname.startsWith('/dashboard')) {
    return { title: 'Your progress', description: 'Track your learning journey' };
  }
  if (pathname.startsWith('/settings')) {
    return { title: 'Settings', description: 'Personalize your HåfaGPT learning experience' };
  }
  return { title: 'Your account', description: 'Sign in to save your progress and preferences' };
}

const primaryAction = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-action-hover';
const quietAction = 'inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-base font-semibold text-brown-700 transition-colors hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-brown-700';

/**
 * What a signed-out visitor sees on a route that needs an account. Learn and
 * Games show their real catalogue read-only; a chosen topic or game is named;
 * everything else gets a plain explanation. Signing up or in returns to the
 * same address, so the visitor lands on what they chose.
 */
export function SignInGate() {
  const { pathname, search, hash } = useLocation();
  const { data: promo } = usePromoStatus();
  const seasonal = promo?.theme === 'christmas' ? 'christmas' : promo?.theme === 'newyear' ? 'newyear' : null;
  const info = getFeatureInfo(pathname);
  const choice = gateChoiceFor(pathname);
  const path = pathname.replace(/\/$/, '');
  const catalogue = choice ? null : path === '/learning' ? 'learning' : path === '/games' ? 'games' : null;
  const returnTo = `${pathname}${search}${hash}`;

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={choice?.title ?? info.title}
        subtitle={choice?.meta ?? info.subtitle}
        backTo={choice?.backTo ?? '/'}
        backLabel={choice?.backLabel ?? 'Back to Today'}
      />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <section
          aria-label="Create a free account"
          className={`rounded-2xl border border-cream-200 bg-white p-5 dark:border-brown-700 dark:bg-brown-900 sm:p-6 ${catalogue ? 'mb-8' : ''}`}
        >
          <div className="flex items-start gap-4">
            <BrandMark className="h-10 w-10" seasonal={seasonal} />
            <div className="min-w-0 flex-1">
              <p className="text-base leading-snug text-brown-950 dark:text-cream-100">{choice?.description ?? info.description}</p>
              <p className="mt-1 text-sm text-brown-600 dark:text-brown-100">Free, no card needed. You&rsquo;ll come straight back to this page.</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
                <SignUpButton mode="modal" forceRedirectUrl={returnTo} signInForceRedirectUrl={returnTo}>
                  <button type="button" className={primaryAction}>Create a free account</button>
                </SignUpButton>
                <SignInButton mode="modal" forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo}>
                  <button type="button" className={quietAction}>Sign in</button>
                </SignInButton>
              </div>
            </div>
          </div>
        </section>

        {catalogue === 'learning' && <LearningPathPreview />}
        {catalogue === 'games' && <GamesPreview />}

        {choice && (
          <p className="mt-6">
            <Link to={choice.backTo} className="inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-coral-700 hover:underline dark:text-hibiscus-400">{choice.listLabel}</Link>
          </p>
        )}
        {!choice && !catalogue && (
          <p className="mt-6 text-sm text-brown-600 dark:text-brown-100">
            Just browsing?{' '}
            <Link to="/vocabulary" className="inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-coral-700 hover:underline dark:text-hibiscus-400">
              Explore free content &rarr;
            </Link>
          </p>
        )}
      </main>
    </LearnerPageShell>
  );
}
