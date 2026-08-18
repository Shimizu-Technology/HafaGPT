import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Gamepad2,
  Headphones,
  MessageCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TodayActivityKind, TodayPlan } from '../lib/todayPlan';

const ACTIVITY_ICONS: Record<TodayActivityKind, LucideIcon> = {
  review: RotateCcw,
  lesson: BookOpen,
  listen: Headphones,
  practice: MessageCircle,
  play: Gamepad2,
};

interface TodayPlanCardProps {
  plan: TodayPlan;
  isLoading?: boolean;
}

export function TodayPlanCard({ plan, isLoading = false }: TodayPlanCardProps) {
  if (isLoading) {
    return (
      <section aria-label="Loading today's plan" className="animate-pulse rounded-3xl border border-cream-200 bg-white p-5 motion-reduce:animate-none dark:border-slate-700 dark:bg-slate-800 sm:p-7">
        <div className="h-4 w-24 rounded bg-cream-200 dark:bg-slate-700" />
        <div className="mt-4 h-8 w-52 rounded bg-cream-200 dark:bg-slate-700" />
        <div className="mt-3 h-4 w-full max-w-md rounded bg-cream-100 dark:bg-slate-700" />
        <div className="mt-6 h-14 rounded-2xl bg-cream-100 dark:bg-slate-700" />
      </section>
    );
  }

  if (plan.goalDisabled) {
    return (
      <section className="rounded-3xl border border-cream-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
        <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Today</p>
        <h2 className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">{plan.headline}</h2>
        <p className="mt-2 text-brown-700 dark:text-gray-300">{plan.summary}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link to="/learning" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 py-2.5 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2">
            {plan.primaryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/settings" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cream-300 px-4 py-2.5 font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700">
            Set a time goal
          </Link>
        </div>
      </section>
    );
  }

  if (plan.goalComplete) {
    return (
      <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/30 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-teal-600 text-white">
            <Check className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Today</p>
            <h2 className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">{plan.headline}</h2>
            <p className="mt-2 text-brown-700 dark:text-gray-300">{plan.summary}</p>
            <Link
              to="/learning"
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              {plan.primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const primary = plan.activities[0];

  return (
    <section className="overflow-hidden rounded-3xl border border-coral-200 bg-white shadow-sm dark:border-ocean-800 dark:bg-slate-800">
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-coral-700 dark:text-ocean-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Today
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1.5 text-sm font-medium text-brown-700 dark:bg-slate-700 dark:text-gray-200">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {plan.totalMinutes} min
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-brown-950 dark:text-white sm:text-3xl">
          {plan.headline}
        </h2>
        <p className="mt-2 max-w-2xl text-brown-600 dark:text-gray-300">{plan.summary}</p>

        <ol className="mt-6 space-y-2" aria-label="Today's learning steps">
          {plan.activities.map((activity, index) => {
            const Icon = ACTIVITY_ICONS[activity.kind];
            return (
              <li key={activity.id}>
                <Link
                  to={activity.to}
                  className="group flex min-h-16 items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50 p-3 transition-colors hover:border-coral-300 hover:bg-coral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-ocean-600 dark:hover:bg-ocean-950/30"
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white text-coral-700 shadow-sm dark:bg-slate-800 dark:text-ocean-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-brown-900 dark:text-white">
                      {index + 1}. {activity.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-brown-600 dark:text-gray-400">
                      {activity.description}
                    </span>
                  </span>
                  <span className="flex-none text-xs font-semibold text-brown-500 dark:text-gray-400">
                    {activity.minutes} min
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {primary && (
        <div className="border-t border-coral-100 bg-coral-50 px-5 py-4 dark:border-ocean-900 dark:bg-ocean-950/30 sm:px-7">
          <Link
            to={primary.to}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 py-2.5 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-ocean-500 dark:hover:bg-ocean-600 sm:w-auto"
          >
            {plan.primaryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
