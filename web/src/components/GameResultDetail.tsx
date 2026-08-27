import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Gamepad2,
  Layers3,
  Loader2,
  Map,
  RefreshCw,
  Star,
  Trophy,
} from 'lucide-react';
import { GAME_CONTENT_TRUST } from '../data/contentTrust';
import { findCuratedConceptIndex } from '../data/conceptEvidence';
import { getTopic } from '../data/learningPath';
import { useGameResultRecord } from '../hooks/useActivityResults';
import { withGameConceptReview } from '../lib/conceptReview';
import { appRoutes, safeInternalReturnPath } from '../lib/routes';
import { ContentTrustNote } from './ContentTrustNote';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return 'Not recorded';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function readableGameType(gameType: string): string {
  return gameType.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

/** Show one authoritative saved game round and its supported relationships. */
export function GameResultDetail() {
  const { resultId } = useParams<{ resultId: string }>();
  const [searchParams] = useSearchParams();
  const { data: result, isLoading, error, refetch } = useGameResultRecord(resultId);
  const backTo = safeInternalReturnPath(searchParams.get('return_to'), appRoutes.gameHistory);
  const topic = getTopic(result?.learning_topic_id || '');

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={result?.category_title || 'Game result'}
        subtitle="See what this round recorded and what to practice next."
        icon={Gamepad2}
        backTo={backTo}
        backLabel={backTo.startsWith(appRoutes.topic('')) ? 'Back to topic' : 'Back to game history'}
        maxWidthClassName="max-w-2xl"
      />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:py-8">
        {isLoading ? (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-coral-600 motion-reduce:animate-none dark:text-teal-300" aria-hidden="true" />
            <p className="mt-4 font-medium text-brown-600 dark:text-gray-300">Loading your game result…</p>
          </section>
        ) : error || !result ? (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-center dark:border-red-900 dark:bg-slate-800">
            <h2 className="text-xl font-bold text-brown-950 dark:text-white">Game result unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">The record may not exist or may belong to another account.</p>
            <button type="button" onClick={() => void refetch()} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
          </section>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6" aria-labelledby="game-score-title">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Trophy className="h-7 w-7" aria-hidden="true" /></span>
                <div>
                  <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">{readableGameType(result.game_type)}</p>
                  <h2 id="game-score-title" className="text-3xl font-bold text-brown-950 dark:text-white">{result.score} points</h2>
                  <span className="mt-1 flex items-center gap-0.5" aria-label={`${result.stars || 0} out of 3 stars`}>
                    {[1, 2, 3].map((star) => <Star key={star} className={`h-5 w-5 ${star <= (result.stars || 0) ? 'fill-amber-400 text-amber-400' : 'text-cream-300 dark:text-slate-600'}`} aria-hidden="true" />)}
                  </span>
                </div>
              </div>
              <dl className="mt-5 grid gap-3 border-t border-cream-200 pt-4 text-sm dark:border-slate-700 sm:grid-cols-2">
                <div><dt className="font-semibold text-brown-500 dark:text-gray-400">Played</dt><dd className="mt-1 flex items-center gap-2 text-brown-800 dark:text-white"><Calendar className="h-4 w-4" aria-hidden="true" />{formatDate(result.created_at)}</dd></div>
                <div><dt className="font-semibold text-brown-500 dark:text-gray-400">Time</dt><dd className="mt-1 flex items-center gap-2 text-brown-800 dark:text-white"><Clock className="h-4 w-4" aria-hidden="true" />{formatTime(result.time_seconds)}</dd></div>
                {result.moves !== null && <div><dt className="font-semibold text-brown-500 dark:text-gray-400">Moves</dt><dd className="mt-1 font-bold text-brown-800 dark:text-white">{result.moves}</dd></div>}
                {result.pairs !== null && <div><dt className="font-semibold text-brown-500 dark:text-gray-400">Pairs</dt><dd className="mt-1 font-bold text-brown-800 dark:text-white">{result.pairs}</dd></div>}
              </dl>
            </section>

            <ContentTrustNote trust={GAME_CONTENT_TRUST} />
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
              This score describes one game round, not overall language proficiency or mastery.
            </p>

            <section aria-labelledby="game-evidence-title">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Connected learning record</p>
              <h2 id="game-evidence-title" className="text-xl font-bold text-brown-950 dark:text-white">What this round supports</h2>
              <div className="mt-3 space-y-3">
                {topic ? (
                  <Link to={appRoutes.topic(topic.id)} className="flex min-h-20 items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 hover:border-coral-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700">
                    <Map className="h-5 w-5 flex-none text-coral-700 dark:text-teal-300" aria-hidden="true" />
                    <span><span className="block font-bold text-brown-950 dark:text-white">{topic.title}</span><span className="text-sm text-brown-600 dark:text-gray-300">Return to the source topic</span></span>
                  </Link>
                ) : (
                  <p className="rounded-2xl border border-cream-200 bg-white p-4 text-sm text-brown-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300">This older result has no saved topic relationship. Its score remains available without being reclassified.</p>
                )}

                {result.concept_ids.length > 0 && topic && (
                  <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="font-bold text-brown-950 dark:text-white">Exact cards used in this round</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.concept_ids.map((conceptId) => {
                        const cardIndex = findCuratedConceptIndex(result.category_id, conceptId);
                        if (cardIndex === null) return null;
                        return (
                          <Link key={conceptId} to={withGameConceptReview(result.category_id, conceptId, result.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-coral-200 bg-coral-50 px-3 text-sm font-semibold text-coral-800 hover:bg-coral-100 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-200">
                            <Layers3 className="h-4 w-4" aria-hidden="true" />Review card {cardIndex + 1}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link to={appRoutes.games} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700">Play another game</Link>
              <Link to={backTo} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cream-300 bg-white px-5 font-semibold text-brown-800 hover:bg-cream-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white">Return</Link>
            </div>
          </div>
        )}
      </main>
    </LearnerPageShell>
  );
}
