export type ChatEvidenceLevel = 'source_supported' | 'web_informed' | 'best_effort';

export interface ChatEvidenceStatus {
  level: ChatEvidenceLevel;
  label: string;
  detail: string;
}

/** Classify the evidence actually attached to or used by a completed answer. */
export function getChatEvidenceStatus(
  sourceCount: number,
  usedWebResults: boolean,
): ChatEvidenceStatus {
  if (sourceCount > 0) {
    return {
      level: 'source_supported',
      label: 'References attached',
      detail: 'They may support only parts of this answer.',
    };
  }
  if (usedWebResults) {
    return {
      level: 'web_informed',
      label: 'Web-informed',
      detail: 'Current web results were used.',
    };
  }
  return {
    level: 'best_effort',
    label: 'No references attached',
    detail: 'Check important claims against the original material.',
  };
}
