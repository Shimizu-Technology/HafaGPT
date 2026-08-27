import { useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  History,
  Loader2,
  RefreshCw,
  Star,
} from 'lucide-react';
import { useGameHistory } from '../hooks/useGamesQuery';
import { appRoutes, currentAppPath, positivePageFromSearch } from '../lib/routes';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

const GAME_TYPES = [
  ['chamorro_wordle', 'Chamorro Wordle'],
  ['color_touch', 'Color Touch'],
  ['cultural_trivia', 'Cultural Trivia'],
  ['falling_words', 'Falling Words'],
  ['hangman', 'Word Guess'],
  ['memory_match', 'Memory Match'],
  ['number_tap', 'Number Tap'],
  ['picture_pairs', 'Picture Pairs'],
  ['simon_says', 'Simon Says'],
  ['sound_match', 'Sound Match'],
  ['word_catch', 'Word Catch'],
  ['word_scramble', 'Word Scramble'],
] as const;

function readableGameType(gameType: string): string {
  return GAME_TYPES.find(([value]) => value === gameType)?.[1]
    ?? gameType.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Show a restorable, filterable list of the learner's saved game rounds. */
export function GameHistory() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = positivePageFromSearch(searchParams.get('page'));
  const requestedGameType = searchParams.get('game') || '';
  const gameType = GAME_TYPES.some(([value]) => value === requestedGameType)
    ? requestedGameType
    : undefined;
  const perPage = 20;
  const { data, isLoading, error, refetch } = useGameHistory(page, perPage, gameType);
  const pagination = data?.pagination ?? {
    page: 1,
    per_page: perPage,
    total_count: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  const updateSearch = (nextPage: number, nextGameType = gameType || '') => {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set('page', String(nextPage));
    else next.delete('page');
    if (nextGameType) next.set('game', nextGameType);
    else next.delete('game');
    setSearchParams(next);
  };

  useEffect(() => {
    if (!data || data.pagination.total_count === 0) return;
    const lastPage = Math.max(1, data.pagination.total_pages);
    if (page > lastPage) {
      const next = new URLSearchParams(searchParams);
      if (lastPage > 1) next.set('page', String(lastPage));
      else next.delete('page');
      setSearchParams(next, { replace: true });
    }
  }, [data, page, searchParams, setSearchParams]);

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Game history"
        subtitle={`${pagination.total_count} ${pagination.total_count === 1 ? 'game' : 'games'} completed`}
        icon={History}
        backTo="/dashboard"
        backLabel="Back to progress"
        maxWidthClassName="max-w-4xl"
      />

      <main className="mx-auto max-w-4xl px-4 py-5 sm:py-8">
        <label className="mb-5 block max-w-xs text-sm font-semibold text-brown-700 dark:text-gray-200">
          Game type
          <select
            value={gameType || ''}
            onChange={(event) => updateSearch(1, event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-brown-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All games</option>
            {GAME_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        {isLoading ? (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-coral-600 motion-reduce:animate-none dark:text-teal-300" aria-hidden="true" />
            <p className="mt-4 font-medium text-brown-600 dark:text-gray-300">Loading your game history…</p>
          </section>
        ) : error ? (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-center dark:border-red-900 dark:bg-slate-800">
            <h2 className="text-xl font-bold text-brown-950 dark:text-white">Game history is unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">Your results are still saved. Try loading this page again.</p>
            <button type="button" onClick={() => void refetch()} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
          </section>
        ) : !data || data.results.length === 0 ? (
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 text-center dark:border-emerald-900 dark:bg-slate-800">
            <Gamepad2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold text-brown-950 dark:text-white">No matching game results</h2>
            <p className="mx-auto mt-2 max-w-sm text-brown-600 dark:text-gray-400">Play a game and its saved result will appear here.</p>
            <Link to={appRoutes.games} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700">Choose a game</Link>
          </section>
        ) : (
          <>
            <section aria-labelledby="game-results-title">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Past practice</p>
              <h2 id="game-results-title" className="mb-4 text-xl font-bold text-brown-950 dark:text-white">Review your game results</h2>
              <div className="divide-y divide-cream-100 overflow-hidden rounded-2xl border border-cream-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
                {data.results.map((result) => (
                  <Link
                    key={result.id}
                    to={appRoutes.gameResult(result.id, { returnTo: currentAppPath(location.pathname, location.search) })}
                    className="group flex min-h-24 items-center justify-between gap-3 p-4 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500 dark:hover:bg-slate-700/50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Gamepad2 className="h-5 w-5" aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-brown-950 dark:text-white">{result.category_title || readableGameType(result.game_type)}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brown-500 dark:text-gray-400">
                          <time className="flex items-center gap-1" dateTime={result.created_at}><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(result.created_at)}</time>
                          <span>{readableGameType(result.game_type)}</span>
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-2">
                      <span className="flex items-center gap-0.5" aria-label={`${result.stars || 0} out of 3 stars`}>
                        {[1, 2, 3].map((star) => <Star key={star} className={`h-4 w-4 ${star <= (result.stars || 0) ? 'fill-amber-400 text-amber-400' : 'text-cream-300 dark:text-slate-600'}`} aria-hidden="true" />)}
                      </span>
                      <span className="font-bold text-brown-800 dark:text-white">{result.score}</span>
                      <ChevronRight className="h-5 w-5 text-brown-400 group-hover:text-coral-600 dark:text-gray-500" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {pagination.total_pages > 1 && (
              <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Game history pages">
                <p className="text-sm text-brown-600 dark:text-gray-400">Page {pagination.page} of {pagination.total_pages}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateSearch(Math.max(1, page - 1))} disabled={!pagination.has_prev} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-brown-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</button>
                  <button type="button" onClick={() => updateSearch(page + 1)} disabled={!pagination.has_next} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-brown-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200">Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </nav>
            )}
          </>
        )}
      </main>
    </LearnerPageShell>
  );
}
