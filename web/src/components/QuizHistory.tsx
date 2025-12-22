import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Trophy, Clock, Calendar, Loader2 } from 'lucide-react';
import { useQuizHistory } from '../hooks/useQuizQuery';
import { QUIZ_CATEGORIES } from '../data/quizData';

export function QuizHistory() {
  const [page, setPage] = useState(1);
  const perPage = 20;
  
  const { data, isLoading, error } = useQuizHistory(page, perPage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Loading quiz history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-brown-600 dark:text-gray-400 mb-4">Failed to load quiz history</p>
          <Link to="/dashboard" className="text-coral-600 dark:text-ocean-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { results, pagination } = data || { results: [], pagination: { page: 1, total_pages: 1, total_count: 0, has_next: false, has_prev: false, per_page: 20 } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 safe-area-top">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-700 flex items-center justify-center shadow-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-brown-800 dark:text-white">
                Quiz History
              </h1>
              <p className="text-xs text-brown-500 dark:text-gray-400">
                {pagination.total_count} {pagination.total_count === 1 ? 'quiz' : 'quizzes'} taken
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {results.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-purple-500 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-brown-800 dark:text-white mb-2">
              No Quizzes Yet
            </h3>
            <p className="text-brown-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Take your first quiz to start tracking your progress!
            </p>
            <Link
              to="/quiz"
              className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Take a Quiz
            </Link>
          </div>
        ) : (
          <>
            {/* Results List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-cream-200 dark:border-slate-700 divide-y divide-cream-100 dark:divide-slate-700 mb-6">
              {results.map((result) => {
                const category = QUIZ_CATEGORIES.find(c => c.id === result.category_id.replace('dict-', ''));
                const percentage = Math.round(result.percentage);
                const isDictionary = result.category_id.startsWith('dict-');
                
                return (
                  <Link
                    key={result.id}
                    to={`/quiz/review/${result.id}`}
                    className="flex items-center justify-between p-4 hover:bg-cream-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{category?.icon || '📝'}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-brown-800 dark:text-white">
                            {result.category_title || category?.title || 'Quiz'}
                          </p>
                          {isDictionary && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                              Dictionary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-brown-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(result.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(result.time_spent_seconds)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          percentage >= 80 
                            ? 'text-green-600 dark:text-green-400'
                            : percentage >= 60
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {percentage}%
                        </div>
                        <p className="text-xs text-brown-500 dark:text-gray-400">
                          {result.score}/{result.total}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-brown-400 dark:text-gray-500" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-brown-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.total_pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!pagination.has_prev}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-cream-200 dark:border-slate-700 text-brown-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!pagination.has_next}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-cream-200 dark:border-slate-700 text-brown-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

