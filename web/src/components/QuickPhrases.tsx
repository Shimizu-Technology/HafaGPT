interface QuickPhrasesProps {
  onSelect: (phrase: string) => void;
  disabled?: boolean;
}

export function QuickPhrases({ onSelect, disabled }: QuickPhrasesProps) {
  const phrases = [
    "How do you say hello?",
    "Teach me greetings",
    "What does MSY mean?",
    "Translate this sentence"
  ];

  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-gray-600 mb-2">Quick phrases:</p>
        <div className="flex flex-wrap gap-2">
          {phrases.map((phrase, index) => (
            <button
              key={index}
              onClick={() => onSelect(phrase)}
              disabled={disabled}
              className="px-3 py-1.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
