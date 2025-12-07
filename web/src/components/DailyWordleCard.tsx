import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Grid3X3, ChevronRight, Check, Target } from 'lucide-react';

export function DailyWordleCard() {
  const [isPlayed, setIsPlayed] = useState(false);
  const [score, setScore] = useState<string | null>(null);

  useEffect(() => {
    // Check if daily wordle was played today
    const dailyKey = `wordle-daily-${new Date().toDateString()}`;
    const played = localStorage.getItem(dailyKey);
    setIsPlayed(!!played);
    
    // Try to get the score from game history (optional enhancement)
    // For now, just show if played or not
  }, []);

  return (
    <Link
      to="/games/wordle"
      className="block bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Grid3X3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Daily Wordle</p>
              {isPlayed ? (
                <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  Done
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full animate-pulse">
                  <Target className="w-3 h-3" />
                  New
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
              {isPlayed ? 'Come back tomorrow!' : 'Guess today\'s word in 6 tries'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-400 dark:text-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors" />
      </div>
    </Link>
  );
}

