import { useXP, getLevelInfo } from '../hooks/useXP';
import { Zap, Target, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { XPData } from '../hooks/useHomepageData';

interface XPDisplayProps {
  compact?: boolean; // For use in header or smaller spaces
  xpData?: XPData | null; // Optional: Pass data from parent to avoid duplicate fetch
}

export function XPDisplay({ compact = false, xpData: passedXpData }: XPDisplayProps) {
  // Use passed data if available, otherwise fetch our own
  const { data: fetchedXpData, isLoading } = useXP();
  const xpData = passedXpData ?? fetchedXpData;

  if (isLoading && !passedXpData) {
    return (
      <div className={`animate-pulse ${compact ? 'h-8' : 'h-24'} bg-gray-100 dark:bg-gray-700 rounded-lg`} />
    );
  }

  if (!xpData) {
    return null;
  }

  const levelInfo = getLevelInfo(xpData.level);
  const xpNeeded = xpData.xp_for_next_level - xpData.xp_for_current_level;
  const xpInLevel = xpData.total_xp - xpData.xp_for_current_level;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full border border-amber-200 dark:border-amber-700">
        <span className="text-lg">{levelInfo.emoji}</span>
        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
          Lv.{xpData.level}
        </span>
        <div className="w-16 h-1.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
            style={{ width: `${xpData.xp_progress}%` }}
          />
        </div>
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
          {xpData.total_xp.toLocaleString()}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-amber-200 dark:border-amber-700/50 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md">
            <span className="text-xl sm:text-2xl">{levelInfo.emoji}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-bold text-amber-800 dark:text-amber-200">
                Level {xpData.level}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-amber-200/60 dark:bg-amber-700/40 rounded text-amber-700 dark:text-amber-300 font-medium">
                {levelInfo.title}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400">
              {xpData.total_xp.toLocaleString()} XP total
            </p>
          </div>
        </div>
        
        <Link 
          to="/settings" 
          className="p-2 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded-lg transition-colors"
          title="XP Settings"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Progress to Level {xpData.level + 1}
          </span>
          <span className="text-amber-700 dark:text-amber-300 font-bold">
            {xpInLevel} / {xpNeeded} XP
          </span>
        </div>
        <div className="h-2.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${xpData.xp_progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Daily Goal */}
      {xpData.daily_goal_minutes > 0 && (
        <div className="flex items-center gap-3 p-2.5 bg-white/60 dark:bg-gray-800/40 rounded-lg">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            xpData.daily_goal_complete 
              ? 'bg-green-100 dark:bg-green-900/40' 
              : 'bg-amber-100 dark:bg-amber-800/40'
          }`}>
            <Target className={`w-4 h-4 ${
              xpData.daily_goal_complete 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-amber-600 dark:text-amber-400'
            }`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-brown-700 dark:text-gray-300">
                Daily Goal
              </span>
              {xpData.daily_goal_complete ? (
                <span className="text-xs font-bold text-green-600 dark:text-green-400">
                  ✓ Complete!
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {xpData.today_minutes} / {xpData.daily_goal_minutes} min
                </span>
              )}
            </div>
            <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  xpData.daily_goal_complete 
                    ? 'bg-green-500' 
                    : 'bg-gradient-to-r from-amber-400 to-yellow-500'
                }`}
                style={{ width: `${Math.min(100, (xpData.today_minutes / xpData.daily_goal_minutes) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for header/navbar
export function XPBadge() {
  const { data: xpData, isLoading } = useXP();

  if (isLoading || !xpData) {
    return null;
  }

  const levelInfo = getLevelInfo(xpData.level);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/40 rounded-full">
      <span className="text-sm">{levelInfo.emoji}</span>
      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
        {xpData.level}
      </span>
      <Zap className="w-3 h-3 text-amber-500" />
      <span className="text-xs text-amber-600 dark:text-amber-400">
        {xpData.total_xp >= 1000 
          ? `${(xpData.total_xp / 1000).toFixed(1)}k` 
          : xpData.total_xp}
      </span>
    </div>
  );
}

// Toast notification for XP earned
interface XPToastProps {
  xpEarned: number;
  levelUp?: boolean;
  newLevel?: number;
  onClose: () => void;
}

export function XPToast({ xpEarned, levelUp, newLevel, onClose }: XPToastProps) {
  return (
    <div 
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in"
      onClick={onClose}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform">
        <Zap className="w-5 h-5 animate-pulse" />
        <span className="font-bold">+{xpEarned} XP</span>
        {levelUp && newLevel && (
          <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm font-medium">
            Level Up! → {newLevel} 🎉
          </span>
        )}
      </div>
    </div>
  );
}

