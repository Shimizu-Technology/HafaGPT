import { browserStorage } from './browserStorage';

export type ChatIntent = 'translate' | 'explain' | 'practice';

export function normalizeChatIntent(intent: string | null): ChatIntent {
  if (intent === 'translate' || intent === 'practice') return intent;
  return 'explain'; // Includes legacy ?intent=ask links.
}

export function getChatIntentPlaceholder(intent: string | null): string {
  switch (normalizeChatIntent(intent)) {
    case 'translate': return 'Paste a phrase, message, or notice…';
    case 'practice': return 'Choose a topic or try a phrase…';
    default: return 'Ask about a word, grammar, or Guam…';
  }
}

export function getChatIntentLabel(intent: string | null): string {
  switch (normalizeChatIntent(intent)) {
    case 'translate': return 'Translate';
    case 'practice': return 'Practice';
    default: return 'Explain';
  }
}

const intentKey = (ownerId: string, conversationId: string) => `chat_intent:${ownerId}:${conversationId}`;

/** Remember a conversation's task on this device so reopening it keeps the same task. */
export function rememberConversationIntent(ownerId: string, conversationId: string, intent: ChatIntent): void {
  browserStorage.set(intentKey(ownerId, conversationId), intent);
}

export function rememberedConversationIntent(ownerId: string, conversationId: string): ChatIntent | null {
  const saved = browserStorage.get(intentKey(ownerId, conversationId));
  return saved === 'translate' || saved === 'explain' || saved === 'practice' ? saved : null;
}

export function forgetConversationIntent(ownerId: string, conversationId: string): void {
  browserStorage.remove(intentKey(ownerId, conversationId));
}
