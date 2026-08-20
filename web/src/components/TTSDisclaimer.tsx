import { useEffect, useId, useRef, useState } from 'react';
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
  const disclosureId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTooltip(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showTooltip]);

  const shortText = "Synthetic AI audio — native-speaker review pending";
  const disclosure = "Most HåfaGPT pronunciation audio is generated with AI and has not yet been approved by a named native Chamorro reviewer. Use it as a listening aid, not as the pronunciation authority.";
  
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
              {disclosure}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Prefer reviewed native-speaker recordings whenever they are available.
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
          ref={triggerRef}
          onClick={() => setShowTooltip(!showTooltip)}
          className="p-1.5 rounded-lg bg-amber-100/80 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
          aria-label="Audio pronunciation note"
          title="Audio pronunciation note"
          aria-expanded={showTooltip}
          aria-controls={showTooltip ? disclosureId : undefined}
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
            <div id={disclosureId} role="note" className="absolute z-50 bottom-full right-0 mb-2 w-72 p-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg shadow-xl">
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
                    aria-label="Close audio pronunciation note"
                    className="p-1 hover:bg-cream-100 dark:hover:bg-slate-700 rounded"
                  >
                    <X className="w-4 h-4 text-brown-400" />
                  </button>
                </div>
                <div className="text-xs text-brown-600 dark:text-gray-400 space-y-2">
                  <p className="font-medium text-amber-700 dark:text-amber-400">{shortText}</p>
                  <p>{disclosure}</p>
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
        ref={triggerRef}
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
        aria-label="Audio quality note"
        aria-expanded={showTooltip}
        aria-controls={showTooltip ? disclosureId : undefined}
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
          <div id={disclosureId} role="note" className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-4 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-xl shadow-xl">
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
                  aria-label="Close audio quality note"
                  className="p-1 hover:bg-cream-100 dark:hover:bg-slate-700 rounded sm:hidden"
                >
                  <X className="w-4 h-4 text-brown-400" />
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-brown-600 dark:text-gray-400 leading-relaxed">
                  {disclosure}
                </p>
                
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Prefer reviewed native-speaker recordings whenever they are available.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
