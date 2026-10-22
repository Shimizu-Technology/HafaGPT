export const WORDLE_FEEDBACK = {
  correct: { mark: '✓', label: 'right letter, right spot' },
  present: { mark: '↔', label: 'right letter, different spot' },
  absent: { mark: '×', label: 'not in the word' },
  unused: { mark: '', label: 'not tried' },
  empty: { mark: '', label: 'not submitted' },
} as const;
