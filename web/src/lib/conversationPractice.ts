export interface ConversationHistorySource {
  role: 'character' | 'user' | 'system';
  chamorro: string;
  english?: string;
  hintUsed?: boolean;
}

export interface ConversationHistoryPayload {
  role: 'character' | 'user';
  content: string;
  hint_used?: boolean;
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
  return messages.flatMap((message) => {
    if (message.role === 'system') return [];
    let content = message.chamorro.slice(0, 600);
    if (message.role === 'character' && message.english?.trim()) {
      // Preserve the guidance the learner saw, including source-safe English
      // fallback when the tutor could not supply a supported Chamorro response.
      const english = message.english.trim();
      if (!content) content = english.slice(0, 600);
      else {
        const guidance = english.slice(0, 300);
        const separator = '\nEnglish guidance: ';
        content = `${content.slice(0, 600 - separator.length - guidance.length)}${separator}${guidance}`;
      }
    }
    return [{ role: message.role, content, ...(message.hintUsed ? { hint_used: true } : {}) }];
  });
}

export interface PracticeObjectiveEvidence {
  objective: string;
  quote: string;
  assisted: boolean;
}

export interface PracticeMessage extends ConversationHistorySource {
  id: string;
  english?: string;
  hintUsed?: boolean;
  groundingStatus?: 'canonical_support' | 'source_support' | 'ai_only';
  feedback?: { corrections?: string[]; suggestions?: string[]; encouragement?: string };
}

export interface PracticeDraft {
  messages: PracticeMessage[];
  turnCount: number;
  objectivesCompleted: string[];
  objectiveEvidence: PracticeObjectiveEvidence[];
  isComplete: boolean;
  focusObjective?: string;
}

export const emptyPracticeDraft = (): PracticeDraft => ({
  messages: [], turnCount: 0, objectivesCompleted: [], objectiveEvidence: [], isComplete: false,
});

/** Ignore expired or malformed local drafts rather than breaking the activity. */
export function parsePracticeDraft(value: string | null, now = Date.now()): PracticeDraft | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value);
    const draft = data.draft;
    if (data.version !== 1 || typeof data.savedAt !== 'number' || now - data.savedAt > 7 * 86400000 || data.savedAt > now
      || !draft || (draft.focusObjective !== undefined && (typeof draft.focusObjective !== 'string' || draft.focusObjective.length > 300)) || !Array.isArray(draft.messages) || draft.messages.length < 1 || draft.messages.length > 60
      || !Number.isInteger(draft.turnCount) || draft.turnCount < 1 || draft.turnCount > 50
      || typeof draft.isComplete !== 'boolean' || !Array.isArray(draft.objectivesCompleted)
      || !draft.objectivesCompleted.every((item: unknown) => typeof item === 'string')
      || !Array.isArray(draft.objectiveEvidence)) return null;
    if (!draft.messages.every((message: PracticeMessage) => message && typeof message.id === 'string'
      && ['user', 'character', 'system'].includes(message.role) && typeof message.chamorro === 'string'
      && message.chamorro.length <= 6000 && (!message.english || typeof message.english === 'string')
      && (!message.feedback || (typeof message.feedback === 'object'
        && (!message.feedback.suggestions || Array.isArray(message.feedback.suggestions) && message.feedback.suggestions.every(item => typeof item === 'string'))
        && (!message.feedback.corrections || Array.isArray(message.feedback.corrections) && message.feedback.corrections.every(item => typeof item === 'string'))
        && (!message.feedback.encouragement || typeof message.feedback.encouragement === 'string'))))) return null;
    if (!draft.objectiveEvidence.every((item: PracticeObjectiveEvidence) => item && typeof item.objective === 'string'
      && typeof item.quote === 'string' && typeof item.assisted === 'boolean')) return null;
    return draft;
  } catch {
    return null;
  }
}
