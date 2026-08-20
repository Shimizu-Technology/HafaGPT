import { GraduationCap, Languages, MessageCircle } from 'lucide-react';

interface WelcomeMessageProps {
  onSelect: (intent: 'translate' | 'ask' | 'practice') => void;
  disabled?: boolean;
}

const STARTERS = [
  {
    label: 'Translate a message',
    description: 'Understand a phrase or school notice',
    intent: 'translate' as const,
    icon: Languages,
  },
  {
    label: 'Ask a question',
    description: 'Learn about a word, grammar, or culture',
    intent: 'ask' as const,
    icon: MessageCircle,
  },
  {
    label: 'Practice together',
    description: 'Work through a useful everyday phrase',
    intent: 'practice' as const,
    icon: GraduationCap,
  },
] as const;

export function WelcomeMessage({ onSelect, disabled = false }: WelcomeMessageProps) {
  return (
    <div className="flex w-full items-start justify-center px-1 py-2 sm:px-4 sm:py-8">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="mb-5 text-center sm:mb-7">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300">
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-brown-950 dark:text-white sm:text-3xl">How can I help?</h1>
          <p className="mx-auto mt-1.5 max-w-lg text-sm leading-relaxed text-brown-600 dark:text-gray-300 sm:text-base">
            Translate Chamorro, ask about Guam, or learn a phrase step by step.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {STARTERS.map(({ label, description, intent, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(intent)}
              disabled={disabled}
              aria-label={label}
              className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 text-left transition-colors hover:border-coral-300 hover:bg-coral-50/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-700 dark:hover:bg-ocean-950/20 sm:min-h-[132px] sm:flex-col sm:items-start sm:p-4"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cream-100 text-coral-700 group-hover:bg-coral-100 dark:bg-slate-700 dark:text-ocean-300 dark:group-hover:bg-ocean-950">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-brown-900 dark:text-white">{label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-brown-500 dark:text-gray-400">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
