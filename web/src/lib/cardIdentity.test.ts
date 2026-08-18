import { describe, expect, it } from 'vitest';
import { createCardIdentity } from './cardIdentity';

describe('createCardIdentity', () => {
  it('is stable across source ID whitespace, case, and Unicode composition', () => {
    const composed = createCardIdentity({
      sourceKind: 'curated',
      sourceId: 'Greetings:Håfa',
    });
    const decomposed = createCardIdentity({
      sourceKind: 'curated',
      sourceId: ' greetings:HA\u030AFA ',
    });

    expect(decomposed).toBe(composed);
    expect(composed).toMatch(/^v1:curated:[a-z0-9]+$/);
  });

  it('keeps source kinds and source-owned keys separate', () => {
    const base = { sourceId: 'family:12' } as const;

    expect(createCardIdentity({ ...base, sourceKind: 'curated' })).not.toBe(
      createCardIdentity({ ...base, sourceKind: 'dictionary' }),
    );
    expect(createCardIdentity({ ...base, sourceKind: 'curated' })).not.toBe(
      createCardIdentity({ sourceKind: 'curated', sourceId: 'family:13' }),
    );
  });

  it('does not change when learner-visible copy changes outside the identity input', () => {
    const identity = createCardIdentity({
      sourceKind: 'saved',
      sourceId: '3b8bb0f2-9ca2-4a87-b607-994ad2982285',
    });

    expect(identity).toMatch(/^v1:saved:[a-z0-9]+$/);
    expect(identity).not.toContain('3b8bb0f2');
  });
});
