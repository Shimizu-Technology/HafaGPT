import { WORDLE_FEEDBACK } from './wordleFeedback';
import { memo } from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

interface WordleKeyboardProps {
  onKeyPress: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  letterStates: Record<string, 'correct' | 'present' | 'absent' | 'unused'>;
  disabled?: boolean;
}

// Chamorro keyboard layout with special characters
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'Å', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'Ñ', 'C', 'V', 'B', 'N', 'M', "'"],
];

export const WordleKeyboard = memo(function WordleKeyboard({
  onKeyPress,
  onEnter,
  onBackspace,
  letterStates,
  disabled = false,
}: WordleKeyboardProps) {
  const getKeyStyle = (key: string) => {
    const state = letterStates[key.toUpperCase()];

    const baseStyle = `
      font-bold text-base rounded

      flex flex-col items-center justify-center
      min-w-0 shrink
    `;

    switch (state) {
      case 'correct':
        return `${baseStyle} flex-1 h-11 sm:h-14 bg-green-700 text-white`;
      case 'present':
        return `${baseStyle} flex-1 h-11 sm:h-14 bg-yellow-700 text-white`;
      case 'absent':
        return `${baseStyle} flex-1 h-11 sm:h-14 bg-gray-600 dark:bg-slate-600 text-white`;
      default:
        return `${baseStyle} flex-1 h-11 sm:h-14 bg-cream-200 dark:bg-slate-600 text-brown-800 dark:text-white hover:bg-cream-300 dark:hover:bg-slate-500`;
    }
  };

  const getActionKeyStyle = () => {
    return `
      font-bold text-sm rounded

      flex flex-col items-center justify-center
      w-10 sm:w-14 h-11 sm:h-14
      bg-cream-300 dark:bg-slate-700 text-brown-700 dark:text-gray-200
      hover:bg-cream-400 dark:hover:bg-slate-600
    `;
  };

  const handleKeyClick = (key: string) => {
    if (disabled) return;
    onKeyPress(key);
  };

  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full max-w-xl mx-auto">
      {/* First row - QWERTYUIOP */}
      <div className="flex gap-[2px] sm:gap-1.5">
        {KEYBOARD_ROWS[0].map((key) => (
          <button
            key={key}
            onClick={() => handleKeyClick(key)}
            disabled={disabled}
            aria-label={`${key}, ${WORDLE_FEEDBACK[letterStates[key] || 'unused'].label}`}
            className={getKeyStyle(key)}
          >
            <span aria-hidden="true">{key}</span><span aria-hidden="true" className="text-xs leading-none">{WORDLE_FEEDBACK[letterStates[key] || 'unused'].mark}</span>
          </button>
        ))}
      </div>

      {/* Second row - AÅSDFGHJKL (slightly indented) */}
      <div className="flex gap-[2px] sm:gap-1.5 ">
        {KEYBOARD_ROWS[1].map((key) => (
          <button
            key={key}
            onClick={() => handleKeyClick(key)}
            disabled={disabled}
            aria-label={`${key}, ${WORDLE_FEEDBACK[letterStates[key] || 'unused'].label}`}
            className={getKeyStyle(key)}
          >
            <span aria-hidden="true">{key}</span><span aria-hidden="true" className="text-xs leading-none">{WORDLE_FEEDBACK[letterStates[key] || 'unused'].mark}</span>
          </button>
        ))}
      </div>

      {/* Third row - ENTER + letters + BACKSPACE */}
      <div className="flex gap-[2px] sm:gap-1.5">
        <button
          onClick={onEnter}
          aria-label="Submit guess"
          disabled={disabled}
          className={getActionKeyStyle()}
        >
          <CornerDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="flex gap-[2px] sm:gap-1.5 flex-1">
          {KEYBOARD_ROWS[2].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyClick(key)}
              disabled={disabled}
              aria-label={`${key}, ${WORDLE_FEEDBACK[letterStates[key] || 'unused'].label}`}
            className={getKeyStyle(key)}
            >
              <span aria-hidden="true">{key}</span><span aria-hidden="true" className="text-xs leading-none">{WORDLE_FEEDBACK[letterStates[key] || 'unused'].mark}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onBackspace}
          aria-label="Delete letter"
          disabled={disabled}
          className={getActionKeyStyle()}
        >
          <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
});

