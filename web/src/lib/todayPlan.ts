import type {
  RecommendedData,
  SRSummaryData,
  WeakAreasData,
  XPData,
} from '../hooks/useHomepageData';
import type { UserPreferences } from '../hooks/useUserPreferences';
import { DEFAULT_DAILY_SESSION_MINUTES } from '../data/learningPreferences';

export type TodayActivityKind = 'review' | 'lesson' | 'listen' | 'practice' | 'play';

export interface TodayActivity {
  id: string;
  kind: TodayActivityKind;
  title: string;
  description: string;
  minutes: number;
  to: string;
}

export interface TodayPlan {
  budgetMinutes: number;
  remainingMinutes: number;
  totalMinutes: number;
  goalComplete: boolean;
  goalDisabled: boolean;
  headline: string;
  summary: string;
  primaryLabel: string;
  activities: TodayActivity[];
}

export interface TodayPlanInput {
  preferences: UserPreferences;
  recommended: RecommendedData | null;
  srSummary: SRSummaryData | null;
  weakAreas: WeakAreasData | null;
  xp: XPData | null;
}

function withTodayContext(path: string, topic: NonNullable<RecommendedData['topic']>) {
  const params = new URLSearchParams({
    topic: topic.id,
    category: topic.flashcard_category,
    source: 'today',
  });
  return `${path}?${params.toString()}`;
}

function goalActivity(preferences: UserPreferences): TodayActivity {
  switch (preferences.learning_goal) {
    case 'conversation':
      return {
        id: 'goal-conversation',
        kind: 'practice',
        title: 'Say it out loud',
        description: 'Practice a short everyday conversation.',
        minutes: 4,
        to: '/practice',
      };
    case 'culture':
      return {
        id: 'goal-culture',
        kind: 'practice',
        title: 'Read with culture',
        description: 'Explore a Chamorro story and its meaning.',
        minutes: 4,
        to: '/stories',
      };
    case 'family':
      return {
        id: 'goal-family',
        kind: 'practice',
        title: 'Practice together',
        description: 'Use a small flashcard set with family.',
        minutes: 4,
        to: '/flashcards',
      };
    case 'travel':
      return {
        id: 'goal-travel',
        kind: 'practice',
        title: 'Try a daily-life phrase',
        description: 'Practice useful Chamorro for life around Guam.',
        minutes: 4,
        to: '/chat?intent=practice',
      };
    default:
      return {
        id: 'goal-play',
        kind: 'play',
        title: 'Finish with play',
        description: 'Strengthen recall with a short word game.',
        minutes: 4,
        to: '/games',
      };
  }
}

function fitActivities(candidates: TodayActivity[], budget: number): TodayActivity[] {
  const selected: TodayActivity[] = [];
  let used = 0;

  for (const candidate of candidates) {
    const remaining = budget - used;
    if (remaining <= 0) break;

    if (candidate.minutes <= remaining) {
      selected.push(candidate);
      used += candidate.minutes;
      continue;
    }

    // Activities link to complete learning experiences. Never relabel a full
    // lesson or review as shorter than it really is just to fill the budget.
  }

  return selected;
}

export function buildTodayPlan({
  preferences,
  recommended,
  srSummary,
  weakAreas,
  xp,
}: TodayPlanInput): TodayPlan {
  // XP is the single source of truth for both the minutes counter and goal.
  // A stored zero is an explicit disabled state; only a missing XP record uses
  // the safe default for a new account.
  const goalDisabled = xp?.daily_goal_minutes === 0;
  const budgetMinutes = xp?.daily_goal_minutes ?? DEFAULT_DAILY_SESSION_MINUTES;
  const minutesAlreadyLearned = Math.max(0, xp?.today_minutes ?? 0);
  const remainingMinutes = Math.max(0, budgetMinutes - minutesAlreadyLearned);

  if (goalDisabled) {
    return {
      budgetMinutes: 0,
      remainingMinutes: 0,
      totalMinutes: 0,
      goalComplete: false,
      goalDisabled: true,
      headline: 'Learn at your own pace',
      summary: 'Your daily time goal is off. Choose anything that feels useful today.',
      primaryLabel: 'Explore learning',
      activities: [],
    };
  }

  if (remainingMinutes === 0) {
    return {
      budgetMinutes,
      remainingMinutes: 0,
      totalMinutes: 0,
      goalComplete: true,
      goalDisabled: false,
      headline: 'Daily goal complete',
      summary: `You reached your ${budgetMinutes}-minute goal. Explore anything that sounds fun next.`,
      primaryLabel: 'Choose another activity',
      activities: [],
    };
  }

  const candidates: TodayActivity[] = [];
  const topic = recommended?.topic ?? null;
  const dueCount = srSummary?.due_today ?? 0;
  const weakArea = weakAreas?.recommendation ?? null;

  if (dueCount > 0) {
    candidates.push({
      id: 'due-review',
      kind: 'review',
      title: `Review ${dueCount} due card${dueCount === 1 ? '' : 's'}`,
      description: 'Refresh what you learned before adding more.',
      minutes: Math.min(4, Math.max(2, Math.ceil(dueCount / 5))),
      to: '/flashcards/review',
    });
  }

  if (weakArea) {
    candidates.push({
      id: `weak-${weakArea.category_id}`,
      kind: 'review',
      title: `Strengthen ${weakArea.category_title || weakArea.category_id}`,
      description: 'Use a short quiz to revisit a weaker area.',
      minutes: 4,
      to: `/quiz/${encodeURIComponent(weakArea.category_id)}`,
    });
  }

  const lessonActivity: TodayActivity | null = topic ? {
    id: `lesson-${topic.id}`,
    kind: 'lesson',
    title: recommended?.recommendation_type === 'continue'
      ? `Continue ${topic.title}`
      : `Learn ${topic.title}`,
    description: topic.description,
    minutes: Math.min(8, Math.max(3, topic.estimated_minutes)),
    to: `/learn/${topic.id}`,
  } : null;

  const listenActivity: TodayActivity | null = topic ? {
    id: `listen-${topic.id}`,
    kind: 'listen',
    title: `Listen to ${topic.title}`,
    description: 'Hear the words, then reveal their meanings.',
    minutes: 3,
    to: `/flashcards/${encodeURIComponent(topic.flashcard_category)}`,
  } : null;

  if (preferences.reading_support === 'audio_pictures') {
    if (listenActivity) candidates.push(listenActivity);
    if (lessonActivity) candidates.push(lessonActivity);
  } else {
    if (lessonActivity) candidates.push(lessonActivity);
    if (listenActivity && remainingMinutes >= 15) candidates.push(listenActivity);
  }

  const goal = goalActivity(preferences);
  candidates.push(goal);

  if (topic && remainingMinutes >= 10) {
    candidates.push({
      id: `play-${topic.id}`,
      kind: 'play',
      title: `Play with ${topic.title}`,
      description: 'End with a quick memory challenge.',
      minutes: 3,
      to: withTodayContext('/games/memory', topic),
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      id: 'start-path',
      kind: 'lesson',
      title: 'Start a Chamorro lesson',
      description: 'Choose a guided topic and build from there.',
      minutes: Math.min(5, remainingMinutes),
      to: '/learning',
    });
  }

  const activities = fitActivities(candidates, remainingMinutes);
  if (activities.length === 0) {
    activities.push({
      id: 'quick-phrase',
      kind: 'practice',
      title: 'Practice one quick phrase',
      description: 'Ask for one short phrase and say it aloud.',
      minutes: remainingMinutes,
      to: '/chat?intent=practice',
    });
  }
  const totalMinutes = activities.reduce((sum, activity) => sum + activity.minutes, 0);
  const first = activities[0];

  return {
    budgetMinutes,
    remainingMinutes,
    totalMinutes,
    goalComplete: false,
    goalDisabled: false,
    headline: minutesAlreadyLearned > 0 ? 'Keep today going' : 'Your plan for today',
    summary: first
      ? `${activities.length} focused step${activities.length === 1 ? '' : 's'} chosen for your goals and pace.`
      : 'Choose a learning activity when you are ready.',
    primaryLabel: first?.kind === 'lesson' && recommended?.recommendation_type === 'continue'
      ? 'Resume learning'
      : 'Start today',
    activities,
  };
}
