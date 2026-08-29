export type ChatEvidenceLevel = 'source_supported' | 'web_informed' | 'best_effort';

export interface ChatEvidenceStatus {
  level: ChatEvidenceLevel;
  label: string;
  detail: string;
}

export function getChatEvidenceStatus(
  sourceCount: number,
  usedWebSearch: boolean,
): ChatEvidenceStatus {
  if (sourceCount > 0) {
    return {
      level: 'source_supported',
      label: 'Source-supported',
      detail: 'Check the citations below.',
    };
  }
  if (usedWebSearch) {
    return {
      level: 'web_informed',
      label: 'Web-informed',
      detail: 'Current web results were used.',
    };
  }
  return {
    level: 'best_effort',
    label: 'Unverified best effort',
    detail: 'No supporting source matched.',
  };
}
