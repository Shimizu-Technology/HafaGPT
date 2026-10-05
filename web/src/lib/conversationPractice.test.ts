import { describe, expect, it } from 'vitest';
import { hasVisiblePracticeFeedback, serializeConversationHistory } from './conversationPractice';

describe('conversation practice request history', () => {
  it('keeps a local failure message out of the next retry payload', () => {
    const retryHistory = serializeConversationHistory([
      { role: 'character', chamorro: 'Håfa Adai!' },
      { role: 'user', chamorro: 'Håfa Adai.' },
      { role: 'system', chamorro: 'Sorry, there was an error. Please try again.' },
    ]);

    expect(retryHistory).toEqual([
      { role: 'character', content: 'Håfa Adai!' },
      { role: 'user', content: 'Håfa Adai.' },
    ]);
  });

  it('does not render an empty feedback card', () => {
    expect(hasVisiblePracticeFeedback([])).toBe(false);
    expect(hasVisiblePracticeFeedback(['Try a different spelling'])).toBe(true);
    expect(hasVisiblePracticeFeedback([], 'Keep going')).toBe(true);
  });
});

import { emptyPracticeDraft, parsePracticeDraft } from './conversationPractice';

describe('conversation resume', () => {
  it('restores a recent draft and rejects expired, malformed, or cross-version data', () => {
    const draft = { ...emptyPracticeDraft(), messages: [{ id: '1', role: 'character', chamorro: 'Håfa Adai!' }], turnCount: 1 };
    const value = JSON.stringify({ version: 1, savedAt: 1000, draft });
    expect(parsePracticeDraft(value, 2000)).toEqual(draft);
    expect(parsePracticeDraft(value, 9 * 86400000)).toBeNull();
    expect(parsePracticeDraft('{broken')).toBeNull();
    expect(parsePracticeDraft(JSON.stringify({ version: 2, savedAt: 1000, draft }), 2000)).toBeNull();
    expect(parsePracticeDraft(JSON.stringify({ version: 1, savedAt: 1000, draft: { ...draft, messages: [{ id: '1', role: 'user', chamorro: 42 }] } }), 2000)).toBeNull();
  });

  it('carries phrase-hint use into the evidence request', () => {
    expect(serializeConversationHistory([{ role: 'user', chamorro: 'Håfa Adai!', hintUsed: true }]))
      .toEqual([{ role: 'user', content: 'Håfa Adai!', hint_used: true }]);
  });
});
