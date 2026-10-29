import { Flame, MessageSquare, Gamepad2, GraduationCap, Trophy, CheckCircle2, Circle } from 'lucide-react';
import { useStreak } from '../hooks/useStreak';

export function StreakWidget() {
  const { streak, isLoading } = useStreak();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-cream-200/50 dark:border-slate-700/50 animate-pulse">
        <div className="h-20 bg-cream-100 dark:bg-slate-700 rounded-lg" />
      </div>
    );
  }

  if (!streak) {
    return null;
  }

  const { current_streak, longest_streak, is_today_active, today_activities } = streak;
  const totalTodayActivities = today_activities.chat + today_activities.games + today_activities.quizzes;


  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-cream-200/50 dark:border-slate-700/50">
      {/* Header with streak count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-muted" aria-hidden="true" />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-ink">
                {current_streak}
              </span>
              <span className="text-sm text-brown-500 dark:text-gray-400">
                day{current_streak !== 1 ? 's' : ''}
              </span>
            </div>
            {!is_today_active && current_streak > 0 && (
              <p className="text-xs text-muted">
                Do an activity to keep your streak!
              </p>
            )}
          </div>
        </div>

        {/* Personal best badge */}
        {longest_streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 text-muted">
            <Trophy className="w-3.5 h-3.5 text-muted" />
            <span className="text-xs font-medium text-muted">
              Best: {longest_streak}
            </span>
          </div>
        )}
      </div>

      {/* Today's progress */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-brown-600 dark:text-gray-400">
          Today's activity
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {/* Chat */}
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-cream-50 dark:bg-slate-700/50">
            {today_activities.chat > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-cream-300 dark:text-gray-600" />
            )}
            <MessageSquare className={`w-3.5 h-3.5 ${
              today_activities.chat > 0 
                ? 'text-muted'
                : 'text-brown-500 dark:text-gray-400'
            }`} />
            <span className={`text-xs font-medium ${
              today_activities.chat > 0 
                ? 'text-muted'
                : 'text-brown-500 dark:text-gray-400'
            }`}>
              {today_activities.chat}
            </span>
          </div>

          {/* Games */}
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-cream-50 dark:bg-slate-700/50">
            {today_activities.games > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-cream-300 dark:text-gray-600" />
            )}
            <Gamepad2 className={`w-3.5 h-3.5 ${
              today_activities.games > 0 
                ? 'text-muted'
                : 'text-brown-500 dark:text-gray-400'
            }`} />
            <span className={`text-xs font-medium ${
              today_activities.games > 0 
                ? 'text-muted'
                : 'text-brown-500 dark:text-gray-400'
            }`}>
              {today_activities.games}
            </span>
          </div>

          {/* Quizzes */}
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-cream-50 dark:bg-slate-700/50">
            {today_activities.quizzes > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-cream-300 dark:text-gray-600" />
            )}
            <GraduationCap className={`w-3.5 h-3.5 ${
              today_activities.quizzes > 0 
                ? 'text-muted'
                : 'text-brown-500 dark:text-gray-400'
            }`} />
            <span className={`text-xs font-medium ${
              today_activities.quizzes > 0 
                ? 'text-muted'
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
              ? 'Chat, play, or take a quiz to keep your streak.'
              : 'Complete an activity to start your streak.'
            }
          </p>
        )}
        
        {is_today_active && (
          <p className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> You're on track today.
          </p>
        )}
      </div>
    </div>
  );
}

export default StreakWidget;
