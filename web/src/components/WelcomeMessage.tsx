export function WelcomeMessage() {
  return (
    <div className="flex items-center justify-center h-full px-4 py-6 sm:p-8 w-full">
      <div className="text-center w-full sm:max-w-2xl animate-fade-in">
        <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-6 rounded-3xl bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600 flex items-center justify-center text-3xl sm:text-5xl shadow-2xl shadow-coral-500/30 dark:shadow-ocean-500/30">
          🌺
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-brown-800 dark:text-white mb-1.5 sm:mb-3">Håfa Adai!</h1>
        <p className="text-base sm:text-xl text-brown-600 dark:text-gray-400 mb-4 sm:mb-8">I'm your Chamorro language tutor.</p>
        <div className="text-left bg-cream-50 dark:bg-gray-800/50 rounded-2xl p-3 sm:p-6 space-y-2.5 sm:space-y-4 border border-cream-300 dark:border-gray-700">
          <p className="text-xs sm:text-base text-brown-700 dark:text-gray-300 font-medium">
            Ask me about Chamorro words, phrases, grammar, or culture!
          </p>
          <div className="space-y-1.5 sm:space-y-3 text-[11px] sm:text-sm">
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-cream-100 dark:bg-gray-800 rounded-xl border border-cream-300 dark:border-gray-700">
              <span className="text-base sm:text-xl flex-shrink-0">🇺🇸</span>
              <div className="min-w-0">
                <strong className="text-brown-800 dark:text-white">English mode:</strong>
                <span className="text-brown-600 dark:text-gray-400 ml-1">Get responses in English with Chamorro examples</span>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-cream-100 dark:bg-gray-800 rounded-xl border border-cream-300 dark:border-gray-700">
              <span className="text-base sm:text-xl flex-shrink-0">🇬🇺</span>
              <div className="min-w-0">
                <strong className="text-brown-800 dark:text-white">Chamorro mode:</strong>
                <span className="text-brown-600 dark:text-gray-400 ml-1">Practice with Chamorro-only responses</span>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-cream-100 dark:bg-gray-800 rounded-xl border border-cream-300 dark:border-gray-700">
              <span className="text-base sm:text-xl flex-shrink-0">📚</span>
              <div className="min-w-0">
                <strong className="text-brown-800 dark:text-white">Learn mode:</strong>
                <span className="text-brown-600 dark:text-gray-400 ml-1">Get detailed explanations and cultural context</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
