import manifestJson from './curated_concept_manifest.json';
import { createCardIdentity, normalizeIdentityPart } from '../lib/cardIdentity';

interface CuratedConceptManifest {
  version: number;
  deck_card_counts: Record<string, number>;
  question_concepts: Record<string, [categoryId: string, cardIndex: number]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateCuratedConceptManifest(
  value: unknown,
): CuratedConceptManifest {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error('Curated concept manifest must use version 1');
  }
  if (!isRecord(value.deck_card_counts) || !isRecord(value.question_concepts)) {
    throw new Error('Curated concept manifest is missing its relationship maps');
  }

  const deckCardCounts: Record<string, number> = Object.create(null);
  for (const [categoryId, cardCount] of Object.entries(value.deck_card_counts)) {
    if (!Number.isInteger(cardCount) || (cardCount as number) < 0) {
      throw new Error(`Invalid curated deck card count for ${categoryId}`);
    }
    deckCardCounts[categoryId] = cardCount as number;
  }

  const questionConcepts: Record<string, [string, number]> = Object.create(null);
  for (const [questionId, relationship] of Object.entries(value.question_concepts)) {
    if (
      !Array.isArray(relationship)
      || relationship.length !== 2
      || typeof relationship[0] !== 'string'
      || typeof relationship[1] !== 'number'
      || !Number.isInteger(relationship[1])
      || relationship[1] < 0
    ) {
      throw new Error(`Invalid curated concept relationship for ${questionId}`);
    }
    const [categoryId, cardIndex] = relationship;
    const hasCategory = Object.prototype.hasOwnProperty.call(
      deckCardCounts,
      categoryId,
    );
    const cardCount = deckCardCounts[categoryId];
    if (!hasCategory || cardCount === undefined || cardIndex >= cardCount) {
      throw new Error(`Out-of-range curated concept relationship for ${questionId}`);
    }
    questionConcepts[questionId] = [categoryId, cardIndex];
  }

  return {
    version: 1,
    deck_card_counts: deckCardCounts,
    question_concepts: questionConcepts,
  };
}

export const CURATED_CONCEPT_MANIFEST = validateCuratedConceptManifest(manifestJson);

export function getCuratedConceptId(categoryId: string, cardIndex: number): string {
  const normalizedCategoryId = normalizeIdentityPart(categoryId);
  return createCardIdentity({
    sourceKind: 'curated',
    sourceId: `curated:${normalizedCategoryId}:${cardIndex}`,
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
