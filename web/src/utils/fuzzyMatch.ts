/**
 * Fuzzy matching utilities for Chamorro text comparison.
 * 
 * Handles:
 * - Diacritic normalization (å→a, ñ→n, á→a, etc.)
 * - Glottal stop removal (')
 * - Case insensitivity
 * - Levenshtein distance for typo tolerance
 */

/**
 * Normalize Chamorro text by removing diacritics and special characters.
 * This allows "håfa" to match "hafa" and "na'ån" to match "naan".
 */
export function normalizeChamorro(text: string): string {
  if (!text) return '';
  
  let normalized = text.toLowerCase().trim();
  
  // Replace Chamorro-specific characters
  const replacements: Record<string, string> = {
    'å': 'a',
    'ñ': 'n',
    'á': 'a',
    'é': 'e',
    'í': 'i',
    'ó': 'o',
    'ú': 'u',
    "'": '',  // Glottal stop (straight apostrophe)
    "'": '',  // Curly apostrophe
    "‑": '-', // Non-breaking hyphen
  };
  
  for (const [from, to] of Object.entries(replacements)) {
    normalized = normalized.split(from).join(to);
  }
  
  // Remove any remaining combining diacritical marks
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

/**
 * Calculate Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits needed.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity percentage between two strings.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function similarityScore(a: string, b: string): number {
  const normalizedA = normalizeChamorro(a);
  const normalizedB = normalizeChamorro(b);
  
  // Exact match after normalization
  if (normalizedA === normalizedB) return 1;
  
  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}

/**
 * Check if user's answer is close enough to the correct answer.
 * 
 * @param userAnswer - What the user typed
 * @param correctAnswer - The correct answer
 * @param acceptableAnswers - Optional list of alternative correct answers
 * @param threshold - Minimum similarity score to accept (0-1, default 0.8 = 80%)
 * @returns Object with isCorrect and matchType
 */
export function checkFuzzyAnswer(
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers: string[] = [],
  threshold: number = 0.8
): { isCorrect: boolean; matchType: 'exact' | 'normalized' | 'fuzzy' | 'none' } {
  const normalizedUser = normalizeChamorro(userAnswer);
  const normalizedCorrect = normalizeChamorro(correctAnswer);
  
  // Check exact match (case-insensitive)
  if (userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase()) {
    return { isCorrect: true, matchType: 'exact' };
  }
  
  // Check exact match after normalization
  if (normalizedUser === normalizedCorrect) {
    return { isCorrect: true, matchType: 'normalized' };
  }
  
  // Check against acceptable answers
  for (const acceptable of acceptableAnswers) {
    if (userAnswer.toLowerCase().trim() === acceptable.toLowerCase()) {
      return { isCorrect: true, matchType: 'exact' };
    }
    if (normalizedUser === normalizeChamorro(acceptable)) {
      return { isCorrect: true, matchType: 'normalized' };
    }
  }
  
  // Fuzzy match against correct answer
  const score = similarityScore(userAnswer, correctAnswer);
  if (score >= threshold) {
    return { isCorrect: true, matchType: 'fuzzy' };
  }
  
  // Fuzzy match against acceptable answers
  for (const acceptable of acceptableAnswers) {
    const acceptableScore = similarityScore(userAnswer, acceptable);
    if (acceptableScore >= threshold) {
      return { isCorrect: true, matchType: 'fuzzy' };
    }
  }
  
  return { isCorrect: false, matchType: 'none' };
}

