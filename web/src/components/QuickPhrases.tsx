interface QuickPhrasesProps {
  onSelect: (phrase: string) => void;
  disabled?: boolean;
}

export function QuickPhrases({ onSelect, disabled }: QuickPhrasesProps) {
  const phrases = [
    { text: "How do you say hello?", icon: "👋" },
    { text: "Teach me greetings", icon: "🗣️" },
    { text: "What does MSY mean?", icon: "❓" },
    { text: "Translate this sentence", icon: "🔤" }
  ];

  return (
    <div className="px-3 sm:px-4 pt-5 sm:pt-0 pb-2 sm:pb-2.5 bg-cream-50 dark:bg-gray-900/50 -mt-3 sm:mt-0">
      <div className="w-full sm:max-w-4xl sm:mx-auto">
        <p className="text-[10px] sm:text-xs font-medium text-brown-600 dark:text-gray-400 mb-1.5 sm:mb-2">Quick start:</p>
        {/* Mobile: Horizontal scroll */}
        <div className="flex sm:hidden gap-2 overflow-x-auto -mx-3 px-3 scrollbar-hide snap-x snap-mandatory">
          {phrases.map((phrase, index) => (
            <button
              key={index}
              onClick={() => onSelect(phrase.text)}
              disabled={disabled}
              className="flex-shrink-0 w-32 px-2 py-1.5 text-[10px] bg-cream-100 dark:bg-gray-800 text-brown-700 dark:text-gray-300 border border-cream-300 dark:border-gray-700 rounded-lg hover:bg-teal-50 dark:hover:bg-ocean-950/30 hover:border-teal-300 dark:hover:border-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-left flex items-center gap-1.5 group snap-start"
            >
              <span className="text-xs group-hover:scale-110 transition-transform flex-shrink-0">{phrase.icon}</span>
              <span className="truncate leading-tight font-medium">{phrase.text}</span>
            </button>
          ))}
        </div>
        {/* Desktop: Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-2">
          {phrases.map((phrase, index) => (
            <button
              key={index}
              onClick={() => onSelect(phrase.text)}
              disabled={disabled}
              className="px-4 py-2.5 text-sm bg-cream-100 dark:bg-gray-800 text-brown-700 dark:text-gray-300 border border-cream-300 dark:border-gray-700 rounded-xl hover:bg-teal-50 dark:hover:bg-ocean-950/30 hover:border-teal-300 dark:hover:border-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-left flex items-center gap-3 group"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">{phrase.icon}</span>
              <span>{phrase.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
