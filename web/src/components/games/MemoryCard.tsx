import { memo } from 'react';

interface MemoryCardProps {
  id: number;
  content: string;
  type: 'chamorro' | 'english';
  isFlipped: boolean;
  isMatched: boolean;
  onClick: (id: number) => void;
  disabled: boolean;
  onRead?: () => void;
}

export const MemoryCard = memo(function MemoryCard({
  id,
  content,
  type,
  isFlipped,
  isMatched,
  onClick,
  disabled,
  onRead,
}: MemoryCardProps) {
  const handleClick = () => {
    if (!disabled && !isFlipped && !isMatched) {
      onClick(id);
    }
  };

  return (
    <div>
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isFlipped || isMatched}
      aria-label={
        isFlipped || isMatched
          ? `${type === 'chamorro' ? 'Chamorro' : 'English'} card: ${content}${isMatched ? ', matched' : ''}`
          : 'Reveal memory card'
      }
      className={`
        relative w-full aspect-square cursor-pointer overflow-hidden border-0 bg-transparent p-0
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2
        dark:focus-visible:ring-ocean-400 dark:focus-visible:ring-offset-slate-900
        ${disabled || isFlipped || isMatched ? 'cursor-default' : ''}
      `}
      style={{ perspective: '1000px' }}
    >
      <div
        aria-hidden="true"
        className="game-memory-flip relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped || isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 200ms cubic-bezier(.23,1,.32,1)',
        }}
      >
        {/* Card Back (face-down) */}
        <div
          className={`
            absolute top-0 left-0 right-0 bottom-0 rounded-lg sm:rounded-xl md:rounded-2xl
            bg-coral-700 dark:bg-teal-700
            flex items-center justify-center border-2 border-coral-400 dark:border-ocean-400
            ${isFlipped || isMatched ? '' : ''}
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-xl sm:text-3xl md:text-4xl">🌺</div>
        </div>

        {/* Card Front (face-up) */}
        <div
          className={`
            absolute top-0 left-0 right-0 bottom-0 rounded-lg sm:rounded-xl md:rounded-2xl
            ${isMatched
              ? 'bg-emerald-700 dark:bg-emerald-800 border-emerald-700 dark:border-emerald-600'
              : 'bg-white dark:bg-slate-800 border-cream-300 dark:border-slate-600'
            }
            border-2 flex flex-col items-center justify-center p-1 sm:p-2 md:p-3
          `}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {(isFlipped || isMatched) && (
            <>
              {/* Language Badge */}
              <span className={`
                inline-block px-1 sm:px-1.5 py-0.5 text-xs font-bold rounded-full mb-0.5 sm:mb-1
                ${type === 'chamorro'
                  ? 'bg-coral-100 text-coral-700 dark:bg-coral-900/40 dark:text-coral-300'
                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                }
                ${isMatched ? 'bg-white/20 text-white' : ''}
              `}>
                {type === 'chamorro' ? 'CH' : 'EN'}
              </span>

              {/* Word - Full text with proper wrapping */}
              <p className={`
                font-bold text-center leading-tight px-0.5 w-full
                text-base sm:text-base
                ${isMatched
                  ? 'text-white'
                  : 'text-brown-800 dark:text-white'
                }
              `}
              style={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto',
                overflow: 'auto',
                maxHeight: '75%',
              }}
              >
                {content}
              </p>
            </>
          )}
        </div>
      </div>
    </button>
    {(isFlipped || isMatched) && onRead && <button type="button" onClick={onRead} className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 px-2 text-sm font-semibold text-brown-800 dark:border-slate-600 dark:text-gray-200">Read / hear card</button>}
    </div>
  );
});
