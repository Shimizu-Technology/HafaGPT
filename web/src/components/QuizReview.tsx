import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, X, Trophy, Clock, Calendar, Loader2 } from 'lucide-react';
import { useQuizResultDetail } from '../hooks/useQuizQuery';
import { QUIZ_CATEGORIES } from '../data/quizData';

export function QuizReview() {
  const { resultId } = useParams<{ resultId: string }>();
  const { data: result, isLoading, error } = useQuizResultDetail(resultId);

  // Get category info for icon
  const category = result?.category_id ? QUIZ_CATEGORIES.find(c => c.id === result.category_id.replace('dict-', '')) : undefined;
  const isDictionaryQuiz = result?.category_id?.startsWith('dict-');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Loading quiz review...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-brown-600 dark:text-gray-400 mb-4">
            {error ? 'Failed to load quiz review' : 'Quiz not found'}
          </p>
          <Link to="/dashboard" className="text-coral-600 dark:text-ocean-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3 safe-area-top">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category?.icon || '📚'}</span>
            <h1 className="text-lg font-semibold text-brown-800 dark:text-white">
              {result.category_title || 'Quiz Review'}
            </h1>
            {isDictionaryQuiz && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                Dictionary
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Score Summary Card */}
        <div className={`rounded-2xl p-6 mb-6 ${
          result.percentage >= 80 
            ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30'
            : result.percentage >= 60
            ? 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30'
            : 'bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className={`w-10 h-10 ${
                result.percentage >= 80 
                  ? 'text-green-600 dark:text-green-400'
                  : result.percentage >= 60
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
              }`} />
              <div>
                <h2 className="text-3xl font-bold text-brown-800 dark:text-white">
                  {Math.round(result.percentage)}%
                </h2>
                <p className="text-sm text-brown-600 dark:text-gray-300">
                  {result.score} of {result.total} correct
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-brown-600 dark:text-gray-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(result.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatTime(result.time_spent_seconds)}</span>
            </div>
          </div>
        </div>

        {/* Questions Review */}
        {result.answers.length > 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-brown-800 dark:text-white mb-4">
              Question Review ({result.answers.length} questions)
            </h3>
            <div className="space-y-4">
              {result.answers.map((answer, idx) => (
                <div 
                  key={answer.id}
                  className={`p-4 rounded-xl border ${
                    answer.is_correct 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      answer.is_correct 
                        ? 'bg-green-200 dark:bg-green-800'
                        : 'bg-red-200 dark:bg-red-800'
                    }`}>
                      {answer.is_correct ? (
                        <Check className="w-5 h-5 text-green-700 dark:text-green-300" />
                      ) : (
                        <X className="w-5 h-5 text-red-700 dark:text-red-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-brown-500 dark:text-gray-400 uppercase">
                          Q{idx + 1} • {answer.question_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-medium text-brown-800 dark:text-white mb-3">
                        {answer.question_text}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div className={`flex items-start gap-2 ${
                          answer.is_correct 
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          <span className="font-medium flex-shrink-0">Your answer:</span>
                          <span>{answer.user_answer}</span>
                        </div>
                        
                        {!answer.is_correct && (
                          <div className="flex items-start gap-2 text-green-700 dark:text-green-400">
                            <span className="font-medium flex-shrink-0">Correct answer:</span>
                            <span>{answer.correct_answer}</span>
                          </div>
                        )}
                        
                        {answer.explanation && (
                          <div className="mt-3 p-3 bg-white/50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-brown-600 dark:text-gray-300 text-sm">
                              💡 {answer.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6 text-center">
            <p className="text-brown-600 dark:text-gray-400">
              Detailed question review is not available for this quiz.
            </p>
            <p className="text-sm text-brown-500 dark:text-gray-500 mt-2">
              (Older quizzes may not have saved individual answers)
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={`/quiz/${result.category_id}`}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Try Again
          </Link>
          <Link
            to="/quiz"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 text-brown-800 dark:text-white rounded-xl font-semibold border-2 border-coral-200 dark:border-ocean-600 hover:bg-coral-50 dark:hover:bg-slate-600 transition-all"
          >
            Other Quizzes
          </Link>
        </div>
      </div>
    </div>
  );
}

