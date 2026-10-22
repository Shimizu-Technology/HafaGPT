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
const warnBeforeUnload = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = '';
};
const notify = () => {
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
  drafts.clear();
  notify();
}

export function useSettingsDraft(accountKey: string | undefined) {
  const draft = useSyncExternalStore(subscribe, () => accountKey ? drafts.get(accountKey) : undefined);
  return {
    draft,
    updateDraft: (patch: SettingsDraft) => {
      if (!accountKey || accountKey !== currentAccount) return;
      drafts.set(accountKey, { ...drafts.get(accountKey), ...patch });
      notify();
    },
    clearDraft: () => {
      if (accountKey) drafts.delete(accountKey);
      notify();
    },
  };
}
