import { memo } from 'react';

interface MemoryCardProps {
  id: number;
  content: string;
  type: 'chamorro' | 'english';
  isFlipped: boolean;
  isMatched: boolean;
  onClick: (id: number) => void;
  disabled: boolean;
}

export const MemoryCard = memo(function MemoryCard({
  id,
  content,
  type,
  isFlipped,
  isMatched,
  onClick,
  disabled,
}: MemoryCardProps) {
  const handleClick = () => {
    if (!disabled && !isFlipped && !isMatched) {
      onClick(id);
    }
  };

  // Dynamic text size based on content length - responsive scaling
  const getTextSize = () => {
    const len = content.length;
    if (len <= 6) return 'text-xs sm:text-lg md:text-xl';
    if (len <= 10) return 'text-[11px] sm:text-base md:text-lg';
    if (len <= 15) return 'text-[10px] sm:text-sm md:text-base';
    return 'text-[9px] sm:text-xs md:text-sm';
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative w-full aspect-square cursor-pointer overflow-hidden
        ${disabled || isFlipped || isMatched ? 'pointer-events-none' : ''}
      `}
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped || isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s',
        }}
      >
        {/* Card Back (face-down) */}
        <div
          className={`
            absolute top-0 left-0 right-0 bottom-0 rounded-lg sm:rounded-xl md:rounded-2xl
            bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600
            flex items-center justify-center shadow-md md:shadow-lg
            border-2 border-coral-400 dark:border-ocean-400
            ${isFlipped || isMatched ? '' : 'hover:scale-[1.02] active:scale-95'}
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
              ? 'bg-gradient-to-br from-green-400 to-green-500 dark:from-green-600 dark:to-green-700 border-green-300 dark:border-green-500' 
              : 'bg-white dark:bg-slate-800 border-cream-300 dark:border-slate-600'
            }
            border-2 flex flex-col items-center justify-center p-1 sm:p-2 md:p-3
            shadow-md md:shadow-lg
          `}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Language Badge */}
          <span className={`
            inline-block px-1 sm:px-1.5 py-0.5 text-[7px] sm:text-[9px] md:text-[10px] font-bold rounded-full mb-0.5 sm:mb-1
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
            ${getTextSize()}
            ${isMatched 
              ? 'text-white' 
              : 'text-brown-800 dark:text-white'
            }
          `}
          style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          >
            {content}
          </p>
        </div>
      </div>
    </div>
  );
});
