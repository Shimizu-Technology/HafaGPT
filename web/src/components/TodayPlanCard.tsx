import { ArrowRight, BookOpen, Check, Clock3, Gamepad2, Headphones, MessageCircle, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TodayActivityKind, TodayPlan } from '../lib/todayPlan';
import { activityStep } from '../lib/todaySession';
import { useTodaySessionProgress } from '../hooks/useTodaySession';

const ICONS = { review: RotateCcw, lesson: BookOpen, listen: Headphones, practice: MessageCircle, play: Gamepad2 } satisfies Record<TodayActivityKind, typeof BookOpen>;
interface TodayPlanCardProps { plan: TodayPlan | null; isLoading?: boolean }

export function TodayPlanCard({ plan, isLoading = false }: TodayPlanCardProps) {
  const { session, contextualHref, storageAvailable } = useTodaySessionProgress(plan);
  const current = session?.plan ?? plan;
  const completed = session?.completed ?? [];
  if (!current && isLoading) return (
    <section aria-label="Loading today's session" className="rounded-2xl border border-cream-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-brown-600 dark:text-gray-300">Preparing your session…</p>
    </section>
  );
  if (!current) return null;
  const next = current.activities.find(activity => !completed.includes(activity.id));
  const finished = !next && current.activities.length > 0;
  return (
    <section aria-labelledby="today-session-title" className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Today</p>
        <span className="inline-flex items-center gap-1.5 text-sm text-brown-600 dark:text-gray-300"><Clock3 className="h-4 w-4" aria-hidden="true" />About {current.totalMinutes} min · at your pace</span>
      </div>
      <h2 id="today-session-title" className="mt-3 text-2xl font-bold text-brown-900 dark:text-white">{finished ? 'Your session is complete' : 'Your session for today'}</h2>
      <p className="mt-2 text-sm text-brown-600 dark:text-gray-300">
        {finished ? 'You finished your planned steps. Review again when cards are due.' : 'One small step at a time. Your plan stays here while you learn.'}
      </p>
      <p className="mt-3 text-sm font-semibold text-brown-700 dark:text-gray-200" aria-live="polite">{completed.length} of {current.activities.length} steps complete</p>
      <ol className="mt-4 space-y-2" aria-label="Today's learning steps">
        {current.activities.map((activity, index) => {
          const done = completed.includes(activity.id);
          const Icon = done ? Check : ICONS[activity.kind];
          return <li key={activity.id}>
            <Link to={contextualHref(activity.to, activityStep(activity))} className="flex min-h-16 items-center gap-3 rounded-xl border border-cream-200 p-3 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:hover:bg-slate-700">
              <Icon className={`h-5 w-5 flex-none ${done ? 'text-teal-700 dark:text-teal-300' : 'text-coral-700 dark:text-teal-300'}`} aria-hidden="true" />
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-brown-900 dark:text-white">{index + 1}. {activity.title}{done ? ' — complete' : ''}</span><span className="mt-0.5 block text-xs text-brown-600 dark:text-gray-400">{activity.description}</span></span>
            </Link>
          </li>;
        })}
      </ol>
      {!storageAvailable && <p role="status" className="mt-3 text-sm text-amber-800 dark:text-amber-200">Browser storage is unavailable. Keep this page open to retain your session.</p>}
      <Link to={next ? contextualHref(next.to, activityStep(next)) : '/learning'} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-coral-700 px-5 py-2.5 font-semibold text-white hover:bg-coral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 sm:w-auto">
        {finished ? 'Choose another topic' : completed.length ? 'Continue today' : 'Start today'}<ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <p className="mt-3 text-xs text-brown-500 dark:text-gray-400">Session checklist saved on this browser. Time is an estimate; steps count after results save.</p>
    </section>
  );
}
