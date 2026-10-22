import { useXP, getLevelInfo } from '../hooks/useXP';
import { Zap, ChevronRight, X } from 'lucide-react';
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
      <div className={`animate-pulse ${compact ? 'h-8' : 'h-24'} bg-gray-100 dark:bg-slate-700 rounded-lg`} />
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
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full origin-left"
            style={{ transform: `scaleX(${Math.max(0, Math.min(100, xpData.xp_progress)) / 100})` }}
          />
        </div>
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
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
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
              {xpData.total_xp.toLocaleString()} XP total
            </p>
          </div>
        </div>
        
        <Link 
          to="/settings" 
          className="p-2 text-amber-500 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded-lg transition-colors"
          title="XP Settings"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-amber-800 dark:text-amber-300 font-medium">
            Progress to Level {xpData.level + 1}
          </span>
          <span className="text-amber-700 dark:text-amber-300 font-bold">
            {xpInLevel} / {xpNeeded} XP
          </span>
        </div>
        <div className="h-2.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 rounded-full origin-left relative overflow-hidden"
            style={{ transform: `scaleX(${Math.max(0, Math.min(100, xpData.xp_progress)) / 100})` }}
          />
        </div>
      </div>

      <Link to="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-amber-800 underline-offset-4 hover:underline dark:text-amber-200">Continue your Today session</Link>
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
      <span className="text-xs text-amber-800 dark:text-amber-300">
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
      className="learner-toast-offset fixed left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 z-[80]"
    >
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-amber-950 shadow-lg dark:bg-amber-950 dark:text-amber-100">
        <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center gap-2">
          <Zap className="w-5 h-5" aria-hidden="true" />
          <span className="font-bold">+{xpEarned} XP</span>
          {levelUp && newLevel && (
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm font-medium">
              Level Up! → {newLevel} 🎉
            </span>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Dismiss XP notification" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

