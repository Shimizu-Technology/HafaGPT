export function WelcomeMessage() {
  return (
    <div className="flex items-center justify-center h-full p-4 sm:p-8">
      <div className="text-center max-w-2xl animate-fade-in">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-3xl bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl shadow-ocean-500/30">
          🌺
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">Håfa Adai!</h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">I'm your Chamorro language tutor.</p>
        <div className="text-left bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">
            Ask me about Chamorro words, phrases, grammar, or culture!
          </p>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-lg sm:text-xl flex-shrink-0">🇺🇸</span>
              <div>
                <strong className="text-gray-900 dark:text-white">English mode:</strong>
                <span className="text-gray-600 dark:text-gray-400 ml-1">Get responses in English with Chamorro examples</span>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-lg sm:text-xl flex-shrink-0">🇬🇺</span>
              <div>
                <strong className="text-gray-900 dark:text-white">Chamorro mode:</strong>
                <span className="text-gray-600 dark:text-gray-400 ml-1">Practice with Chamorro-only responses</span>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-lg sm:text-xl flex-shrink-0">📚</span>
              <div>
                <strong className="text-gray-900 dark:text-white">Learn mode:</strong>
                <span className="text-gray-600 dark:text-gray-400 ml-1">Get detailed explanations and cultural context</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
