import { ThinkingDots } from './Message';

/** Fallback wait state for replies that do not stream; matches the streaming reply's first moment. */
export function LoadingIndicator() {
  return (
    <div className="mb-4 flex justify-start animate-fade-in sm:mb-6">
      <div className="w-full max-w-[68ch]">
        <div className="mb-2 px-1 text-xs font-semibold text-brown-700 dark:text-brown-100">HåfaGPT</div>
        <div className="flex min-h-[1.5rem] items-center gap-2 px-1 py-1">
          <ThinkingDots />
          <span role="status" className="text-sm text-brown-600 dark:text-brown-100">Thinking…</span>
        </div>
      </div>
    </div>
  );
}
