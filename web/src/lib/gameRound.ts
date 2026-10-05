/** Finite, unique distractors even at the smallest and largest number. */
export function numberOptions(target: number, random = Math.random): number[] {
  const candidates = Array.from({ length: 10 }, (_, i) => i + 1)
    .filter(value => value !== target)
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
  const options = [target, ...candidates.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

/** Preserve the original 60 Hz pace without speeding up on 120/144 Hz screens. */
export function frameDistance(speed: number, milliseconds: number): number {
  return speed * Math.min(Math.max(milliseconds, 0), 100) / (1000 / 60);
}

/** A bounded shuffle also handles repeated-letter words without recursion. */
export function scrambleLetters(word: string, random = Math.random): string[] {
  const letters = Array.from(word.toUpperCase());
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join('') === word.toUpperCase()) {
    const different = letters.findIndex(letter => letter !== letters[0]);
    if (different > 0) [letters[0], letters[different]] = [letters[different], letters[0]];
  }
  return letters;
}
