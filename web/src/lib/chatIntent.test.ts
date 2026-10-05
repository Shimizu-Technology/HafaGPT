import { describe, expect, it } from 'vitest';
import { getChatIntentLabel, getChatIntentPlaceholder, normalizeChatIntent } from './chatIntent';

describe('tutor tasks', () => {
  it('keeps old links compatible while naming clear tasks', () => {
    expect(normalizeChatIntent('ask')).toBe('explain');
    expect(normalizeChatIntent(null)).toBe('explain');
    expect(normalizeChatIntent('unexpected')).toBe('explain');
    expect(getChatIntentLabel('ask')).toBe('Explain');
    expect(getChatIntentLabel('translate')).toBe('Translate');
    expect(getChatIntentLabel('practice')).toBe('Practice');
    expect(getChatIntentPlaceholder('translate')).toContain('message');
    expect(getChatIntentPlaceholder('practice')).toContain('topic');
  });
});
