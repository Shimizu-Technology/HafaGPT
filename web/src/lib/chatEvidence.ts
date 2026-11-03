import type { SourceInfo } from '../types/source';
import { formatSourceLabel } from './sourceLabels';

export type ChatEvidenceLevel = 'source_supported' | 'web_informed' | 'best_effort';

export interface ChatEvidenceStatus {
  level: ChatEvidenceLevel;
  label: string;
  detail: string;
}

/** One reference as the learner sees it: retrieval can return several passages of one work. */
export interface AnswerReference {
  key: string;
  name: string;
  label: string;
  url?: string;
  details: string[];
}

// Roles and registered works that are dictionaries or reviewed word lists.
const LEXICAL_ROLES = new Set(['reviewed_lexicon', 'lexical_reference', 'dictionary']);
const LEXICAL_SOURCES = new Set([
  'hafagpt_canonical_evaluation',
  'local_revised_dictionary_snapshot',
  'chamoru_info_dictionary',
  'topping_ogo_dungca_1975',
]);

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
      label: 'No dictionary reference for this answer',
      detail: 'Current web results were used.',
    };
  }
  return {
    level: 'best_effort',
    label: 'No dictionary reference for this answer',
    detail: 'Check important claims against the original material.',
  };
}

/** Merge repeated passages of the same work into one entry, keeping every page and locator. */
export function groupAnswerReferences(sources: SourceInfo[] = []): AnswerReference[] {
  const groups = new Map<string, { name: string; pages: number[]; url?: string; details: string[] }>();
  for (const source of sources) {
    const name = formatSourceLabel({ ...source, page: null }).label;
    const key = (source.source_id || name).trim().toLowerCase();
    const group = groups.get(key) || { name, pages: [], details: [] };
    const { detail } = formatSourceLabel(source);
    if (typeof source.page === 'number' && !group.pages.includes(source.page)) group.pages.push(source.page);
    if (detail && !group.details.includes(detail)) group.details.push(detail);
    group.url ||= source.url || undefined;
    groups.set(key, group);
  }
  return [...groups].map(([key, { name, pages, url, details }]) => {
    pages.sort((a, b) => a - b);
    const pageLabel = pages.length === 1 ? ` (p. ${pages[0]})` : pages.length > 1 ? ` (pp. ${pages.join(', ')})` : '';
    return { key, name, label: `${name}${pageLabel}`, url, details };
  });
}

/** The one-line evidence summary shown under an answer. */
export function describeAnswerEvidence(sources: SourceInfo[] = []): string {
  const references = groupAnswerReferences(sources);
  const lexical = sources.length > 0 && sources.every(source =>
    LEXICAL_SOURCES.has(source.source_id || '') || LEXICAL_ROLES.has(source.content_role || ''));
  const names = references.map(reference => reference.name);
  const listed = names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')}, and ${names.length - 2} more`;
  return `${lexical ? 'From the dictionary' : 'From references'}: ${listed}`;
}
