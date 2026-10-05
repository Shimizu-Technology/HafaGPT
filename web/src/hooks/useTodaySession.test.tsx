import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodaySessionProgress } from './useTodaySession';
import { guamDay, loadTodaySession, saveTodaySession, withTodayStep } from '../lib/todaySession';
import type { TodayPlan } from '../lib/todayPlan';

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ userId: 'learner' }) }));
const plan: TodayPlan = {
  budgetMinutes: 10, remainingMinutes: 10, totalMinutes: 3, goalComplete: false,
  goalDisabled: false, headline: 'Today', summary: '', primaryLabel: 'Start',
  activities: [{ id: 'use-greetings', kind: 'play', title: 'Use Greetings', description: 'Practice', minutes: 3, to: '/games/memory?topic=greetings&category=greetings&source=today' }],
};
function setup() {
  const path = withTodayStep(plan.activities[0].to, 'use');
  saveTodaySession('learner', { version: 1, day: guamDay(), plan, completed: [] });
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  return renderHook(() => useTodaySessionProgress(), { wrapper });
}

describe('Today completion after a delayed save', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-05T13:59:00Z')); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('marks the planned step after a save resolves during the same Guam day', async () => {
    const { result } = setup();
    let resolveSave!: () => void;
    const saved = new Promise<void>(resolve => { resolveSave = resolve; });
    const finish = result.current.completeStep;
    const pending = saved.then(() => finish('use'));
    expect(loadTodaySession('learner')?.completed).toEqual([]);
    await act(async () => { resolveSave(); await pending; });
    expect(loadTodaySession('learner')?.completed).toEqual(['use-greetings']);
  });

  it('does not overwrite a new day plan when yesterday\'s pending save resolves', async () => {
    const { result } = setup();
    let resolveSave!: () => void;
    const saved = new Promise<void>(resolve => { resolveSave = resolve; });
    const finishYesterday = result.current.completeStep;
    const pending = saved.then(() => finishYesterday('use'));
    vi.setSystemTime(new Date('2026-10-05T14:01:00Z'));
    const nextPlan = { ...plan, activities: [{ ...plan.activities[0], id: 'use-numbers', to: '/games/memory?topic=numbers&category=numbers&source=today' }] };
    // A different tab can persist its new day plan before this game's save returns.
    act(() => { saveTodaySession('learner', { version: 1, day: guamDay(), plan: nextPlan, completed: [] }); });
    await act(async () => { resolveSave(); await pending; });
    expect(loadTodaySession('learner')).toMatchObject({ day: '2026-10-06', completed: [], plan: nextPlan });
  });
  it('keeps in-memory completion when browser storage fails instead of reloading the old snapshot', async () => {
    const { result } = setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    act(() => { result.current.completeStep('use'); });
    expect(result.current.storageAvailable).toBe(false);
    expect(result.current.session?.completed).toEqual(['use-greetings']);
    expect(loadTodaySession('learner')?.completed).toEqual([]);
    act(() => { result.current.completeStep('use'); });
    expect(result.current.session?.completed).toEqual(['use-greetings']);
  });

});
