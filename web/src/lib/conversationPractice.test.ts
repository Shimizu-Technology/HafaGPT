import { describe, expect, it } from 'vitest';
import { serializeConversationHistory } from './conversationPractice';

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
});
