import type { TodayPlan } from './todayPlan';
import { browserStorage } from './browserStorage';
import { safeInternalReturnPath, setAppQueryParams } from './routes';

export type TodayStep = 'review' | 'learn' | 'use';
export interface TodaySession {
  version: 1;
  day: string;
  plan: TodayPlan;
  completed: string[];
}

export function guamDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Guam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function readTodayStep(search: string): TodayStep | null {
  const step = new URLSearchParams(search).get('today_step');
  return step === 'review' || step === 'learn' || step === 'use' ? step : null;
}

export function withTodayStep(path: string, step: TodayStep): string {
  return setAppQueryParams(path, { today_step: step, today_day: guamDay() }) ?? '/';
}

export function activityStep(activity: TodayPlan['activities'][number]): TodayStep {
  return activity.kind === 'review' ? 'review'
    : activity.kind === 'lesson' || activity.kind === 'listen' ? 'learn' : 'use';
}

const key = (owner: string) => `hafagpt_today_session_v1_${owner}`;
export const TODAY_SESSION_CHANGED = 'hafagpt:today-session';

export function loadTodaySession(owner: string, day = guamDay()): TodaySession | null {
  try {
    const raw = browserStorage.get(key(owner));
    if (!raw) return null;
    const saved = JSON.parse(raw) as TodaySession;
    if (saved.version !== 1 || saved.day !== day || !Array.isArray(saved.completed)
      || !saved.plan || !Array.isArray(saved.plan.activities)
      || saved.plan.activities.length > 5
      || !saved.plan.activities.every(activity => activity && typeof activity.id === 'string'
        && typeof activity.title === 'string' && typeof activity.description === 'string'
        && typeof activity.minutes === 'number' && Number.isFinite(activity.minutes)
        && ['review', 'lesson', 'listen', 'practice', 'play'].includes(activity.kind)
        && typeof activity.to === 'string' && safeInternalReturnPath(activity.to, '') === activity.to)
      || !saved.completed.every(id => typeof id === 'string'
        && saved.plan.activities.some(activity => activity.id === id))) return null;
    return saved;
  } catch {
    return null;
  }
}

export function saveTodaySession(owner: string, session: TodaySession): boolean {
  const saved = browserStorage.set(key(owner), JSON.stringify(session));
  if (saved) window.dispatchEvent(new Event(TODAY_SESSION_CHANGED));
  return saved;
}

/** Require the planned destination as well as its step, so unrelated activity cannot finish Today. */
export function completeTodayStep(session: TodaySession, step: TodayStep, pathname: string, search = ''): TodaySession {
  const actual = new URLSearchParams(search);
  const activity = session.plan.activities.find(candidate => {
    const planned = new URL(candidate.to, 'https://hafagpt.local');
    return activityStep(candidate) === step && planned.pathname === pathname
      && ['topic', 'category'].every(key => !planned.searchParams.has(key)
        || planned.searchParams.get(key) === actual.get(key));
  });
  if (!activity || session.completed.includes(activity.id)) return session;
  return { ...session, completed: [...session.completed, activity.id] };
}
