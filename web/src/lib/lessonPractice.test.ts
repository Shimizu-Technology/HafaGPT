import { describe, expect, it } from 'vitest';
import { ALL_TOPICS, getTopic } from '../data/learningPath';
import { getLearningGameReturn, getLessonPractice, readLearningGameContext } from './lessonPractice';

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
        returnTo: '/learning',
      });
    }
  });

  it('keeps Today as the source when a lesson hands off to practice', () => {
    const topic = getTopic('greetings');
    expect(topic).toBeDefined();

    const practice = getLessonPractice(topic!, { source: 'today', returnTo: '/' });
    expect(readLearningGameContext(practice?.href.split('?')[1] || '')).toEqual({
      topicId: 'greetings',
      categoryId: 'greetings',
      topicTitle: 'Greetings & Basics',
      source: 'today',
      returnTo: '/',
    });
  });

  it('rejects arbitrary, mismatched, or personal query context', () => {
    expect(readLearningGameContext('?topic=my-child&category=my-child&source=lesson')).toBeNull();
    expect(readLearningGameContext('?topic=greetings&category=family&source=lesson')).toBeNull();
    expect(readLearningGameContext('?topic=greetings&category=greetings&source=campaign')).toBeNull();
    expect(getTopic('greetings')).toBeDefined();
  });

  it('restores an allowlisted internal source and rejects open redirects', () => {
    const today = readLearningGameContext(
      '?topic=greetings&category=greetings&source=today&return_to=%2F',
    );
    const hostile = readLearningGameContext(
      '?topic=greetings&category=greetings&source=today&return_to=%2F%2Fevil.example',
    );

    expect(getLearningGameReturn(today)).toEqual({
      to: '/',
      label: 'Back to Today',
    });
    expect(getLearningGameReturn(hostile)).toEqual({
      to: '/',
      label: 'Back to Today',
    });
    expect(getLearningGameReturn(null)).toEqual({
      to: '/games',
      label: 'Back to games',
    });
  });

  it('bounds the encoded practice destination and rejects hostile context before launch', () => {
    const topic = getTopic('greetings');
    expect(topic).toBeDefined();

    const oversized = getLessonPractice(topic!, {
      source: 'lesson',
      returnTo: `/learning?return_to=${'a'.repeat(2048)}`,
    });
    const hostile = getLessonPractice(topic!, {
      source: 'today',
      returnTo: '//evil.example',
    });

    expect(oversized?.href.length).toBeLessThanOrEqual(2048);
    expect(readLearningGameContext(oversized?.href.split('?')[1] || '')?.returnTo)
      .toBe('/learning');
    expect(readLearningGameContext(hostile?.href.split('?')[1] || '')?.returnTo)
      .toBe('/');
  });

  it('does not carry arbitrary same-origin or personal query context', () => {
    const topic = getTopic('greetings');
    expect(topic).toBeDefined();

    const launched = getLessonPractice(topic!, {
      source: 'today',
      returnTo: '/?email=learner@example.com',
    });
    const parsed = readLearningGameContext(
      '?topic=greetings&category=greetings&source=lesson&return_to=%2Flearning%3Fuser_id%3Dprivate',
    );

    expect(launched?.href).not.toContain('email');
    expect(readLearningGameContext(launched?.href.split('?')[1] || '')?.returnTo).toBe('/');
    expect(parsed?.returnTo).toBe('/learning');
  });
});
