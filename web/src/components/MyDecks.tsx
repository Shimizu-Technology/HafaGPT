import { useUser } from '@clerk/clerk-react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Layers3,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserDecks } from '../hooks/useFlashcardsQuery';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

function formatTopic(topic: string) {
  return topic.replace(/-/g, ' ');
}

export function MyDecks() {
  const { user, isLoaded } = useUser();
  const { data, isLoading, isError, refetch } = useUserDecks(user?.id, isLoaded && !!user);
  const decks = data?.decks || [];
  const cardsDue = decks.reduce((total, deck) => total + deck.cards_due, 0);

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Saved decks"
        subtitle={decks.length > 0 ? `${decks.length} ${decks.length === 1 ? 'deck' : 'decks'} · ${cardsDue} due today` : 'Your personal flashcard practice'}
        icon={Layers3}
        backTo="/flashcards"
        backLabel="Back to flashcards"
        maxWidthClassName="max-w-4xl"
      />

      <main className="mx-auto max-w-4xl px-4 py-5 sm:py-8">
        {isLoaded && !user ? (
          <section className="rounded-3xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-8">
            <BookOpen className="mx-auto h-9 w-9 text-coral-600 dark:text-teal-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold text-brown-950 dark:text-white">Sign in to use saved decks</h2>
            <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">
              Your custom decks and review progress are connected to your account.
            </p>
            <Link
              to="/flashcards"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              Browse flashcards
            </Link>
          </section>
        ) : !isLoaded || isLoading ? (
          <section
            className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-coral-600 motion-reduce:animate-none dark:text-teal-300" aria-hidden="true" />
            <p className="mt-4 font-medium text-brown-600 dark:text-gray-300">Loading your saved decks…</p>
          </section>
        ) : isError ? (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-center dark:border-red-900 dark:bg-slate-800 sm:p-8">
            <AlertCircle className="mx-auto h-9 w-9 text-red-600 dark:text-red-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold text-brown-950 dark:text-white">Saved decks are unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">
              Your decks have not been changed. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </section>
        ) : decks.length === 0 ? (
          <section className="rounded-3xl border border-coral-200 bg-white p-6 text-center dark:border-ocean-800 dark:bg-slate-800 sm:p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-teal-950/50 dark:text-teal-300">
              <BookOpen className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-brown-950 dark:text-white">No saved decks yet</h2>
            <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">
              Open flashcards, choose a topic, and save a deck to practice it again later.
            </p>
            <Link
              to="/flashcards"
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              Choose flashcards
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <>
            <section className="mb-5 grid grid-cols-2 gap-3" aria-label="Saved deck summary">
              <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-semibold text-brown-500 dark:text-gray-400">Saved decks</p>
                <p className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">{decks.length}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Due today</p>
                <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">{cardsDue}</p>
              </div>
            </section>

            <section aria-labelledby="saved-decks-title">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Pick up where you left off</p>
              <h2 id="saved-decks-title" className="mb-3 text-xl font-bold text-brown-950 dark:text-white">Your decks</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {decks.map((deck) => {
                  const reviewedPercent = deck.total_cards > 0
                    ? Math.min(100, Math.round((deck.cards_reviewed / deck.total_cards) * 100))
                    : 0;
                  return (
                    <Link
                      key={deck.id}
                      to={`/flashcards/my-deck/${deck.id}`}
                      aria-label={`Study ${deck.title}, ${deck.cards_due} cards due`}
                      className="group rounded-2xl border border-cream-200 bg-white p-4 hover:border-coral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700 sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-coral-100 text-coral-700 dark:bg-teal-950/50 dark:text-teal-300">
                          <BookOpen className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-bold text-brown-950 dark:text-white">{deck.title}</h3>
                          <p className="mt-0.5 capitalize text-sm text-brown-500 dark:text-gray-400">{formatTopic(deck.topic)}</p>
                        </div>
                        <ArrowRight className="mt-2 h-5 w-5 flex-none text-brown-400 group-hover:text-coral-600 dark:text-gray-500 dark:group-hover:text-teal-300" aria-hidden="true" />
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700" aria-hidden="true">
                        <div className="h-full rounded-full bg-coral-500 dark:bg-teal-500" style={{ width: `${reviewedPercent}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-brown-500 dark:text-gray-400">
                        <span>{deck.cards_reviewed} of {deck.total_cards} reviewed</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                          {deck.cards_due} due
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </LearnerPageShell>
  );
}
