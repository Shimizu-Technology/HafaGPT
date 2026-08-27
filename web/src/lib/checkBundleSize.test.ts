import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
// The production gate is an executable JavaScript module, not application code.
// @ts-expect-error It intentionally has no separate TypeScript declaration.
import { inspectBundle } from '../../scripts/check-bundle-size.mjs';

const encode = (value: string) => new TextEncoder().encode(value);
const indexHtml = `
  <link href="/assets/shared.js" rel="modulepreload">
  <link rel="modulepreload" href="/assets/feature.js">
  <link rel="modulepreload" href="/assets/shared.js">
  <script type="module" src="/assets/entry.js"></script>
`;
const assets = new Map([
  ['entry.js', encode('entry payload')],
  ['shared.js', encode('shared payload is longer')],
  ['feature.js', encode('feature payload is longest of the initial files')],
  ['lazy.js', encode('lazy payload')],
]);
const unlimitedBudgets = {
  maxInitialBytes: Number.POSITIVE_INFINITY,
  maxInitialGzipBytes: Number.POSITIVE_INFINITY,
  maxChunkBytes: Number.POSITIVE_INFINITY,
};

describe('production bundle accounting', () => {
  it('deduplicates and sums every eager entry and modulepreload asset', () => {
    const result = inspectBundle(indexHtml, assets, unlimitedBudgets);
    const expectedInitialFiles = ['entry.js', 'shared.js', 'feature.js'];

    expect(result.initialFiles).toEqual(expectedInitialFiles);
    expect(result.initialBytes).toBe(
      expectedInitialFiles.reduce((total, file) => total + assets.get(file)!.byteLength, 0),
    );
    expect(result.initialGzipBytes).toBe(
      expectedInitialFiles.reduce(
        (total, file) => total + gzipSync(assets.get(file)!).byteLength,
        0,
      ),
    );
    expect(result.initialFiles).not.toContain('lazy.js');
  });

  it('fails when a referenced initial asset is absent', () => {
    const missingFeature = new Map(assets);
    missingFeature.delete('feature.js');

    expect(() => inspectBundle(indexHtml, missingFeature, unlimitedBudgets)).toThrow(
      'Could not inspect initial JavaScript asset feature.js.',
    );
  });

  it('reports a raw aggregate limit independently', () => {
    const baseline = inspectBundle(indexHtml, assets, unlimitedBudgets);
    const result = inspectBundle(indexHtml, assets, {
      ...unlimitedBudgets,
      maxInitialBytes: baseline.initialBytes - 1,
    });

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('initial JavaScript is');
    expect(result.failures[0]).not.toContain('compressed');
  });

  it('reports a compressed aggregate limit independently', () => {
    const baseline = inspectBundle(indexHtml, assets, unlimitedBudgets);
    const result = inspectBundle(indexHtml, assets, {
      ...unlimitedBudgets,
      maxInitialGzipBytes: baseline.initialGzipBytes - 1,
    });

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('compressed initial JavaScript is');
  });

  it('reports oversized chunks independently of initial limits', () => {
    const result = inspectBundle(indexHtml, assets, {
      ...unlimitedBudgets,
      maxChunkBytes: assets.get('lazy.js')!.byteLength - 1,
    });

    expect(result.oversizedChunks.map(({ file }: { file: string }) => file)).toContain('lazy.js');
    expect(
      result.failures.some((failure: string) => failure.includes('chunk lazy.js is')),
    ).toBe(true);
  });
});
