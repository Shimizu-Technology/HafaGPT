import { Link } from 'react-router-dom';
import { RotateCcw, Clock, CheckCircle, ArrowRight, BookOpen } from 'lucide-react';
import { useSRSummary } from '../hooks/useSpacedRepetition';
import type { SRSummaryData } from '../hooks/useHomepageData';

interface DueCardsWidgetProps {
  srSummaryData?: SRSummaryData | null; // Optional: Pass data from parent to avoid duplicate fetch
  isLoading?: boolean;
}

export function DueCardsWidget({ srSummaryData: passedData, isLoading: passedLoading }: DueCardsWidgetProps) {
  // Use passed data if available, otherwise fetch our own
  const { data: fetchedData, isLoading: fetchLoading } = useSRSummary();
  const summary = passedData ?? fetchedData;
  const isLoading = passedLoading ?? fetchLoading;

  // Don't show if loading
  if (isLoading && !passedData) {
    return null;
  }

  // Don't show if user hasn't started spaced repetition yet
  if (!summary?.has_cards) {
    return null;
  }

  const hasDueCards = summary.due_today > 0;

  return (
    <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 border shadow-sm ${
      hasDueCards
        ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-700/50'
        : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700/50'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md ${
          hasDueCards
            ? 'bg-gradient-to-br from-purple-400 to-indigo-500'
            : 'bg-gradient-to-br from-green-400 to-emerald-500'
        }`}>
          {hasDueCards ? (
            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          ) : (
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          )}
        </div>
        <div>
          <h3 className="font-bold text-brown-800 dark:text-white text-base sm:text-lg">
            {hasDueCards ? 'Cards Due for Review' : 'All Caught Up!'}
          </h3>
          <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400">
            {hasDueCards 
              ? `${summary.due_today} card${summary.due_today !== 1 ? 's' : ''} waiting for you`
              : 'No cards due right now'
            }
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-white/60 dark:bg-gray-800/40 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-sm font-bold text-brown-800 dark:text-white">
            {summary.learning}
          </p>
          <p className="text-[10px] text-brown-500 dark:text-gray-400">Learning</p>
        </div>
        
        <div className="text-center p-2 bg-white/60 dark:bg-gray-800/40 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className="text-sm font-bold text-brown-800 dark:text-white">
            {summary.due_today}
          </p>
          <p className="text-[10px] text-brown-500 dark:text-gray-400">Due Today</p>
        </div>
        
        <div className="text-center p-2 bg-white/60 dark:bg-gray-800/40 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          </div>
          <p className="text-sm font-bold text-brown-800 dark:text-white">
            {summary.mastered}
          </p>
          <p className="text-[10px] text-brown-500 dark:text-gray-400">Mastered</p>
        </div>
      </div>

      {/* Action button */}
      {hasDueCards && (
        <Link
          to="/flashcards"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-medium transition-all hover:shadow-lg active:scale-98 group"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Review {summary.due_today} Card{summary.due_today !== 1 ? 's' : ''}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {!hasDueCards && (
        <p className="text-xs text-center text-brown-500 dark:text-gray-400">
          🎉 Great job! Check back later for more reviews.
        </p>
      )}
    </div>
  );
}

