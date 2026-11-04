import { describe, expect, it } from 'vitest';
import { TRUST_LEVEL_SURFACE_CLASSES } from './contentTrust';

describe('trust surfaces', () => {
  it('use only the teal, amber, and neutral families', () => {
    const classes = Object.values(TRUST_LEVEL_SURFACE_CLASSES).join(' ');
    expect(classes).not.toMatch(/sky|violet|purple|indigo/);
    const families = new Set(classes.match(/(?:border|bg)-(teal|amber|cream|brown|white)/g)?.map((match) => match.split('-')[1]));
    expect([...families].sort()).toEqual(['amber', 'brown', 'cream', 'teal', 'white']);
    expect(TRUST_LEVEL_SURFACE_CLASSES.developing).toContain('amber');
    expect(TRUST_LEVEL_SURFACE_CLASSES.ai_practice).not.toMatch(/teal|amber/);
  });
});
