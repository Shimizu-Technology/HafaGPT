export type CardSourceKind = 'curated' | 'dictionary' | 'saved' | 'custom';

interface CardIdentityInput {
  sourceKind: CardSourceKind;
  deckId: string;
  front: string;
  back: string;
  sourceId?: string;
}

function normalizeIdentityPart(value: string): string {
  return value.normalize('NFC').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

/** Create a stable, versioned identity without embedding learner-visible text. */
export function createCardIdentity(input: CardIdentityInput): string {
  if (input.sourceId) {
    return `v1:${input.sourceKind}:${fnv1a(normalizeIdentityPart(input.sourceId))}`;
  }

  const deckHash = fnv1a(normalizeIdentityPart(input.deckId));
  const contentHash = fnv1a(
    `${normalizeIdentityPart(input.front)}\u0000${normalizeIdentityPart(input.back)}`,
  );

  return `v1:${input.sourceKind}:${deckHash}:${contentHash}`;
}
