import { describe, expect, it } from 'vitest';
import { buildLearningActivityProperties, getLearningDurationBucket } from './learningAnalytics';

describe('learning analytics allowlist', () => {
  it('emits only stable, answer-text-free properties', () => {
    const properties = buildLearningActivityProperties(
      {
        topicId: 'greetings',
        categoryId: 'greetings',
        topicTitle: 'Greetings & Basics',
        source: 'lesson',
        returnTo: '/learning',
      },
      { game_type: 'memory_match', score: 400, stars: 3, time_seconds: 74 },
    );

    expect(properties).toEqual({
      concept_id: 'v1:topic:greetings',
      activity_type: 'game:memory_match',
      success: true,
      duration_bucket: 'under_2m',
      source: 'lesson',
    });
    expect(Object.keys(properties).sort()).toEqual([
      'activity_type',
      'concept_id',
      'duration_bucket',
      'source',
      'success',
    ]);
  });

  it('uses the same coarse duration boundaries as the first-party ledger', () => {
    expect(getLearningDurationBucket(undefined)).toBe('unknown');
    expect(getLearningDurationBucket(119)).toBe('under_2m');
    expect(getLearningDurationBucket(120)).toBe('2_to_5m');
    expect(getLearningDurationBucket(301)).toBe('over_5m');
  });
});
