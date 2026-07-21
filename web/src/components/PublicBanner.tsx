import { Sparkles } from 'lucide-react';

/**
 * Banner shown to unauthenticated users promoting the app
 */
export function PublicBanner() {
  return (
    <div className="bg-gradient-to-r from-teal-500 to-ocean-500 dark:from-ocean-600 dark:to-teal-600 text-white px-3 py-2 sm:px-4 sm:py-3 shadow-lg">
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-1.5 sm:gap-2">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        <p className="text-xs sm:text-sm md:text-base font-medium text-center">
          <span className="font-bold">Learn Chamorro for Free!</span>
          <span className="hidden sm:inline"> Create an account to start chatting and save your progress.</span>
        </p>
      </div>
    </div>
  );
}

