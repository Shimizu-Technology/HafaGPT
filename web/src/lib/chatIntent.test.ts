import { describe, expect, it } from 'vitest';
import { getChatIntentLabel, getChatIntentPlaceholder } from './chatIntent';

describe('getChatIntentPlaceholder', () => {
  it('guides translation, practice, and question entry points', () => {
    expect(getChatIntentPlaceholder('translate')).toBe('Paste a message…');
    expect(getChatIntentPlaceholder('practice')).toBe('Type a phrase to practice…');
    expect(getChatIntentPlaceholder('ask')).toBe('Ask a question…');
    expect(getChatIntentLabel('translate')).toBe('Translation help');
    expect(getChatIntentLabel('practice')).toBe('Practice help');
    expect(getChatIntentLabel('ask')).toBe('Chamorro & Guam questions');
  });

  it('uses the default chat placeholder for unknown or absent intents', () => {
    expect(getChatIntentPlaceholder(null)).toBeUndefined();
    expect(getChatIntentPlaceholder('unexpected')).toBeUndefined();
    expect(getChatIntentLabel(null)).toBeUndefined();
    expect(getChatIntentLabel('unexpected')).toBeUndefined();
  });
});
