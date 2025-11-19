import { SignInButton } from '@clerk/clerk-react';
import { Sparkles } from 'lucide-react';

/**
 * Banner shown to unauthenticated users promoting sign-up
 */
export function PublicBanner() {
  return (
    <div className="bg-gradient-to-r from-teal-500 to-ocean-500 dark:from-ocean-600 dark:to-teal-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Message */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm sm:text-base font-medium">
            <span className="font-bold">Learn Chamorro for Free!</span>
            <span className="hidden sm:inline"> Create an account to start chatting and save your progress.</span>
            <span className="sm:hidden"> Sign up to start learning.</span>
          </p>
        </div>
        
        {/* CTA Button */}
        <SignInButton mode="modal">
          <button className="px-5 py-2 bg-white text-teal-600 dark:text-ocean-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap">
            Sign Up Free
          </button>
        </SignInButton>
      </div>
    </div>
  );
}

