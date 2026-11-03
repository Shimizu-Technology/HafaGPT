import { describe, expect, it } from 'vitest';
import { describeAnswerEvidence, getChatEvidenceStatus, groupAnswerReferences } from './chatEvidence';

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
      label: 'No dictionary reference for this answer',
      detail: 'Check important claims against the original material.',
    });
  });
});

describe('answer references', () => {
  it('merges repeated passages and keeps every page and locator', () => {
    expect(groupAnswerReferences([
      { name: 'Grammar', page: 9, locator: 'Ch. 2' },
      { name: 'Grammar', page: 3, locator: 'Ch. 1' },
      { name: 'Grammar', page: 9, locator: 'Ch. 2' },
    ])).toEqual([{ key: 'grammar', name: 'Grammar', label: 'Grammar (pp. 3, 9)', url: undefined, details: ['Ch. 2', 'Ch. 1'] }]);
  });

  it('calls references a dictionary only when every one is lexical', () => {
    const dictionary = { name: 'x', source_id: 'chamoru_info_dictionary', page: null };
    expect(describeAnswerEvidence([dictionary])).toBe('From the dictionary: Chamoru.info dictionary');
    expect(describeAnswerEvidence([dictionary, { name: 'Grammar', page: null }])).toBe('From references: Chamoru.info dictionary and Grammar');
    expect(describeAnswerEvidence([dictionary, { name: 'A', page: null }, { name: 'B', page: null }, { name: 'C', page: null }]))
      .toBe('From references: Chamoru.info dictionary, A, and 2 more');
  });
});
