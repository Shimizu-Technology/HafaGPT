import { describe, expect, it } from 'vitest';
import { getChatEvidenceStatus } from './chatEvidence';

describe('chat evidence status', () => {
  it('prioritizes attached citations over retrieval flags', () => {
    expect(getChatEvidenceStatus([
      { name: 'Dictionary', page: null, support_scope: 'answer' },
    ], true)).toEqual({
      level: 'source_supported',
      label: 'Source-supported',
      badgeLabel: 'Sources',
      detail: 'Check the citations below.',
    });
  });

  it('does not imply that component citations verify a whole sentence', () => {
    expect(getChatEvidenceStatus([
      { name: 'Dictionary', page: null, support_scope: 'partial' },
    ], false)).toEqual({
      level: 'partial_support',
      label: 'Partially supported',
      badgeLabel: 'Partial evidence',
      detail: 'Sources verify parts of this answer, not the full wording.',
    });
  });

  it('labels normalized spelling evidence as a possible match', () => {
    expect(getChatEvidenceStatus([
      { name: 'Dictionary', page: null, support_scope: 'candidate' },
    ], false).level).toBe('candidate_support');
  });

  it('distinguishes current web context from an unsupported answer', () => {
    expect(getChatEvidenceStatus([], true).level).toBe('web_informed');
    expect(getChatEvidenceStatus([], false)).toEqual({
      level: 'best_effort',
      label: 'Unverified best effort',
      badgeLabel: 'Unverified',
      detail: 'No supporting source matched.',
    });
  });
});
