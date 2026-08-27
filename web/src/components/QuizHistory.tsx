import { useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, Calendar, ChevronLeft, ChevronRight, Clock, History, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { useQuizHistory } from '../hooks/useQuizQuery';
import { appRoutes, currentAppPath, positivePageFromSearch } from '../lib/routes';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTime(seconds: number | null) {
  if (!seconds) return 'Time not recorded';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function scoreTone(percentage: number) {
  if (percentage >= 80) return 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300';
  if (percentage >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
  return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300';
}

export function QuizHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const page = positivePageFromSearch(searchParams.get('page'));
  const perPage = 20;
  const { data, isLoading, error, refetch } = useQuizHistory(page, perPage);
  const pagination = data?.pagination ?? {
    page: 1,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_prev: false,
    per_page: perPage,
  };
  const returnTo = currentAppPath(location.pathname, location.search, location.hash);

  const setPage = useCallback((nextPage: number, replace = false) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set('page', String(nextPage));
    else next.delete('page');
    const nextSearch = next.toString();
    navigate(currentAppPath(
      location.pathname,
      nextSearch ? `?${nextSearch}` : '',
      location.hash,
    ), { replace });
  }, [location.hash, location.pathname, navigate, searchParams]);

  useEffect(() => {
    if (!data || data.pagination.total_count === 0) return;
    const lastPage = Math.max(1, data.pagination.total_pages);
    if (page > lastPage) setPage(lastPage, true);
  }, [data, page, setPage]);

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Quiz history"
        subtitle={`${pagination.total_count} ${pagination.total_count === 1 ? 'quiz' : 'quizzes'} completed`}
        icon={History}
        backTo="/dashboard"
        backLabel="Back to progress"
        maxWidthClassName="max-w-4xl"
      />

      <main className="mx-auto max-w-4xl px-4 py-5 sm:py-8">
        {isLoading ? (
          <section
            className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800"
            aria-live="polite"
          >
            <Loader2
              className="h-8 w-8 animate-spin text-coral-600 motion-reduce:animate-none dark:text-teal-300"
              aria-hidden="true"
            />
            <p className="mt-4 font-medium text-brown-600 dark:text-gray-300">Loading your quiz history…</p>
          </section>
        ) : error ? (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-center dark:border-red-900 dark:bg-slate-800">
            <h2 className="text-xl font-bold text-brown-950 dark:text-white">Quiz history is unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">
              Your results are still saved. Try loading this page again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
          </section>
        ) : !data || data.results.length === 0 ? (
          <section className="rounded-3xl border border-purple-200 bg-white p-6 text-center dark:border-purple-900 dark:bg-slate-800">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <Trophy className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-brown-950 dark:text-white">No quizzes yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-brown-600 dark:text-gray-400">
              Take a short quiz and your results will appear here.
            </p>
            <Link
              to="/quiz"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              Choose a quiz
            </Link>
          </section>
        ) : (
          <>
            <section aria-labelledby="quiz-results-title">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Past practice</p>
              <h2 id="quiz-results-title" className="mb-4 text-xl font-bold text-brown-950 dark:text-white">
                Review your results
              </h2>
              <div className="divide-y divide-cream-100 overflow-hidden rounded-2xl border border-cream-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
                {data.results.map((result) => {
                  const percentage = Math.round(result.percentage);
                  const isDictionary = result.category_id.startsWith('dict-');

                  return (
                    <Link
                      key={result.id}
                      to={appRoutes.quizReview(result.id, { returnTo })}
                      className="group flex min-h-24 items-center justify-between gap-3 p-4 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500 dark:hover:bg-slate-700/50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                          <Brain className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-bold text-brown-950 dark:text-white">
                              {result.category_title || 'Quiz'}
                            </span>
                            {isDictionary && (
                              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                                Dictionary
                              </span>
                            )}
                          </span>
                          <span className="mt-1 flex flex-col gap-1 text-xs text-brown-500 dark:text-gray-400 sm:flex-row sm:gap-4">
                            <time className="flex items-center gap-1" dateTime={result.created_at}>
                              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatDate(result.created_at)}
                            </time>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatTime(result.time_spent_seconds)}
                            </span>
                          </span>
                        </span>
                      </span>
                      <span className="flex flex-none items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreTone(percentage)}`}>
                          {percentage}%
                        </span>
                        <ChevronRight
                          className="h-5 w-5 text-brown-400 group-hover:text-coral-600 dark:text-gray-500 dark:group-hover:text-teal-300"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {pagination.total_pages > 1 && (
              <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Quiz history pages">
                <p className="text-sm text-brown-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.total_pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={!pagination.has_prev}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-brown-700 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.has_next}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-brown-700 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                  >
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </main>
    </LearnerPageShell>
  );
}
