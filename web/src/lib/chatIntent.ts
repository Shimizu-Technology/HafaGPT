export function getChatIntentPlaceholder(intent: string | null): string | undefined {
  switch (intent) {
    case 'translate':
      return 'Paste a message…';
    case 'practice':
      return 'Type a phrase to practice…';
    case 'ask':
      return 'Ask a question…';
    default:
      return undefined;
  }
}

export function getChatIntentLabel(intent: string | null): string | undefined {
  switch (intent) {
    case 'translate':
      return 'Translation help';
    case 'practice':
      return 'Practice help';
    case 'ask':
      return 'Chamorro & Guam questions';
    default:
      return undefined;
  }
}
