import { describe, expect, it } from 'vitest';
import { frameDistance, numberOptions, scrambleLetters } from './gameRound';

describe('game rounds', () => {
  it.each(Array.from({ length: 10 }, (_, index) => index + 1))('finishes with four unique bounded choices for target %i', target => {
    for (const random of [() => 0, () => 0.5, () => 0.999]) {
      const choices = numberOptions(target, random);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(target);
      expect(choices.every(value => value >= 1 && value <= 10)).toBe(true);
    }
  });
  it('travels the same distance over one second at 60, 120 and 144 Hz', () => {
    for (const hz of [60, 120, 144]) expect(frameDistance(0.15, 1000 / hz) * hz).toBeCloseTo(9);
  });
  it('does not jump through the screen after a background tab resumes', () => {
    expect(frameDistance(0.15, 10000)).toBeCloseTo(0.9);
  });
  it('terminates for repeated letters and a random source that never swaps', () => {
    expect(scrambleLetters('AAA', () => 0.999)).toEqual(['A', 'A', 'A']);
    const scrambled = scrambleLetters('KÅDDO', () => 0.999);
    expect(scrambled.join('')).not.toBe('KÅDDO');
    expect(scrambled.slice().sort()).toEqual(Array.from('KÅDDO').sort());
  });
});
