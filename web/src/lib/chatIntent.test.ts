import { describe, expect, it } from 'vitest';
import { getChatIntentPlaceholder } from './chatIntent';

describe('getChatIntentPlaceholder', () => {
  it('guides translation, practice, and question entry points', () => {
    expect(getChatIntentPlaceholder('translate')).toBe('Paste or type Chamorro to translate...');
    expect(getChatIntentPlaceholder('practice')).toBe('What daily-life phrase would you like to practice?');
    expect(getChatIntentPlaceholder('ask')).toBe('Ask a Chamorro language or culture question...');
  });

  it('uses the default chat placeholder for unknown or absent intents', () => {
    expect(getChatIntentPlaceholder(null)).toBeUndefined();
    expect(getChatIntentPlaceholder('unexpected')).toBeUndefined();
  });
});
