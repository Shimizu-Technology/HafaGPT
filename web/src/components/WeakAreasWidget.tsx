import { Link } from 'react-router-dom';
import { AlertCircle, Target, ArrowRight, RefreshCw } from 'lucide-react';
import { useWeakAreas } from '../hooks/useQuizQuery';
import type { WeakAreasData } from '../hooks/useHomepageData';

interface WeakAreasWidgetProps {
  weakAreasData?: WeakAreasData | null; // Optional: Pass data from parent to avoid duplicate fetch
  isLoading?: boolean;
}

export function WeakAreasWidget({ weakAreasData: passedData, isLoading: passedLoading }: WeakAreasWidgetProps) {
  // Use passed data if available, otherwise fetch our own
  const { data: fetchedData, isLoading: fetchLoading } = useWeakAreas();
  const weakAreasData = passedData ?? fetchedData;
  const isLoading = passedLoading ?? fetchLoading;

  // Don't show if loading or no data
  if (isLoading && !passedData) {
    return null; // Could add skeleton here if needed
  }

  // Don't show if no weak areas
  if (!weakAreasData?.has_weak_areas) {
    return null;
  }

  const recommendation = weakAreasData.recommendation;
  const weakAreas = weakAreasData.weak_areas;

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-red-200 dark:border-red-700/50 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center shadow-md">
          <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-brown-800 dark:text-white text-base sm:text-lg">
            Areas to Practice
          </h3>
          <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400">
            You could improve in these topics
          </p>
        </div>
      </div>

      {/* Weak areas list */}
      <div className="space-y-2 mb-4">
        {weakAreas.slice(0, 3).map((area) => (
          <div 
            key={area.category_id}
            className="flex items-center justify-between p-2.5 bg-white/60 dark:bg-gray-800/40 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${
                area.priority === 'high' 
                  ? 'text-red-500 dark:text-red-400' 
                  : 'text-orange-500 dark:text-orange-400'
              }`} />
              <span className="text-sm font-medium text-brown-700 dark:text-gray-300">
                {area.category_title || area.category_id}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                area.priority === 'high'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
              }`}>
                {Math.round(area.avg_score)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action button */}
      {recommendation && (
        <Link
          to={`/quiz/${recommendation.category_id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all hover:shadow-lg active:scale-98 group"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          <span>Practice {recommendation.category_title || recommendation.category_id}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* Encouraging message */}
      <p className="mt-3 text-xs text-center text-brown-500 dark:text-gray-400">
        💪 Keep practicing — you'll master these soon!
      </p>
    </div>
  );
}

