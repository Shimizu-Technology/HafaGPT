export interface ConversationHistorySource {
  role: 'character' | 'user' | 'system';
  chamorro: string;
}

export interface ConversationHistoryPayload {
  role: 'character' | 'user';
  content: string;
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
