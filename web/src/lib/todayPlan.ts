import type {
  RecommendedData,
  SRSummaryData,
  WeakAreasData,
  XPData,
} from '../hooks/useHomepageData';
import type { UserPreferences } from '../hooks/useUserPreferences';
import { DEFAULT_DAILY_SESSION_MINUTES } from '../data/learningPreferences';
import { ALL_TOPICS, getTopic } from '../data/learningPath';
import { getLessonPractice, withLearningContext } from './lessonPractice';
import { appRoutes } from './routes';

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
  const canonicalTopic = getTopic(topic.id);
  if (
    !canonicalTopic
    || canonicalTopic.flashcardCategory !== topic.flashcard_category
    || canonicalTopic.quizCategory !== topic.quiz_category
  ) {
    return path;
  }
  return withLearningContext(path, canonicalTopic, { source: 'today' });
}

export function buildTodayPlan({
  preferences,
  recommended,
  srSummary,
  weakAreas,
  xp,
}: TodayPlanInput): TodayPlan {
  // Time is an estimate for planning, never a claim about activity recorded.
  const budgetMinutes = xp?.daily_goal_minutes || DEFAULT_DAILY_SESSION_MINUTES;
  const fallback = ALL_TOPICS[0];
  const topic = recommended?.topic ?? (recommended?.recommendation_type === 'complete' ? {
    ...fallback, estimated_minutes: fallback.estimatedMinutes,
    flashcard_category: fallback.flashcardCategory, quiz_category: fallback.quizCategory,
  } : null);
  const canonicalTopic = topic ? getTopic(topic.id) : undefined;
  const dueCount = srSummary?.due_today ?? 0;
  const activities: TodayActivity[] = [];
  if (dueCount > 0) {
    activities.push({
      id: 'due-review', kind: 'review', title: `Review ${dueCount} due card${dueCount === 1 ? '' : 's'}`,
      description: 'Refresh what you learned before adding more.',
      minutes: Math.min(4, Math.max(2, Math.ceil(dueCount / 5))), to: '/flashcards/review',
    });
  } else if (weakAreas?.recommendation) {
    const weak = weakAreas.recommendation;
    const weakTopic = ALL_TOPICS.find(candidate => candidate.quizCategory === weak.category_id);
    activities.push({
      id: `weak-${weak.category_id}`, kind: 'review', title: `Review ${weak.category_title || weak.category_id}`,
      description: 'Revisit a weaker area with a short quiz.', minutes: 4,
      to: weakTopic ? withLearningContext(appRoutes.quiz(weak.category_id), weakTopic, { source: 'today' })
        : appRoutes.quiz(weak.category_id),
    });
  }
  if (topic) {
    activities.push({
      id: `lesson-${topic.id}`, kind: 'lesson',
      title: `${recommended?.recommendation_type === 'complete' ? 'Revisit' : recommended?.recommendation_type === 'continue' ? 'Continue' : 'Learn'} ${topic.title}`,
      description: preferences.reading_support === 'audio_pictures'
        ? 'Listen to each card, reveal its meaning, then try a short quiz.' : topic.description,
      minutes: topic.estimated_minutes, to: withTodayContext(appRoutes.lesson(topic.id), topic),
    });
    const practice = canonicalTopic ? getLessonPractice(canonicalTopic, { source: 'today' }) : null;
    if (practice) activities.push({
      id: `use-${topic.id}`, kind: 'play', title: `Use ${topic.title}`,
      description: practice.description, minutes: 3, to: practice.href,
    });
  }
  if (!activities.length) activities.push({
    id: 'review-path', kind: 'lesson', title: 'Choose a topic to revisit',
    description: 'You have completed the path. Keep recall fresh with another lesson.',
    minutes: 5, to: '/learning',
  });
  return {
    budgetMinutes, remainingMinutes: budgetMinutes,
    totalMinutes: activities.reduce((sum, activity) => sum + activity.minutes, 0),
    goalComplete: false, goalDisabled: false,
    headline: 'Your session for today',
    summary: 'Review, learn, and use what you know. Finish at your own pace.',
    primaryLabel: 'Start today', activities,
  };
}
