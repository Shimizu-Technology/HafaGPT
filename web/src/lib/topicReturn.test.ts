import { describe, expect, it } from 'vitest';
import { MAX_APP_URL_LENGTH } from './routes';
import { readTopicReturn, withTopicReturn } from './topicReturn';

describe('topic return context', () => {
  it('round-trips a known topic through an exact workspace destination', () => {
    const href = withTopicReturn('/stories/hafa-adai-maria', 'greetings');

    expect(href).toBe(
      '/stories/hafa-adai-maria?topic=greetings&return_to=%2Flearning%2Fgreetings',
    );
    expect(readTopicReturn(href.split('?')[1] || '')).toEqual({
      topicId: 'greetings',
      to: '/learning/greetings',
      label: 'Back to Greetings & Basics',
    });
  });

  it('rejects unknown, mismatched, external, and query-bearing destinations', () => {
    expect(readTopicReturn('?topic=unknown&return_to=%2Flearning%2Funknown')).toBeNull();
    expect(readTopicReturn(
      '?topic=greetings&return_to=%2Flearning%2Fgreetings',
      'family',
    )).toBeNull();
    expect(readTopicReturn(
      '?topic=greetings&return_to=%2F%2Fevil.example',
    )).toBeNull();
    expect(readTopicReturn(
      '?topic=greetings&return_to=%2Flearning%2Fgreetings%3Femail%3Dprivate',
    )).toBeNull();
  });

  it('does not attach context for an unknown topic', () => {
    expect(withTopicReturn('/quiz/greetings', 'unknown')).toBe('/quiz/greetings');
    expect(withTopicReturn('//evil.example', 'greetings')).toBe('/learning/greetings');
    expect(withTopicReturn(`/${'a'.repeat(2048)}`, 'greetings')).toBe('/learning/greetings');
  });

  it('replaces stale context keys before a destination hash', () => {
    const href = withTopicReturn(
      '/stories/hafa-adai-maria?topic=family&return_to=%2Flearning%2Ffamily#quiz',
      'greetings',
    );
    const parsed = new URL(href, 'https://hafagpt.local');

    expect(parsed.hash).toBe('#quiz');
    expect(parsed.searchParams.getAll('topic')).toEqual(['greetings']);
    expect(parsed.searchParams.getAll('return_to')).toEqual(['/learning/greetings']);
  });

  it('does not restore stale topic context when replacement exceeds the URL limit', () => {
    const prefix = '/stories/hafa-adai-maria?topic=family&return_to=%2Flearning%2Ffamily#';
    const boundaryPath = `${prefix}${'x'.repeat(MAX_APP_URL_LENGTH - prefix.length)}`;

    expect(boundaryPath).toHaveLength(MAX_APP_URL_LENGTH);
    expect(withTopicReturn(boundaryPath, 'daily-life')).toBe('/learning/daily-life');
  });
});
