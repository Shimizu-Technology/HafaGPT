import { describe, expect, it } from 'vitest';
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
});
