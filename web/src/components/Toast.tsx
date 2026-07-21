import { useEffect } from 'react';

interface ToastProps {
  message: string;
  icon: string;
  description?: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, icon, description, onClose, duration = 2500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-cream-50 dark:bg-gray-800 border border-cream-300 dark:border-gray-700 rounded-xl shadow-2xl px-4 py-3 min-w-[280px] sm:min-w-[320px] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <p className="font-semibold text-brown-800 dark:text-white text-sm">
              {message}
            </p>
            {description && (
              <p className="text-xs text-brown-600 dark:text-gray-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

