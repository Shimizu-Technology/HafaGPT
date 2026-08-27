export interface ConversationHistorySource {
  role: 'character' | 'user' | 'system';
  chamorro: string;
}

export interface ConversationHistoryPayload {
  role: 'character' | 'user';
  content: string;
}

/** Decide whether an AI feedback card has any learner-visible content. */
export function hasVisiblePracticeFeedback(
  suggestions: string[],
  encouragement?: string,
): boolean {
  return suggestions.length > 0 || Boolean(encouragement);
}

/** Serialize only provider-safe user and character messages for the next turn. */
export function serializeConversationHistory(
  messages: ConversationHistorySource[],
): ConversationHistoryPayload[] {
  return messages.flatMap((message) => (
    message.role === 'system'
      ? []
      : [{ role: message.role, content: message.chamorro }]
  ));
}
