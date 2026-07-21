import { usePWAUpdate } from '../hooks/usePWAUpdate';

/**
 * Banner that shows when a new version of the app is available.
 * Allows users to update immediately or dismiss.
 */
export function PWAUpdateBanner() {
  const { updateAvailable, applyUpdate, dismissUpdate } = usePWAUpdate();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-teal-500 to-ocean-500 dark:from-ocean-600 dark:to-teal-600 text-white rounded-xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg 
              className="w-5 h-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              New Version Available! 🎉
            </p>
            <p className="text-xs text-white/80 mt-0.5">
              Update now to get the latest features and improvements.
            </p>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyUpdate}
            className="flex-1 bg-white text-teal-600 dark:text-ocean-600 font-semibold text-sm py-2 px-4 rounded-lg hover:bg-white/90 transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={dismissUpdate}
            className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
