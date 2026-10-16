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

describe('remembered conversation tasks', () => {
  it('restores a task per learner and conversation and ignores unknown values', async () => {
    const { rememberConversationIntent, rememberedConversationIntent, forgetConversationIntent } = await import('./chatIntent');
    window.localStorage.clear();
    rememberConversationIntent('learner-a', 'conv-1', 'translate');
    expect(rememberedConversationIntent('learner-a', 'conv-1')).toBe('translate');
    expect(rememberedConversationIntent('learner-b', 'conv-1')).toBeNull();
    expect(rememberedConversationIntent('learner-a', 'conv-2')).toBeNull();
    window.localStorage.setItem('chat_intent:learner-a:conv-3', 'delete-everything');
    expect(rememberedConversationIntent('learner-a', 'conv-3')).toBeNull();
    forgetConversationIntent('learner-a', 'conv-1');
    expect(rememberedConversationIntent('learner-a', 'conv-1')).toBeNull();
  });
});
