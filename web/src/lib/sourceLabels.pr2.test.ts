import { describe, expect, it } from 'vitest';
import { formatSourceLabel } from './sourceLabels';
describe('plain source labels shared with public reading', () => {
  it('labels provenance in plain words while retaining the exact locator', () => {
    expect(formatSourceLabel({ name: 'raw', source_id: 'hafagpt_canonical_evaluation', page: 12,
      locator: 'entry 4', content_role: 'reviewed_lexicon', region: 'Guam_and_CNMI_source_lineage', temporal_scope: 'modern' })).toEqual({
      label: 'HåfaGPT vocabulary ledger (p. 12)',
      detail: 'entry 4 • Reviewed vocabulary • Sources from Guam and the Northern Mariana Islands • Modern usage',
    });
  });
  it('preserves unknown caveats, source names and page zero without inventing review', () => {
    expect(formatSourceLabel({ name: 'Family manuscript', page: 0, content_role: 'not_yet_verified', region: 'Rota' })).toEqual({
      label: 'Family manuscript (p. 0)', detail: 'not yet verified • Rota',
    });
    expect(formatSourceLabel({ name: '', page: null }).label).toBe('Reference source');
  });
});
