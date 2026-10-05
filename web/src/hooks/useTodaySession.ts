import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import type { TodayPlan } from '../lib/todayPlan';
import {
  completeTodayStep, guamDay, loadTodaySession, readTodayStep, saveTodaySession,
  TODAY_SESSION_CHANGED, withTodayStep, type TodaySession, type TodayStep,
} from '../lib/todaySession';

/** Browser-local continuity, isolated by learner and Guam day. Server results remain authoritative. */
export function useTodaySessionProgress(plan?: TodayPlan | null) {
  const { userId } = useAuth();
  const location = useLocation();
  const day = guamDay();
  const scope = `${userId ?? 'guest'}:${day}`;
  const [state, setState] = useState<{ scope: string; session: TodaySession | null }>(() => ({
    scope, session: userId ? loadTodaySession(userId, day) : null,
  }));
  const [storageAvailable, setStorageAvailable] = useState(true);
  const session = state.scope === scope ? state.session : null;
  const currentState = useRef(state);
  useEffect(() => { currentState.current = state; }, [state]);

  useEffect(() => {
    if (!userId) {
      setState({ scope, session: null });
      return;
    }
    const existing = loadTodaySession(userId, day);
    const memorySession = currentState.current.scope === scope ? currentState.current.session : null;
    const next = existing ?? memorySession ?? (plan && plan.activities.length ? {
      version: 1 as const, day, plan, completed: [],
    } : null);
    setState({ scope, session: next });
    if (!existing && next) setStorageAvailable(saveTodaySession(userId, next));
  }, [userId, day, scope, plan]);

  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      const saved = loadTodaySession(userId, day);
      if (saved) setState({ scope, session: saved });
    };
    window.addEventListener('storage', refresh);
    window.addEventListener(TODAY_SESSION_CHANGED, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(TODAY_SESSION_CHANGED, refresh);
    };
  }, [userId, day, scope]);

  const completeStep = useCallback((requestedStep?: TodayStep) => {
    const step = readTodayStep(location.search);
    if (!userId || !step || (requestedStep && requestedStep !== step)) return;
    if (new URLSearchParams(location.search).get('today_day') !== day) return;
    const current = loadTodaySession(userId, day) ?? session;
    if (!current || current.day !== day) return;
    const next = completeTodayStep(current, step, location.pathname);
    if (next === current) return;
    setState({ scope, session: next });
    setStorageAvailable(saveTodaySession(userId, next));
  }, [userId, day, session, scope, location.search, location.pathname]);

  return { session, completeStep, contextualHref: withTodayStep, storageAvailable };
}
