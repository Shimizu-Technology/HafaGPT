import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Grid3X3, ChevronRight, Check, Sparkles } from 'lucide-react';

export function DailyWordleCard() {
  const [isPlayed, setIsPlayed] = useState(false);
  const [attempts, setAttempts] = useState<number | null>(null);

  useEffect(() => {
    // Check if daily wordle was played today
    const dailyKey = `wordle-daily-${new Date().toDateString()}`;
    const played = localStorage.getItem(dailyKey);
    if (played) {
      setIsPlayed(true);
      // Try to parse the number of attempts from stored data
      try {
        const data = JSON.parse(played);
        if (data.attempts) {
          setAttempts(data.attempts);
        }
      } catch {
        // If stored as boolean or unparseable, just show as played
      }
    }
  }, []);

  // Mini wordle grid visualization
  const MiniGrid = () => (
    <div className="flex flex-col gap-0.5">
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((col) => (
            <div
              key={col}
              className={`w-3 h-3 rounded-[2px] ${
                isPlayed && attempts && row < attempts
                  ? row === attempts - 1
                    ? 'bg-green-400 dark:bg-green-500' // Winning row
                    : 'bg-amber-300 dark:bg-amber-500/70' // Previous guesses
                  : 'bg-indigo-200/60 dark:bg-indigo-700/40' // Empty
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <Link
      to="/games/wordle"
      className="block bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 dark:from-indigo-900/30 dark:via-purple-900/20 dark:to-indigo-900/30 rounded-2xl p-5 border border-indigo-200/80 dark:border-indigo-800/50 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group overflow-hidden relative"
    >
      {/* Decorative background pattern */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 dark:from-indigo-700/20 dark:to-purple-700/20 rounded-bl-[60px] -mr-2 -mt-2" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Grid3X3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Daily Wordle</p>
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400">Chamorro Edition</p>
            </div>
          </div>
          {isPlayed ? (
            <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">
              <Check className="w-3 h-3" />
              Complete
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-medium animate-pulse">
              <Sparkles className="w-3 h-3" />
              New
            </span>
          )}
        </div>

        {/* Content area with grid */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isPlayed ? (
              <>
                <p className="text-lg font-bold text-indigo-800 dark:text-indigo-200 mb-1">
                  {attempts ? `Solved in ${attempts}/6!` : 'Completed!'}
                </p>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  Come back tomorrow for a new word
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-indigo-800 dark:text-indigo-200 mb-1">
                  Today's Challenge
                </p>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  Guess the 5-letter Chamorro word
                </p>
              </>
            )}
          </div>
          
          {/* Mini grid visualization */}
          <div className="ml-4">
            <MiniGrid />
          </div>
        </div>

        {/* Play button / footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-indigo-200/50 dark:border-indigo-700/50">
          <p className="text-xs text-indigo-500 dark:text-indigo-400">
            {isPlayed ? '🎯 Great job!' : '🧠 6 attempts to guess'}
          </p>
          <div className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
            {isPlayed ? 'View result' : 'Play now'}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
