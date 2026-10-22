import type { SourceInfo } from '../types/source';
const names: Record<string, string> = {
  hafagpt_canonical_evaluation: 'HåfaGPT vocabulary ledger',
  local_revised_dictionary_snapshot: 'Revised Chamorro dictionary',
  chamoru_info_dictionary: 'Chamoru.info dictionary',
  topping_ogo_dungca_1975: 'Topping, Ogo, and Dungca dictionary',
};
const descriptions: Record<string, string> = {
  reviewed_lexicon: 'Reviewed vocabulary',
  Guam_and_CNMI_source_lineage: 'Sources from Guam and the Northern Mariana Islands',
  modern: 'Modern usage', historical: 'Historical usage',
  guam: 'Guam', cnmi: 'Northern Mariana Islands',
  dictionary: 'Dictionary', grammar: 'Grammar reference',
  unreviewed: 'Not yet reviewed', reviewed: 'Reviewed',
};
const readable = (value?: string | null) => value ? descriptions[value] || value.replace(/_/g, ' ') : '';
/** Shared with public reading: retain locators, provenance and unknown caveats. */
export function formatSourceLabel(source: SourceInfo): { label: string; detail: string } {
  const name = names[source.source_id || ''] || readable(source.name) || 'Reference source';
  return {
    label: `${name}${typeof source.page === 'number' ? ` (p. ${source.page})` : ''}`,
    detail: [source.locator, readable(source.content_role), readable(source.region), readable(source.temporal_scope)]
      .filter(Boolean).join(' • '),
  };
}
