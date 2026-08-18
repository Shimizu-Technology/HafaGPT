export function getChatIntentPlaceholder(intent: string | null): string | undefined {
  switch (intent) {
    case 'translate':
      return 'Paste or type Chamorro to translate...';
    case 'practice':
      return 'What daily-life phrase would you like to practice?';
    case 'ask':
      return 'Ask a Chamorro language or culture question...';
    default:
      return undefined;
  }
}
