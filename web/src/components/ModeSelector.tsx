interface ModeSelectorProps {
  mode: 'english' | 'chamorro' | 'learn';
  onModeChange: (mode: 'english' | 'chamorro' | 'learn') => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const modes = [
    { id: 'english' as const, label: 'English', icon: '🇺🇸', description: 'English responses with Chamorro examples' },
    { id: 'chamorro' as const, label: 'Chamorro', icon: '🇬🇺', description: 'Chamorro-only responses' },
    { id: 'learn' as const, label: 'Learn', icon: '📚', description: 'Detailed learning explanations' },
  ];

  return (
    <div className="px-3 sm:px-6 pb-2 sm:pb-3">
      <div className="w-full sm:max-w-5xl sm:mx-auto">
        <div className="flex gap-1.5 sm:gap-2 bg-cream-200 dark:bg-gray-800 p-1 sm:p-1.5 rounded-xl">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 ${
                mode === m.id
                  ? 'bg-cream-50 dark:bg-gray-700 text-brown-800 dark:text-white shadow-md scale-[1.02] ring-2 ring-teal-500 dark:ring-ocean-500'
                  : 'text-brown-600 dark:text-gray-400 hover:text-brown-800 dark:hover:text-gray-200'
              }`}
              aria-pressed={mode === m.id}
              title={m.description}
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg">{m.icon}</span>
                <span className="text-xs sm:text-base">{m.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
