import { describe, expect, it } from 'vitest';
import { getChatEvidenceStatus } from './chatEvidence';

describe('chat evidence status', () => {
  it('prioritizes attached citations over retrieval flags', () => {
    expect(getChatEvidenceStatus(2, true)).toEqual({
      level: 'source_supported',
      label: 'References attached',
      detail: 'They may support only parts of this answer.',
    });
  });

  it('distinguishes current web context from an unsupported answer', () => {
    expect(getChatEvidenceStatus(0, true).level).toBe('web_informed');
    expect(getChatEvidenceStatus(0, false)).toEqual({
      level: 'best_effort',
      label: 'No references attached',
      detail: 'Check important claims against the original material.',
    });
  });
});
