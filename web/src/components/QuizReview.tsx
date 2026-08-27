import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Brain,
  Calendar,
  Check,
  ClipboardCheck,
  Clock,
  Lightbulb,
  Loader2,
  Layers3,
  RefreshCw,
  RotateCcw,
  Trophy,
  X,
} from 'lucide-react';
import { useQuizResultDetail } from '../hooks/useQuizQuery';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ALL_TOPICS } from '../data/learningPath';
import { withConceptReview } from '../lib/conceptReview';
import { appRoutes, safeInternalReturnPath } from '../lib/routes';

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

function resultMessage(percentage: number) {
  if (percentage >= 80) return 'Strong result';
  if (percentage >= 60) return 'Good progress';
  return 'Keep practicing';
}

export function QuizReview() {
  const { resultId } = useParams<{ resultId: string }>();
  const [searchParams] = useSearchParams();
  const { data: result, isLoading, error, refetch } = useQuizResultDetail(resultId);
  const backTo = safeInternalReturnPath(
    searchParams.get('return_to'),
    '/dashboard/quiz-history',
  );
  const returnsToTopic = backTo.startsWith(appRoutes.topic(''));
  const backLabel = returnsToTopic ? 'Back to topic' : 'Back to quiz history';
  const unavailableReturnLabel = returnsToTopic ? 'Return to topic' : 'Quiz history';
  const isDictionaryQuiz = result?.category_id?.startsWith('dict-');
  const resultTopic = result
    ? ALL_TOPICS.find((topic) => topic.id === result.learning_topic_id)
      ?? ALL_TOPICS.find((topic) => topic.quizCategory === result.category_id)
    : undefined;
  const conceptCategory = resultTopic?.flashcardCategory;

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={result?.category_title || 'Quiz review'}
        subtitle="See what you knew and what to practice next."
        icon={ClipboardCheck}
        backTo={backTo}
        backLabel={backLabel}
        maxWidthClassName="max-w-2xl"
        trailing={
          isDictionaryQuiz ? (
            <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              Dictionary
            </span>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:py-8">
        {isLoading ? (
          <section
            className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800"
            aria-live="polite"
          >
            <Loader2
              className="h-8 w-8 animate-spin text-coral-600 motion-reduce:animate-none dark:text-teal-300"
              aria-hidden="true"
            />
            <p className="mt-4 font-medium text-brown-600 dark:text-gray-300">Loading your quiz review…</p>
          </section>
        ) : error || !result ? (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-center dark:border-red-900 dark:bg-slate-800">
            <h2 className="text-xl font-bold text-brown-950 dark:text-white">
              {error ? 'Quiz review is unavailable' : 'Quiz result not found'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">
              Your saved progress has not been changed. Try again or return to your quiz history.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              {error && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
                </button>
              )}
              <Link
                to={backTo}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cream-300 bg-white px-5 font-semibold text-brown-800 hover:bg-cream-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                {unavailableReturnLabel}
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section
              className="rounded-3xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6"
              aria-labelledby="quiz-score-title"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-14 w-14 flex-none items-center justify-center rounded-2xl ${result.percentage >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300' : result.percentage >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'}`}
                >
                  <Trophy className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">
                    {resultMessage(result.percentage)}
                  </p>
                  <h2 id="quiz-score-title" className="text-3xl font-bold text-brown-950 dark:text-white">
                    {Math.round(result.percentage)}%
                  </h2>
                  <p className="text-sm text-brown-600 dark:text-gray-400">
                    {result.score} of {result.total} correct
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 border-t border-cream-200 pt-4 text-sm text-brown-600 dark:border-slate-700 dark:text-gray-300 sm:grid-cols-2">
                <time className="flex items-center gap-2" dateTime={result.created_at}>
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {formatDate(result.created_at)}
                </time>
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {formatTime(result.time_spent_seconds)}
                </span>
              </div>
            </section>

            <section className="mt-6" aria-labelledby="question-review-title">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Answer details</p>
              <h2 id="question-review-title" className="mb-4 text-xl font-bold text-brown-950 dark:text-white">
                Question review
              </h2>
              {result.answers.length > 0 ? (
                <ol className="space-y-4">
                  {result.answers.map((answer, index) => (
                    <li
                      key={answer.id}
                      className={`rounded-2xl border p-4 sm:p-5 ${answer.is_correct ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${answer.is_correct ? 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                        >
                          {answer.is_correct ? (
                            <Check className="h-5 w-5" aria-label="Correct" />
                          ) : (
                            <X className="h-5 w-5" aria-label="Incorrect" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-gray-400">
                            Question {index + 1} · {answer.question_type.replace('_', ' ')}
                          </p>
                          <h3 className="mt-2 font-bold leading-relaxed text-brown-950 dark:text-white">
                            {answer.question_text}
                          </h3>
                          <dl className="mt-4 space-y-2 text-sm">
                            <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                              <dt className="font-semibold text-brown-600 dark:text-gray-300">Your answer</dt>
                              <dd
                                className={
                                  answer.is_correct
                                    ? 'text-green-800 dark:text-green-300'
                                    : 'text-red-800 dark:text-red-300'
                                }
                              >
                                {answer.user_answer}
                              </dd>
                            </div>
                            {!answer.is_correct && (
                              <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                                <dt className="font-semibold text-brown-600 dark:text-gray-300">Correct answer</dt>
                                <dd className="text-green-800 dark:text-green-300">{answer.correct_answer}</dd>
                              </div>
                            )}
                          </dl>
                          {answer.explanation && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-sm leading-relaxed text-brown-700 dark:bg-slate-800/60 dark:text-gray-300">
                              <Lightbulb
                                className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-300"
                                aria-hidden="true"
                              />
                              <p>{answer.explanation}</p>
                            </div>
                          )}
                          {!answer.is_correct && answer.concept_id && conceptCategory && (
                            <Link
                              to={withConceptReview(
                                conceptCategory,
                                answer.concept_id,
                                result.id,
                              )}
                              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-800 dark:bg-slate-800 dark:text-red-200 dark:hover:bg-red-950/40"
                            >
                              <Layers3 className="h-4 w-4" aria-hidden="true" />
                              Review this exact card
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
                  <Brain className="mx-auto h-8 w-8 text-purple-600 dark:text-purple-300" aria-hidden="true" />
                  <h3 className="mt-3 font-bold text-brown-950 dark:text-white">Answer details were not saved</h3>
                  <p className="mt-1 text-sm text-brown-600 dark:text-gray-400">
                    Some older quiz attempts only include the final score.
                  </p>
                </div>
              )}
            </section>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                to={`/quiz/${result.category_id}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
              </Link>
              <Link
                to="/quiz"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cream-300 bg-white px-5 font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                Choose another quiz
              </Link>
            </div>
          </>
        )}
      </main>
    </LearnerPageShell>
  );
}
