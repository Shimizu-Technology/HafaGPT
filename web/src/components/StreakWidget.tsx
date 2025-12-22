import { Flame, MessageSquare, Gamepad2, GraduationCap, Trophy, CheckCircle2, Circle } from 'lucide-react';
import { useStreak } from '../hooks/useStreak';
import { useSubscription } from '../hooks/useSubscription';

export function StreakWidget() {
  const { streak, isLoading } = useStreak();
  const { isChristmasTheme, isNewYearTheme } = useSubscription();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-cream-200/50 dark:border-gray-700/50 animate-pulse">
        <div className="h-20 bg-cream-100 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (!streak) {
    return null;
  }

  const { current_streak, longest_streak, is_today_active, today_activities } = streak;
  const totalTodayActivities = today_activities.chat + today_activities.games + today_activities.quizzes;

  // Determine streak status and color
  const isStreakActive = current_streak > 0;
  const streakColor = is_today_active
    ? 'text-orange-500'
    : current_streak > 0
    ? 'text-amber-400' // Streak at risk (yesterday was active, today not yet)
    : 'text-gray-400 dark:text-gray-500';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-cream-200/50 dark:border-gray-700/50 shadow-sm">
      {/* Header with streak count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`relative ${is_today_active ? 'animate-pulse' : ''}`}>
            <Flame className={`w-7 h-7 ${streakColor}`} />
            {is_today_active && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold ${
                isStreakActive ? 'text-brown-800 dark:text-white' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {current_streak}
              </span>
              <span className="text-sm text-brown-500 dark:text-gray-400">
                day{current_streak !== 1 ? 's' : ''}
              </span>
            </div>
            {!is_today_active && current_streak > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Do an activity to keep your streak!
              </p>
            )}
          </div>
        </div>

        {/* Personal best badge */}
        {longest_streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Best: {longest_streak}
            </span>
          </div>
        )}
      </div>

      {/* Today's progress */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-brown-600 dark:text-gray-400 uppercase tracking-wide">
          Today's Activity
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {/* Chat */}
          <div className={`flex items-center gap-1.5 p-2 rounded-lg ${
            today_activities.chat > 0 
              ? 'bg-teal-50 dark:bg-teal-900/20' 
              : 'bg-cream-50 dark:bg-gray-700/50'
          }`}>
            {today_activities.chat > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
            ) : (
              <Circle className="w-4 h-4 text-cream-300 dark:text-gray-600" />
            )}
            <MessageSquare className={`w-3.5 h-3.5 ${
              today_activities.chat > 0 
                ? 'text-teal-600 dark:text-teal-400' 
                : 'text-brown-400 dark:text-gray-500'
            }`} />
            <span className={`text-xs font-medium ${
              today_activities.chat > 0 
                ? 'text-teal-700 dark:text-teal-300' 
                : 'text-brown-500 dark:text-gray-400'
            }`}>
              {today_activities.chat}
            </span>
          </div>

          {/* Games */}
          <div className={`flex items-center gap-1.5 p-2 rounded-lg ${
            today_activities.games > 0 
              ? 'bg-pink-50 dark:bg-pink-900/20' 
              : 'bg-cream-50 dark:bg-gray-700/50'
          }`}>
            {today_activities.games > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-pink-500" />
            ) : (
              <Circle className="w-4 h-4 text-cream-300 dark:text-gray-600" />
            )}
            <Gamepad2 className={`w-3.5 h-3.5 ${
              today_activities.games > 0 
                ? 'text-pink-600 dark:text-pink-400' 
                : 'text-brown-400 dark:text-gray-500'
            }`} />
            <span className={`text-xs font-medium ${
              today_activities.games > 0 
                ? 'text-pink-700 dark:text-pink-300' 
                : 'text-brown-500 dark:text-gray-400'
            }`}>
              {today_activities.games}
            </span>
          </div>

          {/* Quizzes */}
          <div className={`flex items-center gap-1.5 p-2 rounded-lg ${
            today_activities.quizzes > 0 
              ? 'bg-indigo-50 dark:bg-indigo-900/20' 
              : 'bg-cream-50 dark:bg-gray-700/50'
          }`}>
            {today_activities.quizzes > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            ) : (
              <Circle className="w-4 h-4 text-cream-300 dark:text-gray-600" />
            )}
            <GraduationCap className={`w-3.5 h-3.5 ${
              today_activities.quizzes > 0 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-brown-400 dark:text-gray-500'
            }`} />
            <span className={`text-xs font-medium ${
              today_activities.quizzes > 0 
                ? 'text-indigo-700 dark:text-indigo-300' 
                : 'text-brown-500 dark:text-gray-400'
            }`}>
              {today_activities.quizzes}
            </span>
          </div>
        </div>

        {/* Encouragement message */}
        {totalTodayActivities === 0 && (
          <p className="text-xs text-center text-brown-500 dark:text-gray-400 mt-2">
            {current_streak > 0 
              ? `${isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'} Chat, play, or quiz to keep your streak!`
              : `${isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'} Start your streak today!`
            }
          </p>
        )}
        
        {is_today_active && (
          <p className="text-xs text-center text-green-600 dark:text-green-400 mt-2">
            ✓ You're on track today!
          </p>
        )}
      </div>
    </div>
  );
}

export default StreakWidget;
