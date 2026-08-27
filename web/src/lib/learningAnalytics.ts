import posthog from 'posthog-js';
import { LearningGameContext } from './lessonPractice';

export type LearningDurationBucket = 'under_2m' | '2_to_5m' | 'over_5m' | 'unknown';

export interface LearningActivityProperties {
  concept_id: string;
  activity_type: string;
  success: boolean;
  duration_bucket: LearningDurationBucket;
  source: LearningGameContext['source'];
  evidence_scope: 'topic';
}

export function getLearningDurationBucket(seconds?: number): LearningDurationBucket {
  if (seconds === undefined || seconds < 0) return 'unknown';
  if (seconds < 120) return 'under_2m';
  if (seconds <= 300) return '2_to_5m';
  return 'over_5m';
}

export function buildLearningActivityProperties(
  context: LearningGameContext,
  result: { game_type: string; score: number; stars?: number; time_seconds?: number },
): LearningActivityProperties {
  return {
    concept_id: `v1:topic:${context.topicId}`,
    activity_type: `game:${result.game_type}`,
    success: result.stars !== undefined ? result.stars >= 2 : result.score > 0,
    duration_bucket: getLearningDurationBucket(result.time_seconds),
    source: context.source,
    evidence_scope: 'topic',
  };
}

export function captureLearningActivity(properties: LearningActivityProperties): void {
  try {
    posthog.capture('learning_activity_completed', properties);
  } catch (error) {
    // Analytics must never turn a successfully persisted learning result into
    // a failed game mutation or duplicate retry.
    if (import.meta.env.DEV) {
      console.warn('Learning analytics capture failed', error);
    }
  }
}
