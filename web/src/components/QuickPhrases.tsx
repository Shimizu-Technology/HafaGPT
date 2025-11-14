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
    <div className="px-4 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Quick phrases to get started:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {phrases.map((phrase, index) => (
            <button
              key={index}
              onClick={() => onSelect(phrase.text)}
              disabled={disabled}
              className="px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-ocean-50 dark:hover:bg-ocean-950/30 hover:border-ocean-300 dark:hover:border-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-left flex items-center gap-3 group"
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
