import type { ChatIntent } from '../lib/chatIntent';
import { ArrowUpRight } from 'lucide-react';

interface WelcomeMessageProps {
  onSelect: (intent: ChatIntent) => void;
  onPrompt?: (prompt: string) => void;
  disabled?: boolean;
  intent?: ChatIntent;
  onStartPractice?: () => void;
}

const EXAMPLES: Record<ChatIntent, string[]> = {
  translate: ["Translate ‘Good morning’ into Chamorro.", "Translate ‘Thank you’ into Chamorro."],
  explain: ['Explain how to introduce myself in Chamorro.', 'How are Chamorro words pronounced?'],
  practice: ['Practice a short conversation about family.', 'Help me practice ordering food in Chamorro.'],
};
const DESCRIPTIONS: Record<ChatIntent, string> = {
  translate: 'Paste a phrase or notice, or try a short translation.',
  explain: 'Ask about a word, grammar, or life in Guam.',
  practice: 'Try a short exchange. Ask for a hint whenever you need one.',
};

/** A new chat starts at the top with what the chosen task does and a few ways in.
 *  The page title is the header's h1, so this adds no competing heading. */
export function WelcomeMessage({ onSelect, onPrompt, disabled = false, intent = 'explain', onStartPractice }: WelcomeMessageProps) {
  return (
    <div className="mx-auto w-full max-w-2xl pb-5">
      <p aria-live="polite" className="mb-2 px-1 text-base leading-relaxed text-brown-700 dark:text-gray-300">{DESCRIPTIONS[intent]}</p>
      <div className="grid gap-2" role="group" aria-label="Example prompts">
        {intent === 'practice' && onStartPractice && (
          <button type="button" disabled={disabled} onClick={onStartPractice}
            className="min-h-11 rounded-xl bg-coral-700 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-coral-800 disabled:opacity-50 dark:bg-ocean-700 dark:hover:bg-ocean-800">
            Start guided practice
          </button>
        )}
        {EXAMPLES[intent].map(prompt => (
          <button key={prompt} type="button" disabled={disabled} onClick={() => onPrompt ? onPrompt(prompt) : onSelect(intent)}
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3 text-left text-sm leading-relaxed text-brown-800 transition-colors hover:border-coral-300 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-ocean-600">
            <span>{prompt}</span><ArrowUpRight className="h-4 w-4 flex-none text-brown-500 dark:text-gray-400" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
