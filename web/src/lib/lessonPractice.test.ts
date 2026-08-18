import { describe, expect, it } from 'vitest';
import { ALL_TOPICS, getTopic } from '../data/learningPath';
import { getLessonPractice, readLearningGameContext } from './lessonPractice';

describe('lesson practice handoff', () => {
  it('gives every configured lesson a supported, allowlisted practice destination', () => {
    for (const topic of ALL_TOPICS) {
      const practice = getLessonPractice(topic);
      expect(practice, topic.id).not.toBeNull();
      expect(practice?.href).toMatch(/^\/games\/(memory|scramble)\?/);
      expect(readLearningGameContext(practice?.href.split('?')[1] || '')).toEqual({
        topicId: topic.id,
        categoryId: topic.flashcardCategory,
        topicTitle: topic.title,
        source: 'lesson',
      });
    }
  });

  it('rejects arbitrary, mismatched, or personal query context', () => {
    expect(readLearningGameContext('?topic=my-child&category=my-child&source=lesson')).toBeNull();
    expect(readLearningGameContext('?topic=greetings&category=family&source=lesson')).toBeNull();
    expect(readLearningGameContext('?topic=greetings&category=greetings&source=campaign')).toBeNull();
    expect(getTopic('greetings')).toBeDefined();
  });
});
