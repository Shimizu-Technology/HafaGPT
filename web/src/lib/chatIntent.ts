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
