export type ChatScrollMessage = {
  role: string;
  content?: string;
  id?: string;
};

export type ChatScrollMetrics = {
  scrollHeight: number;
  clientHeight: number;
  paddingBottom: number;
  isInitialExchange: boolean;
  preserveInitialExchange?: boolean;
};

/**
 * A conversation containing only its first user/assistant exchange should
 * remain anchored below the chat header while it still fits in the viewport.
 */
export function shouldPinInitialExchangeToTop(messages: ChatScrollMessage[]): boolean {
  if (messages.length !== 2) return false;

  const [userMessage, assistantMessage] = messages;
  return (
    userMessage.role === 'user' &&
    assistantMessage.role === 'assistant'
  );
}

/**
 * Return a scroll position for chat auto-follow without letting the fixed
 * composer reserve push a short first exchange into the header gutter.
 */
export function getChatScrollTop({
  scrollHeight,
  clientHeight,
  paddingBottom,
  isInitialExchange,
  preserveInitialExchange = true,
}: ChatScrollMetrics): number {
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
  const contentHeight = Math.max(0, scrollHeight - Math.max(0, paddingBottom));

  if (
    preserveInitialExchange &&
    isInitialExchange &&
    contentHeight <= clientHeight + 1
  ) {
    return 0;
  }

  return maxScrollTop;
}
