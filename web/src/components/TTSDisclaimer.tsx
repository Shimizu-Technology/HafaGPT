import { useState } from 'react';
import { Info, X, Volume2 } from 'lucide-react';

interface TTSDisclaimerProps {
  variant?: 'tooltip' | 'banner' | 'inline' | 'compact';
  className?: string;
}

/**
 * Reusable TTS quality disclaimer component
 * 
 * Variants:
 * - tooltip: Small info icon that shows tooltip on hover/click
 * - banner: Full info box (for setup screens)
 * - inline: Compact text with icon (for headers)
 * - compact: Minimal icon-only for tight spaces (games)
 */
export function TTSDisclaimer({ variant = 'tooltip', className = '' }: TTSDisclaimerProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const shortText = "AI audio may differ from traditional pronunciation";
  
  const detailedText = `Our text-to-speech uses AI to help with pronunciation, but Chamorro has unique sounds that AI doesn't capture perfectly:

• Y sounds like "dz" (hayi = "ha-dzee")
• CH sounds like "ts" (chocho = "tso-tso")  
• Å sounds like "aw" (håfa = "haw-fa")

We apply phonetic hints to improve accuracy, but for authentic pronunciation, listen to native Chamorro speakers.`;

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
            <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              About Audio Pronunciation
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed mb-2">
              {shortText}. Chamorro has unique sounds like <strong>Y = "dz"</strong> and <strong>CH = "ts"</strong> that AI voice technology is still learning.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 italic">
              💡 Tip: For authentic pronunciation, listen to native speakers or check the pronunciation guides in our lessons.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 ${className}`}>
        <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{shortText}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`relative inline-flex ${className}`}>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="p-1.5 rounded-lg bg-amber-100/80 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
          aria-label="Audio pronunciation note"
          title="Audio pronunciation note"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </button>
        
        {showTooltip && (
          <>
            {/* Backdrop for mobile */}
            <div 
              className="fixed inset-0 z-40 sm:hidden" 
              onClick={() => setShowTooltip(false)} 
            />
            <div className="absolute z-50 bottom-full right-0 mb-2 w-72 p-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg shadow-xl">
              {/* Arrow */}
              <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-amber-200 dark:border-amber-700 rotate-45" />
              
              <div className="relative">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Audio Note</span>
                  </div>
                  <button 
                    onClick={() => setShowTooltip(false)}
                    className="p-1 hover:bg-cream-100 dark:hover:bg-slate-700 rounded"
                  >
                    <X className="w-4 h-4 text-brown-400" />
                  </button>
                </div>
                <div className="text-xs text-brown-600 dark:text-gray-400 space-y-2">
                  <p>{shortText}.</p>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 space-y-1">
                    <p className="font-medium text-amber-700 dark:text-amber-400">Chamorro sounds:</p>
                    <ul className="space-y-0.5 text-amber-600 dark:text-amber-500">
                      <li>• <strong>Y</strong> = "dz" (hayi → "ha-dzee")</li>
                      <li>• <strong>CH</strong> = "ts" (chocho → "tso-tso")</li>
                      <li>• <strong>Å</strong> = "aw" (håfa → "haw-fa")</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 sm:hidden" 
            onClick={() => setShowTooltip(false)} 
          />
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-4 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-xl shadow-xl">
            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-amber-200 dark:border-amber-700 rotate-45" />
            
            <div className="relative">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                    <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">About Audio Pronunciation</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
                  className="p-1 hover:bg-cream-100 dark:hover:bg-slate-700 rounded sm:hidden"
                >
                  <X className="w-4 h-4 text-brown-400" />
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-brown-600 dark:text-gray-400 leading-relaxed">
                  {shortText}. We use AI text-to-speech with phonetic hints, but Chamorro has unique sounds:
                </p>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 space-y-1.5">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700 dark:text-amber-400">Y</span>
                      <span className="text-amber-600 dark:text-amber-500">= "dz"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700 dark:text-amber-400">CH</span>
                      <span className="text-amber-600 dark:text-amber-500">= "ts"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700 dark:text-amber-400">Å</span>
                      <span className="text-amber-600 dark:text-amber-500">= "aw"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700 dark:text-amber-400">Ñ</span>
                      <span className="text-amber-600 dark:text-amber-500">= "ny"</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-amber-600 dark:text-amber-500 italic">
                  💡 For authentic pronunciation, listen to native speakers!
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
