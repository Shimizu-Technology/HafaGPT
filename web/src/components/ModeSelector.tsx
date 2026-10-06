import { GraduationCap, Languages, MessageCircle } from 'lucide-react';
import type { ChatIntent } from '../lib/chatIntent';

interface ModeSelectorProps {
  mode: 'english' | 'chamorro' | 'learn';
  onModeChange: (mode: 'english' | 'chamorro' | 'learn') => void;
  intent: ChatIntent;
  onIntentChange: (intent: ChatIntent) => void;
  disabled?: boolean;
}

export function ModeSelector({ intent, onIntentChange, disabled }: ModeSelectorProps) {
  const tasks = [
    { id: 'translate' as const, label: 'Translate', icon: Languages },
    { id: 'explain' as const, label: 'Explain', icon: MessageCircle },
    { id: 'practice' as const, label: 'Practice', icon: GraduationCap },
  ];

  return (
    <div className="border-t border-cream-200/80 px-3 py-2 dark:border-slate-800 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="grid w-full min-w-0 grid-cols-3 gap-1 rounded-xl bg-cream-200/70 p-1 dark:bg-slate-800" role="group" aria-label="Tutor task">
          {tasks.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" disabled={disabled} onClick={() => onIntentChange(id)} aria-pressed={intent === id}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${intent === id ? 'bg-white text-brown-900 shadow-sm ring-1 ring-cream-300 dark:bg-slate-700 dark:text-white dark:ring-slate-600' : 'text-brown-600 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-slate-700/60'} disabled:opacity-50`}>
              <Icon className="h-4 w-4" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
