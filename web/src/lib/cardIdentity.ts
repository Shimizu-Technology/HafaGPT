export type CardSourceKind = 'curated' | 'dictionary' | 'saved' | 'custom';

interface CardIdentityInput {
  sourceKind: CardSourceKind;
  sourceId: string;
}

/** Preserve the loaded card's source when recording a review from any route. */
export function resolveReviewSourceKind(
  card: { contentSource: CardSourceKind },
): CardSourceKind {
  return card.contentSource;
}

export function normalizeIdentityPart(value: string): string {
  return value.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

/** Create a stable, versioned identity from a source-owned, non-display key. */
export function createCardIdentity(input: CardIdentityInput): string {
  return `v1:${input.sourceKind}:${fnv1a(normalizeIdentityPart(input.sourceId))}`;
}
