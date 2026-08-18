import { describe, expect, it } from 'vitest';
import { getGuamDateKey, validateSeasonalThemeSettings } from './siteThemeAdmin';

describe('seasonal theme admin validation', () => {
  it('requires a current or future Guam cutoff for enabled seasonal themes', () => {
    expect(validateSeasonalThemeSettings('christmas', true, '', '2026-08-18')).toMatch(/end date/i);
    expect(validateSeasonalThemeSettings('christmas', true, '2026-13-45', '2026-08-18')).toMatch(/valid calendar/i);
    expect(validateSeasonalThemeSettings('christmas', true, '2026-02-30', '2026-02-01')).toMatch(/valid calendar/i);
    expect(validateSeasonalThemeSettings('newyear', true, '2026-08-17', '2026-08-18')).toMatch(/future/i);
    expect(validateSeasonalThemeSettings('christmas', true, '2026-08-18', '2026-08-18')).toBeNull();
  });

  it('does not impose seasonal bounds on base themes', () => {
    expect(validateSeasonalThemeSettings('default', true, '', '2026-08-18')).toBeNull();
    expect(validateSeasonalThemeSettings('chamorro', false, '', '2026-08-18')).toBeNull();
  });

  it('formats the current date in Guam rather than the device timezone', () => {
    expect(getGuamDateKey(new Date('2026-08-17T15:30:00Z'))).toBe('2026-08-18');
  });
});
