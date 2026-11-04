import type { SourceInfo } from '../types/source';
const HAFAGPT_LIST = 'HåfaGPT vocabulary list';
const REVISED_DICTIONARY = 'Revised Chamorro dictionary';
const names: Record<string, string> = {
  hafagpt_canonical_evaluation: HAFAGPT_LIST,
  local_revised_dictionary_snapshot: REVISED_DICTIONARY,
  chamoru_info_dictionary: 'Chamoru.info dictionary',
  topping_ogo_dungca_1975: 'Topping, Ogo, and Dungca dictionary',
};
const descriptions: Record<string, string> = {
  reviewed_lexicon: 'Vocabulary reference',
  Guam_and_CNMI_source_lineage: 'Sources from Guam and the Northern Mariana Islands',
  modern: 'Modern usage', historical: 'Historical usage',
  guam: 'Guam', cnmi: 'Northern Mariana Islands',
  dictionary: 'Dictionary', grammar: 'Grammar reference',
  unreviewed: 'Not yet reviewed', reviewed: 'Reviewed',
};
const OWN_LIST_NAME = /^(?:HåfaGPT )?canonical (?:vocabulary|evaluation)(?: (?:ledger|index|list))?$/i;
// Names the API has used for the Revised Chamorro dictionary; saved replies still carry them.
const REVISED_DICTIONARY_NAME = /^(?:local revised chamorro dictionary snapshot|revised and updated chamorro dictionary)$/i;

/** A citation name changes only when it is exactly one of our own sources' earlier names; other titles stay as cited. */
export function plainSourceName(name: string): string {
  if (OWN_LIST_NAME.test(name.trim())) return HAFAGPT_LIST;
  return REVISED_DICTIONARY_NAME.test(name.trim()) ? REVISED_DICTIONARY : name;
}

/**
 * For trust text the API writes about HåfaGPT's own list ("canonical ledger",
 * "canonical entry"), not for citation names. Show a parent the plain name instead.
 */
export function plainSourceText(text: string): string {
  return text
    .replace(/HåfaGPT canonical (?:vocabulary|evaluation)(?: (?:ledger|index|list))?/gi, HAFAGPT_LIST)
    .replace(/the local revised chamorro dictionary snapshot/gi, `the ${REVISED_DICTIONARY}`)
    .replace(/\bcanonical (?:vocabulary )?(?:ledger|index)\b/gi, 'vocabulary list')
    .replace(/\bcanonical (entry|entries)\b/gi, 'vocabulary list $1');
}
const readable = (value?: string | null) => value ? descriptions[value] || value.replace(/_/g, ' ') : '';
/** Shared with public reading: retain locators, provenance and unknown caveats. */
export function formatSourceLabel(source: SourceInfo): { label: string; detail: string } {
  const name = names[source.source_id || ''] || plainSourceName(readable(source.name)) || 'Reference source';
  return {
    label: `${name}${typeof source.page === 'number' ? ` (p. ${source.page})` : ''}`,
    detail: [source.locator, readable(source.content_role), readable(source.region), readable(source.temporal_scope)]
      .filter(Boolean).join(' • '),
  };
}
