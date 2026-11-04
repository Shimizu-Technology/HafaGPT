import { describe, expect, it } from 'vitest';
import css from './index.css?raw';

// Warm dark mode contract: dark surfaces come from the brown scale, text from
// cream/brown, coral stays the action. Dark tokens must stay readable (WCAG AA).

type Rgb = [number, number, number];
const BROWN: Record<string, Rgb> = {
  '100': [0xe8, 0xde, 0xd6], '200': [0xd4, 0xbf, 0xb0], '300': [0xb8, 0x9b, 0x85], '700': [0x45, 0x34, 0x28], '900': [0x2a, 0x1f, 0x1a], '950': [0x1c, 0x15, 0x12],
};
const TEAL_300: Rgb = [0x88, 0xd5, 0xd6];

function block(selector: string): Record<string, Rgb> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('\n  }', start));
  const vars: Record<string, Rgb> = {};
  for (const [, name, r, g, b] of body.matchAll(/--([a-z0-9-]+):\s*(\d+) (\d+) (\d+)/g)) vars[name] = [Number(r), Number(g), Number(b)];
  return vars;
}
const luminance = ([r, g, b]: Rgb) => {
  const [lr, lg, lb] = [r, g, b].map(v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const root = block(':root');
const dark = { ...root, ...block('.dark') };
const WHITE: Rgb = [255, 255, 255];

describe('warm dark tokens', () => {
  const grounds: [string, Rgb][] = [['ground', dark.surface], ['card', dark['surface-subtle']], ['raised', BROWN['700']]];

  it('builds the dark ground from the brown scale', () => {
    expect(dark.surface).toEqual(BROWN['950']);
    expect(dark['surface-subtle']).toEqual(BROWN['900']);
  });

  it.each(grounds)('keeps ink, muted, and the dark text tiers at 4.5:1 on %s', (_name, ground) => {
    for (const text of [dark.ink, dark.muted, BROWN['100'], BROWN['300']]) expect(contrast(text, ground)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps white labels on the coral action at 4.5:1 in both themes', () => {
    expect(contrast(WHITE, root.action)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(WHITE, dark.action)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(WHITE, dark['action-hover'])).toBeGreaterThanOrEqual(4.5);
  });

  it('shows the coral action against the dark ground as a control, not just a label', () => {
    expect(contrast(dark.action, dark.surface)).toBeGreaterThanOrEqual(3);
  });

  it.each(grounds)('keeps coral accent text readable on %s and on coral tints', (_name, ground) => {
    expect(contrast(dark['coral-700'], ground)).toBeGreaterThanOrEqual(4.5);
    for (const tint of [dark['coral-50'], dark['coral-100']]) {
      expect(contrast(dark['coral-700'], tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(dark['coral-800'], tint)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps coral icons, the focus ring, and teal text above 3:1 and 4.5:1', () => {
    for (const [, ground] of grounds) {
      expect(contrast(dark['coral-500'], ground)).toBeGreaterThanOrEqual(3);
      expect(contrast(dark['focus-role'], ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(TEAL_300, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('leaves the light tokens as the original coral palette', () => {
    expect(root.action).toEqual([184, 55, 48]);
    expect(root['action-hover']).toEqual([150, 48, 46]);
    expect(root['coral-700']).toEqual([184, 55, 48]);
    expect(root.surface).toEqual([254, 253, 251]);
  });
});

describe('learner surfaces use the warm palette', () => {
  const sources = import.meta.glob('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const files = Object.entries(sources).filter(([path]) => !/\.test\.tsx?$/.test(path));

  it('has no slate classes anywhere', () => {
    const hits = files.filter(([, text]) => /(?<![\w-])[\w:[\]()@.,&_-]*\b(?:bg|text|border|ring|divide|placeholder|from|to|via|fill|stroke)-slate-\d/.test(text)).map(([path]) => path);
    expect(hits).toEqual([]);
  });

  it('has no cool-gray dark variants', () => {
    const hits = files.filter(([, text]) => /dark:[^\s'"`]*-(?:slate|gray|zinc|neutral|stone)-\d/.test(text)).map(([path]) => path);
    expect(hits).toEqual([]);
  });
});
