import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DailyWord } from './DailyWord';

export function WelcomeMessage() {
  const [showModes, setShowModes] = useState(false);

  return (
    <div className="flex items-start justify-center px-4 py-4 sm:py-6 w-full">
      <div className="w-full sm:max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600 flex items-center justify-center text-2xl sm:text-4xl shadow-xl shadow-coral-500/30 dark:shadow-ocean-500/30">
            🌺
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-1">Håfa Adai!</h1>
          <p className="text-sm sm:text-lg text-brown-600 dark:text-gray-400">I'm your Chamorro language tutor.</p>
        </div>

        {/* Daily Word Widget */}
        <div className="mb-4 sm:mb-6">
          <DailyWord />
        </div>

        {/* Mode Explanations - Collapsible on mobile, always visible on desktop */}
        <div className="bg-cream-50 dark:bg-gray-800/50 rounded-2xl border border-cream-300 dark:border-gray-700 overflow-hidden">
          {/* Mobile: Collapsible header */}
          <button
            onClick={() => setShowModes(!showModes)}
            className="sm:hidden w-full p-3 flex items-center justify-between text-left"
          >
            <p className="text-xs text-brown-700 dark:text-gray-300 font-medium">
              Ask me about Chamorro words, phrases, grammar, or culture!
            </p>
            <ChevronDown className={`w-4 h-4 text-brown-500 dark:text-gray-400 transition-transform flex-shrink-0 ml-2 ${showModes ? 'rotate-180' : ''}`} />
          </button>

          {/* Desktop: Always visible header */}
          <div className="hidden sm:block p-5 pb-3">
            <p className="text-sm text-brown-700 dark:text-gray-300 font-medium">
              Ask me about Chamorro words, phrases, grammar, or culture!
            </p>
          </div>

          {/* Mode cards - Collapsible on mobile */}
          <div className={`${showModes ? 'block' : 'hidden'} sm:block px-3 pb-3 sm:px-5 sm:pb-5`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-[10px] sm:text-xs">
              <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-cream-100 dark:bg-gray-800 rounded-xl border border-cream-300 dark:border-gray-700">
                <span className="text-sm sm:text-base flex-shrink-0">🇺🇸</span>
                <div className="min-w-0">
                  <span className="font-semibold text-brown-800 dark:text-white">English</span>
                  <span className="text-brown-500 dark:text-gray-500"> - with examples</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-cream-100 dark:bg-gray-800 rounded-xl border border-cream-300 dark:border-gray-700">
                <span className="text-sm sm:text-base flex-shrink-0">🇬🇺</span>
                <div className="min-w-0">
                  <span className="font-semibold text-brown-800 dark:text-white">Chamorro</span>
                  <span className="text-brown-500 dark:text-gray-500"> - immersive</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-cream-100 dark:bg-gray-800 rounded-xl border border-cream-300 dark:border-gray-700">
                <span className="text-sm sm:text-base flex-shrink-0">📚</span>
                <div className="min-w-0">
                  <span className="font-semibold text-brown-800 dark:text-white">Learn</span>
                  <span className="text-brown-500 dark:text-gray-500"> - detailed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
