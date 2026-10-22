import { useSyncExternalStore } from 'react';
import type { DailyGoalMinutes, LearnerMode, LearningGoal, ReadingSupport, SkillLevel } from '../data/learningPreferences';

export interface SettingsDraft {
  savePending?: boolean;
  saveError?: string;
  skill_level?: SkillLevel;
  learning_goal?: LearningGoal;
  learner_mode?: LearnerMode;
  reading_support?: ReadingSupport;
  sessionMinutes?: DailyGoalMinutes;
}

// Preferences only, in memory. Navigation (including browser Back) keeps them;
// sign-out/account changes clear them. Nothing is written to durable storage.
const drafts = new Map<string, SettingsDraft>();
const listeners = new Set<() => void>();
let currentAccount: string | undefined;
let generation = 0;
let snapshot = { generation, draft: undefined as SettingsDraft | undefined };
const warnBeforeUnload = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = '';
};
const notify = () => {
  snapshot = { generation, draft: currentAccount ? drafts.get(currentAccount) : undefined };
  // Keep the warning active even when Settings has unmounted.
  window.removeEventListener('beforeunload', warnBeforeUnload);
  if (drafts.size) window.addEventListener('beforeunload', warnBeforeUnload);
  listeners.forEach(listener => listener());
};
export function isSettingsSavePending(accountKey: string | undefined) {
  return Boolean(accountKey && drafts.get(accountKey)?.savePending);
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function scopeSettingsDrafts(accountKey: string | undefined) {
  if (accountKey === currentAccount) return;
  currentAccount = accountKey;
  generation += 1;
  drafts.clear();
  notify();
}

export function useSettingsDraft(accountKey: string | undefined) {
  const state = useSyncExternalStore(subscribe, () => snapshot);
  const isCurrent = () => Boolean(accountKey && accountKey === currentAccount && state.generation === generation);
  return {
    draft: accountKey === currentAccount ? state.draft : undefined,
    isCurrent,
    updateDraft: (patch: SettingsDraft) => {
      if (!isCurrent() || !accountKey) return;
      drafts.set(accountKey, { ...drafts.get(accountKey), ...patch });
      notify();
    },
    clearDraft: () => {
      if (!isCurrent() || !accountKey) return;
      drafts.delete(accountKey);
      notify();
    },
  };
}
