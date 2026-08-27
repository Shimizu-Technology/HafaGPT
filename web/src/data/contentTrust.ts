export type ContentTrustLevel =
  | 'current_source'
  | 'source_backed'
  | 'developing'
  | 'ai_practice';

export interface ContentTrustSource {
  name: string;
  url?: string;
}

export interface ContentTrust {
  level: ContentTrustLevel;
  label: string;
  summary: string;
  sources: ContentTrustSource[];
  region?: string;
  orthography?: string;
  independentlyReviewed: boolean;
  notes?: string[];
}

export const TRUST_LEVEL_SURFACE_CLASSES: Record<ContentTrustLevel, string> = {
  current_source: 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30',
  source_backed: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30',
  developing: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
  ai_practice: 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30',
};

const KUMISION_WORD_LISTS: ContentTrustSource = {
  name: "Kumisión i Fino' CHamoru specialized lists",
  url: 'https://kumisionchamoru.guam.gov/listan-palabra-word-lists/listan-espesi%C7%BBt-specialized-lists/',
};

const HAFAGPT_CANONICAL: ContentTrustSource = {
  name: 'HåfaGPT canonical vocabulary',
};

const LOCAL_DICTIONARIES: ContentTrustSource = {
  name: 'Named Guåhan and CNMI dictionary references',
};

const CHUNG_GRAMMAR: ContentTrustSource = {
  name: 'Chamorro Grammar by Sandra Chung',
  url: 'https://escholarship.org/uc/item/2sx7w4h5',
};

const GDOE_STANDARDS: ContentTrustSource = {
  name: 'GDOE CHamoru Language and Culture standards',
  url: 'https://ocpes.gdoe.net/programs/chamoru-language-and-culture',
};

export const TRUST_LABELS: Record<ContentTrustLevel, { label: string; description: string }> = {
  current_source: {
    label: 'Current-source aligned',
    description: 'Checked against a current, named language authority for the stated region or spelling system.',
  },
  source_backed: {
    label: 'Source-backed',
    description: 'Supported by named references in HåfaGPT. It has not necessarily received independent human review.',
  },
  developing: {
    label: 'Developing material',
    description: 'Kept available for learning while its examples, variants, or source lineage are still being strengthened.',
  },
  ai_practice: {
    label: 'AI practice',
    description: 'Generated during the session for low-stakes practice. It is not an authoritative correction or grade.',
  },
};

const SOURCE_BACKED_LESSON: ContentTrust = {
  level: 'source_backed',
  label: TRUST_LABELS.source_backed.label,
  summary: 'Core terms are tied to HåfaGPT canonical entries and named dictionary references. Regional variants may appear.',
  sources: [HAFAGPT_CANONICAL, LOCAL_DICTIONARIES],
  region: 'Guåhan and CNMI source lineage',
  orthography: 'Entry-specific',
  independentlyReviewed: false,
  notes: ['Independent educator or native-speaker review has not been completed.'],
};

const CURRENT_GUAHAN_LESSON: ContentTrust = {
  level: 'current_source',
  label: TRUST_LABELS.current_source.label,
  summary: 'Primary teaching forms and lesson framing were checked against current Kumisión Guåhan word lists.',
  sources: [KUMISION_WORD_LISTS],
  region: 'Guåhan',
  orthography: 'Utugrafihan CHamoru, Guåhan',
  independentlyReviewed: false,
  notes: ['Older and regional variants remain useful and may appear elsewhere in the dictionary.'],
};

const DEVELOPING_LESSON: ContentTrust = {
  level: 'developing',
  label: TRUST_LABELS.developing.label,
  summary: 'This lesson remains available while its phrases, examples, and regional forms receive deeper source-by-source checks.',
  sources: [LOCAL_DICTIONARIES, GDOE_STANDARDS],
  region: 'Mixed or not yet fully labeled',
  orthography: 'Source-specific',
  independentlyReviewed: false,
};

export const CUSTOM_FLASHCARD_CONTENT_TRUST: ContentTrust = {
  ...DEVELOPING_LESSON,
  summary: 'This custom deck can combine generated practice cards with other learning material, so each phrase should be treated as developing content.',
  sources: [HAFAGPT_CANONICAL, LOCAL_DICTIONARIES],
  notes: ['Generated cards are practice material and have not received independent language review.'],
};

const GRAMMAR_LESSON: ContentTrust = {
  ...DEVELOPING_LESSON,
  summary: 'Vocabulary roots are source-backed, but some sentence frames are grammar-sensitive and still being reconciled.',
  sources: [HAFAGPT_CANONICAL, CHUNG_GRAMMAR],
  notes: ['Treat examples as guided practice rather than a complete grammar rule.'],
};

const LESSON_TRUST_BY_CATEGORY: Record<string, ContentTrust> = {
  greetings: SOURCE_BACKED_LESSON,
  numbers: CURRENT_GUAHAN_LESSON,
  colors: SOURCE_BACKED_LESSON,
  family: SOURCE_BACKED_LESSON,
  food: SOURCE_BACKED_LESSON,
  animals: SOURCE_BACKED_LESSON,
  phrases: SOURCE_BACKED_LESSON,
  body: SOURCE_BACKED_LESSON,
  days: CURRENT_GUAHAN_LESSON,
  months: CURRENT_GUAHAN_LESSON,
  questions: GRAMMAR_LESSON,
  verbs: GRAMMAR_LESSON,
  sentences: GRAMMAR_LESSON,
};

/** Resolve the shared trust profile used by a lesson and its linked activities. */
export function getLessonTrust(category: string): ContentTrust {
  return LESSON_TRUST_BY_CATEGORY[category] ?? DEVELOPING_LESSON;
}

export type FlashcardContentSource = 'curated' | 'dictionary' | 'custom';

/** Resolve flashcard trust from the cards actually loaded rather than the URL mode. */
export function getFlashcardTrust(
  source: FlashcardContentSource,
  category: string,
  dictionaryTrust?: ContentTrust,
): ContentTrust {
  if (source === 'dictionary') return dictionaryTrust ?? DICTIONARY_CONTENT_TRUST;
  if (source === 'custom') return CUSTOM_FLASHCARD_CONTENT_TRUST;
  return getLessonTrust(category);
}

export const STORY_CONTENT_TRUST: ContentTrust = {
  level: 'developing',
  label: TRUST_LABELS.developing.label,
  summary: 'This HåfaGPT practice story remains available while its full translation, annotations, and cultural notes receive deeper source checks.',
  sources: [HAFAGPT_CANONICAL, LOCAL_DICTIONARIES],
  region: 'Mixed or not yet fully labeled',
  orthography: 'Story-specific',
  independentlyReviewed: false,
};

export const CONVERSATION_CONTENT_TRUST: ContentTrust = {
  level: 'ai_practice',
  label: TRUST_LABELS.ai_practice.label,
  summary: 'The scenario gives the AI a guided setting and useful phrases, but its replies, translations, suggestions, and scores are generated live.',
  sources: [HAFAGPT_CANONICAL],
  region: 'Scenario-specific',
  orthography: 'Best-effort AI output',
  independentlyReviewed: false,
  notes: ['Use feedback as a practice suggestion, not as proof that a phrase is correct.'],
};

export const DICTIONARY_CONTENT_TRUST: ContentTrust = {
  level: 'source_backed',
  label: TRUST_LABELS.source_backed.label,
  summary: 'Dictionary entries come from a named CNMI dictionary snapshot. Guåhan spelling may differ, so search keeps regional variants discoverable.',
  sources: [
    {
      name: 'Local Revised Chamorro Dictionary snapshot',
      url: 'https://natibunmarianas.org/dictionary-introduction/',
    },
  ],
  region: 'CNMI',
  orthography: 'CNMI 2010',
  independentlyReviewed: false,
  notes: ['Snapshot provenance and reuse permission are still being completed.'],
};

export const GAME_CONTENT_TRUST: ContentTrust = {
  level: 'developing',
  label: TRUST_LABELS.developing.label,
  summary: 'Guided word games reuse lesson decks. Challenge modes can draw from the labeled dictionary corpus, while specialty listening and cultural games still have their own curated sets.',
  sources: [HAFAGPT_CANONICAL, LOCAL_DICTIONARIES],
  region: 'Game and category-specific',
  orthography: 'Source-specific',
  independentlyReviewed: false,
  notes: ['A game result measures performance on that activity, not overall language proficiency.'],
};
