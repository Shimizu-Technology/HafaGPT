import manifestJson from './curated_concept_manifest.json';
import { createCardIdentity } from '../lib/cardIdentity';

interface CuratedConceptManifest {
  version: number;
  deck_card_counts: Record<string, number>;
  question_concepts: Record<string, [categoryId: string, cardIndex: number]>;
}

export const CURATED_CONCEPT_MANIFEST = manifestJson as unknown as CuratedConceptManifest;

export function getCuratedConceptId(categoryId: string, cardIndex: number): string {
  return createCardIdentity({
    sourceKind: 'curated',
    sourceId: `curated:${categoryId}:${cardIndex}`,
  });
}

export function getCuratedDeckConceptIds(categoryId: string): string[] {
  const cardCount = CURATED_CONCEPT_MANIFEST.deck_card_counts[categoryId] ?? 0;
  return Array.from(
    { length: cardCount },
    (_value, cardIndex) => getCuratedConceptId(categoryId, cardIndex),
  );
}

export function getQuestionConceptId(questionId: string): string | undefined {
  const relationship = CURATED_CONCEPT_MANIFEST.question_concepts[questionId];
  if (!relationship) return undefined;
  return getCuratedConceptId(relationship[0], relationship[1]);
}

export function findCuratedConceptIndex(
  categoryId: string,
  conceptId: string,
): number | null {
  const cardCount = CURATED_CONCEPT_MANIFEST.deck_card_counts[categoryId] ?? 0;
  for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
    if (getCuratedConceptId(categoryId, cardIndex) === conceptId) return cardIndex;
  }
  return null;
}
