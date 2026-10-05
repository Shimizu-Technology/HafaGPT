import { browserStorage } from './browserStorage';
import { guamDay } from './todaySession';
export type LessonStep = 'intro' | 'flashcards' | 'quiz' | 'complete';
export interface LessonResume {
  step: LessonStep;
  cardIndex: number;
  viewed: number[];
  score: number | null;
  saved: boolean;
  xpPending?: boolean;
  updatedAt: number;
}
export const emptyLessonResume = (): LessonResume => ({ step: 'intro', cardIndex: 0, viewed: [0], score: null, saved: false, updatedAt: Date.now() });
const key = (owner: string, topic: string) => `hafagpt_lesson_resume_v1_${owner}_${topic}`;
export function loadLessonResume(owner: string, topic: string, cardCount: number): LessonResume {
  try {
    const raw = browserStorage.get(key(owner, topic));
    const value = raw ? JSON.parse(raw) as LessonResume : null;
    if (value && ['intro', 'flashcards', 'quiz', 'complete'].includes(value.step)
      && Number.isInteger(value.cardIndex) && value.cardIndex >= 0 && value.cardIndex < Math.max(1, cardCount)
      && Array.isArray(value.viewed) && value.viewed.every(index => Number.isInteger(index) && index >= 0 && index < cardCount)
      && (value.score === null || (Number.isInteger(value.score) && value.score >= 0 && value.score <= 100))
      && (value.xpPending === undefined || typeof value.xpPending === 'boolean')
      && typeof value.saved === 'boolean' && Number.isFinite(value.updatedAt)
      && Date.now() - value.updatedAt < 30 * 24 * 60 * 60 * 1000
      && (value.step !== 'complete' || value.score !== null)) {
      if (value.step === 'complete' && value.saved && !value.xpPending && guamDay(new Date(value.updatedAt)) !== guamDay()) return emptyLessonResume();
      return value;
    }
  } catch { /* Optional browser state may be malformed. */ }
  return emptyLessonResume();
}
export function saveLessonResume(owner: string, topic: string, value: LessonResume) {
  return browserStorage.set(key(owner, topic), JSON.stringify({ ...value, updatedAt: Date.now() }));
}
export function clearLessonResume(owner: string, topic: string) { browserStorage.remove(key(owner, topic)); }
