import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, GraduationCap, Languages, MessageCircle } from 'lucide-react';
import type { ChatIntent } from '../lib/chatIntent';

const TASKS = [
  { id: 'translate' as const, label: 'Translate', detail: 'Phrases, messages, photos of notices', icon: Languages },
  { id: 'explain' as const, label: 'Explain', detail: 'Words, grammar and life in Guam', icon: MessageCircle },
  { id: 'practice' as const, label: 'Practice', detail: 'Short guided conversations', icon: GraduationCap },
];

interface ModeSelectorProps {
  intent: ChatIntent;
  onIntentChange: (intent: ChatIntent) => void;
  disabled?: boolean;
}

/** Full task choice for a new chat, where there is room to compare all three. */
export function ModeSelector({ intent, onIntentChange, disabled }: ModeSelectorProps) {
  return (
    <div className="border-t border-cream-200/80 px-3 py-2 dark:border-slate-800 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="grid w-full min-w-0 grid-cols-3 gap-1 rounded-xl bg-cream-200/70 p-1 dark:bg-slate-800" role="group" aria-label="Tutor task">
          {TASKS.map(({ id, label, icon: Icon }) => (
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

/** Compact task switcher for the composer once a conversation has started. */
export function TaskMenu({ intent, onIntentChange, disabled }: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const current = TASKS.find(task => task.id === intent) || TASKS[1];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    itemRefs.current[TASKS.findIndex(task => task.id === intent)]?.focus();
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open, intent]);

  const choose = (next: ChatIntent) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (next !== intent) onIntentChange(next);
  };

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const index = itemRefs.current.findIndex(item => item === document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      itemRefs.current[(index + step + TASKS.length) % TASKS.length]?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button ref={buttonRef} type="button" disabled={disabled} onClick={() => setOpen(value => !value)}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        aria-label={`Task: ${current.label}. Change task`}
        className="flex h-11 min-w-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-brown-700 hover:bg-cream-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-slate-800">
        <CurrentIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{current.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label="Tutor task" onKeyDown={onMenuKeyDown}
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-cream-300 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {TASKS.map(({ id, label, detail, icon: Icon }, index) => (
            <button key={id} ref={element => { itemRefs.current[index] = element; }} type="button" role="menuitemradio"
              aria-checked={intent === id} onClick={() => choose(id)}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-cream-100 focus:bg-cream-100 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800">
              <Icon className="h-4 w-4 shrink-0 text-brown-600 dark:text-gray-300" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-brown-900 dark:text-white">{label}</span>
                <span className="block text-xs text-brown-600 dark:text-gray-400">{detail}</span>
              </span>
              {intent === id && <Check className="h-4 w-4 shrink-0 text-coral-700 dark:text-ocean-300" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
