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
    <div className="px-4 sm:px-6 pb-3">
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`flex-1 px-3 sm:px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                mode === m.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-pressed={mode === m.id}
              title={m.description}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{m.icon}</span>
                <span className="text-sm sm:text-base">{m.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
