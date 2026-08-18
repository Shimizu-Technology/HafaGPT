import { describe, expect, it } from 'vitest';
import { createCardIdentity } from './cardIdentity';

describe('createCardIdentity', () => {
  it('is stable across whitespace, case, and equivalent Unicode composition', () => {
    const composed = createCardIdentity({
      sourceKind: 'curated',
      deckId: 'Greetings',
      front: 'Håfa   Adai',
      back: 'Hello',
    });
    const decomposed = createCardIdentity({
      sourceKind: 'curated',
      deckId: ' greetings ',
      front: 'HA\u030AFA ADAI',
      back: ' hello ',
    });

    expect(decomposed).toBe(composed);
    expect(composed).toMatch(/^v1:curated:[a-z0-9]+:[a-z0-9]+$/);
  });

  it('keeps source kinds and distinct translations separate', () => {
    const base = {
      deckId: 'family',
      front: 'Che’lu',
      back: 'Sibling',
    } as const;

    expect(createCardIdentity({ ...base, sourceKind: 'curated' })).not.toBe(
      createCardIdentity({ ...base, sourceKind: 'dictionary' }),
    );
    expect(createCardIdentity({ ...base, sourceKind: 'curated' })).not.toBe(
      createCardIdentity({ ...base, sourceKind: 'curated', back: 'Brother or sister' }),
    );
  });

  it('uses an opaque stable source identifier for saved cards', () => {
    const identity = createCardIdentity({
      sourceKind: 'saved',
      deckId: 'ignored-for-source-id',
      front: 'private display text',
      back: 'private translation',
      sourceId: '3b8bb0f2-9ca2-4a87-b607-994ad2982285',
    });

    expect(identity).toMatch(/^v1:saved:[a-z0-9]+$/);
    expect(identity).not.toContain('private');
  });
});
