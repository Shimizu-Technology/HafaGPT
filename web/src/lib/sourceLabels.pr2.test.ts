import { describe, expect, it } from 'vitest';
import type { SourceInfo } from '../types/source';
import { formatSourceLabel, plainSourceName, plainSourceText } from './sourceLabels';
describe('plain source labels shared with public reading', () => {
  it('labels provenance in plain words while retaining the exact locator', () => {
    expect(formatSourceLabel({ name: 'raw', source_id: 'hafagpt_canonical_evaluation', page: 12,
      locator: 'entry 4', content_role: 'reviewed_lexicon', region: 'Guam_and_CNMI_source_lineage', temporal_scope: 'modern' })).toEqual({
      label: 'HåfaGPT vocabulary list (p. 12)',
      detail: 'entry 4 • Vocabulary reference • Sources from Guam and the Northern Mariana Islands • Modern usage',
    });
  });
  it('replaces internal names for the HåfaGPT list wherever they appear', () => {
    for (const name of ['HåfaGPT canonical vocabulary', 'HåfaGPT canonical vocabulary ledger', 'HåfaGPT canonical evaluation index']) {
      expect(formatSourceLabel({ name, page: null }).label).toBe('HåfaGPT vocabulary list');
    }
    expect(plainSourceText('This word matches a HåfaGPT canonical entry. The canonical entry is source-verified.'))
      .toBe('This word matches a HåfaGPT vocabulary list entry. The vocabulary list entry is source-verified.');
    expect(plainSourceText('Cite the canonical vocabulary ledger.')).toBe('Cite the vocabulary list.');
    expect(plainSourceText('Revised Chamorro dictionary')).toBe('Revised Chamorro dictionary');
  });
  it('preserves unknown caveats, source names and page zero without inventing review', () => {
    expect(formatSourceLabel({ name: 'Family manuscript', page: 0, content_role: 'not_yet_verified', region: 'Rota' })).toEqual({
      label: 'Family manuscript (p. 0)', detail: 'not yet verified • Rota',
    });
    expect(formatSourceLabel({ name: '', page: null }).label).toBe('Reference source');
  });
});

describe('citation names', () => {
  it.each(['HåfaGPT canonical evaluation index', 'HåfaGPT canonical vocabulary ledger', 'canonical vocabulary ledger'])('names HåfaGPT\'s own list plainly: %s', name => {
    expect(plainSourceName(name)).toBe('HåfaGPT vocabulary list');
    expect(formatSourceLabel({ name } as SourceInfo).label).toBe('HåfaGPT vocabulary list');
  });

  it.each(['Archive: canonical ledger, volume 2', 'The canonical entry for Guam', 'Canonical index of Pacific texts'])('keeps another source\'s title: %s', name => {
    expect(plainSourceName(name)).toBe(name);
    expect(formatSourceLabel({ name } as SourceInfo).label).toBe(name);
  });
});
