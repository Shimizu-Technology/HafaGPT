import type { SourceInfo } from '../types/source';

export type ChatEvidenceLevel =
  | 'source_supported'
  | 'partial_support'
  | 'candidate_support'
  | 'web_informed'
  | 'best_effort';

export interface ChatEvidenceStatus {
  level: ChatEvidenceLevel;
  label: string;
  badgeLabel: string;
  detail: string;
}

/** Classify the evidence actually attached to or used by a completed answer. */
export function getChatEvidenceStatus(
  sources: SourceInfo[],
  usedWebResults: boolean,
): ChatEvidenceStatus {
  if (sources.length > 0) {
    const scopes = new Set(sources.map((source) => source.support_scope).filter(Boolean));
    if (!scopes.has('answer') && scopes.has('partial')) {
      return {
        level: 'partial_support',
        label: 'Partially supported',
        badgeLabel: 'Partial evidence',
        detail: 'Sources verify parts of this answer, not the full wording.',
      };
    }
    if (!scopes.has('answer') && scopes.has('candidate')) {
      return {
        level: 'candidate_support',
        label: 'Possible dictionary match',
        badgeLabel: 'Possible match',
        detail: 'A dictionary candidate matched the spelling; check the cited entry.',
      };
    }
    return {
      level: 'source_supported',
      label: 'Source-supported',
      badgeLabel: 'Sources',
      detail: 'Check the citations below.',
    };
  }
  if (usedWebResults) {
    return {
      level: 'web_informed',
      label: 'Web-informed',
      badgeLabel: 'Web',
      detail: 'Current web results were used.',
    };
  }
  return {
    level: 'best_effort',
    label: 'Unverified best effort',
    badgeLabel: 'Unverified',
    detail: 'No supporting source matched.',
  };
}
