import { Link } from 'react-router-dom';
import { Sparkles, MessageSquare, Gamepad2, GraduationCap } from 'lucide-react';
import { useSubscription, UsageType } from '../hooks/useSubscription';

interface UsageBannerProps {
  feature: UsageType;
  className?: string;
  compact?: boolean;
}

const featureConfig = {
  chat: {
    icon: MessageSquare,
    name: 'chat messages',
    shortName: 'chats',
  },
  game: {
    icon: Gamepad2,
    name: 'games',
    shortName: 'games',
  },
  quiz: {
    icon: GraduationCap,
    name: 'quizzes',
    shortName: 'quizzes',
  },
};

/**
 * Banner showing the user's remaining daily usage for a feature.
 * 
 * Displays remaining uses for free users, or "Unlimited" for premium users.
 * Hidden when user is not signed in.
 */
export function UsageBanner({ feature, className = '', compact = false }: UsageBannerProps) {
  const { isSignedIn, isPremium, getRemaining, getLimit, isLoading } = useSubscription();
  
  // Don't show if not signed in or still loading
  if (!isSignedIn || isLoading) {
    return null;
  }

  const config = featureConfig[feature];
  const Icon = config.icon;
  const remaining = getRemaining(feature);
  const limit = getLimit(feature);
  
  // Premium users - show premium badge
  if (isPremium) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-full text-amber-700 dark:text-amber-400 text-xs font-medium ${className}`}>
        <Sparkles className="w-3.5 h-3.5" />
        <span>Premium · Unlimited {config.shortName}</span>
      </div>
    );
  }

  // Free user - show remaining uses
  const isLow = remaining <= 1;
  const isEmpty = remaining === 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-xs ${
        isEmpty 
          ? 'text-red-600 dark:text-red-400' 
          : isLow 
            ? 'text-amber-600 dark:text-amber-400' 
            : 'text-brown-500 dark:text-gray-400'
      } ${className}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{remaining}/{limit}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
      isEmpty 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
        : isLow 
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' 
          : 'bg-cream-50 dark:bg-gray-800 border-cream-200 dark:border-gray-700'
    } ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${
          isEmpty 
            ? 'text-red-500 dark:text-red-400' 
            : isLow 
              ? 'text-amber-500 dark:text-amber-400' 
              : 'text-brown-500 dark:text-gray-400'
        }`} />
        <span className={`text-sm ${
          isEmpty 
            ? 'text-red-700 dark:text-red-300' 
            : isLow 
              ? 'text-amber-700 dark:text-amber-300' 
              : 'text-brown-700 dark:text-gray-300'
        }`}>
          {isEmpty 
            ? `No ${config.name} left today` 
            : `${remaining} ${config.name} left today`
          }
        </span>
      </div>
      
      {(isLow || isEmpty) && (
        <Link 
          to="/pricing" 
          className="text-xs font-medium text-coral-600 dark:text-ocean-400 hover:underline"
        >
          Upgrade
        </Link>
      )}
    </div>
  );
}

export default UsageBanner;

