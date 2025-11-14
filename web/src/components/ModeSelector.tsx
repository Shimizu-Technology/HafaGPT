interface ModeSelectorProps {
  mode: 'english' | 'chamorro' | 'learn';
  onModeChange: (mode: 'english' | 'chamorro' | 'learn') => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const modes = [
    { id: 'english' as const, label: 'English', icon: '🇺🇸', description: 'Default mode' },
    { id: 'chamorro' as const, label: 'Chamorro', icon: '🇬🇺', description: 'Chamorro-only' },
    { id: 'learn' as const, label: 'Learn', icon: '📚', description: 'Detailed learning' },
  ];

  return (
    <div className="flex gap-2 p-4 bg-white border-b border-gray-200">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
            mode === m.id
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-pressed={mode === m.id}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">{m.icon}</span>
            <span className="hidden sm:inline">{m.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
