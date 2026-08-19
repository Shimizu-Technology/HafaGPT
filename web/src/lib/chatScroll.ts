export type ChatScrollMessage = {
  role: string;
  content?: string;
  id?: string;
};

/**
 * Keep a brand-new prompt anchored below the chat header while the empty
 * assistant placeholder is shown. Once content starts streaming, normal
 * follow-the-response scrolling can resume.
 */
export function shouldPinInitialExchangeToTop(messages: ChatScrollMessage[]): boolean {
  if (messages.length !== 2) return false;

  const [userMessage, assistantMessage] = messages;
  return (
    userMessage.role === 'user' &&
    assistantMessage.role === 'assistant' &&
    assistantMessage.id?.startsWith('streaming_') === true &&
    (assistantMessage.content ?? '').trim().length === 0
  );
}
