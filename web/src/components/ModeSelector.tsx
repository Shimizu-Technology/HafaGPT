import { GraduationCap, Languages, MessageCircle } from 'lucide-react';

interface ModeSelectorProps {
  mode: 'english' | 'chamorro' | 'learn';
  onModeChange: (mode: 'english' | 'chamorro' | 'learn') => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const modes = [
    { id: 'english' as const, label: 'English', icon: MessageCircle, description: 'English responses with Chamorro examples' },
    { id: 'chamorro' as const, label: 'Chamorro', icon: Languages, description: 'Chamorro-first responses' },
    { id: 'learn' as const, label: 'Learn', icon: GraduationCap, description: 'Step-by-step learning explanations' },
  ];

  return (
    <div className="border-t border-cream-200/80 px-3 py-2 dark:border-slate-800 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-cream-200/70 p-1 dark:bg-slate-800" aria-label="Response style">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:min-h-11 sm:gap-2 sm:text-sm ${
                  mode === m.id
                    ? 'bg-white text-brown-900 shadow-sm ring-1 ring-cream-300 dark:bg-slate-700 dark:text-white dark:ring-slate-600'
                    : 'text-brown-600 hover:bg-white/60 hover:text-brown-900 dark:text-gray-400 dark:hover:bg-slate-700/60 dark:hover:text-white'
                }`}
                aria-pressed={mode === m.id}
                title={m.description}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
