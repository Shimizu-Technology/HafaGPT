import { describe, expect, it } from 'vitest';
import { ALL_TOPICS, getTopic } from '../data/learningPath';
import {
  getLearningGameReturn,
  getLessonPractice,
  readLearningGameContext,
  withLearningContext,
} from './lessonPractice';

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

  it('returns topic-launched practice to the exact topic workspace', () => {
    const topic = getTopic('greetings');
    expect(topic).toBeDefined();

    const practice = getLessonPractice(topic!, {
      source: 'topic',
      returnTo: '/learning/greetings',
    });
    const context = readLearningGameContext(practice?.href.split('?')[1] || '');

    expect(context).toEqual({
      topicId: 'greetings',
      categoryId: 'greetings',
      topicTitle: 'Greetings & Basics',
      source: 'topic',
      returnTo: '/learning/greetings',
    });
    expect(getLearningGameReturn(context)).toEqual({
      to: '/learning/greetings',
      label: 'Back to topic',
    });
    expect(withLearningContext('/learn/greetings', topic!, {
      source: 'topic',
      returnTo: '/learning/greetings',
    })).toBe(
      '/learn/greetings?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings',
    );
    expect(withLearningContext('//evil.example', topic!, { source: 'topic' }))
      .toBe('/learning/greetings');
    expect(withLearningContext(`/${'a'.repeat(2048)}`, topic!, { source: 'topic' }))
      .toBe('/learning/greetings');
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
    const mismatchedTopic = readLearningGameContext(
      '?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Ffamily',
    );

    expect(launched?.href).not.toContain('email');
    expect(readLearningGameContext(launched?.href.split('?')[1] || '')?.returnTo).toBe('/');
    expect(parsed?.returnTo).toBe('/learning');
    expect(mismatchedTopic?.returnTo).toBe('/learning/greetings');
  });

  it('replaces stale context keys and preserves hash ordering', () => {
    const topic = getTopic('greetings');
    expect(topic).toBeDefined();

    const href = withLearningContext(
      '/games/memory?topic=family&category=family&source=lesson&return_to=%2Flearning#score',
      topic!,
      { source: 'topic', returnTo: '/learning/greetings' },
    );
    const parsed = new URL(href, 'https://hafagpt.local');

    expect(parsed.pathname).toBe('/games/memory');
    expect(parsed.hash).toBe('#score');
    expect(parsed.searchParams.getAll('topic')).toEqual(['greetings']);
    expect(parsed.searchParams.getAll('category')).toEqual(['greetings']);
    expect(parsed.searchParams.getAll('source')).toEqual(['topic']);
    expect(parsed.searchParams.getAll('return_to')).toEqual(['/learning/greetings']);
  });
});
