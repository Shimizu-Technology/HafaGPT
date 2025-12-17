import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface TTSDisclaimerProps {
  variant?: 'tooltip' | 'banner' | 'inline';
  className?: string;
}

/**
 * Reusable TTS quality disclaimer component
 * 
 * Variants:
 * - tooltip: Small info icon that shows tooltip on hover/click
 * - banner: Full yellow info box (for setup screens)
 * - inline: Compact text with icon (for headers)
 */
export function TTSDisclaimer({ variant = 'tooltip', className = '' }: TTSDisclaimerProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const disclaimerText = "Audio uses text-to-speech which may not pronounce Chamorro perfectly. For authentic pronunciation, listen to native speakers.";

  if (variant === 'banner') {
    return (
      <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 ${className}`}>
        <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
          🔊 <strong>Note:</strong> {disclaimerText} We're working on better audio!
        </p>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 ${className}`}>
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <span>TTS pronunciation may vary</span>
      </div>
    );
  }

  // Default: tooltip
  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
        aria-label="Audio quality note"
      >
        <Info className="w-4 h-4 text-amber-500 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300" />
      </button>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg shadow-lg">
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-amber-200 dark:border-amber-700 rotate-45" />
          
          <div className="relative">
            <div className="flex items-start gap-2">
              <span className="text-lg">🔊</span>
              <div className="flex-1">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Audio Note</p>
                <p className="text-xs text-brown-600 dark:text-gray-400 leading-relaxed">
                  {disclaimerText}
                </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
                className="p-0.5 hover:bg-cream-100 dark:hover:bg-slate-700 rounded sm:hidden"
              >
                <X className="w-3.5 h-3.5 text-brown-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
