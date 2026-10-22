import type { ReactNode } from 'react';
import { ArrowLeft, Moon, Sun, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

interface LearnerPageShellProps {
  children: ReactNode;
  className?: string;
}

export function LearnerPageShell({ children, className = '' }: LearnerPageShellProps) {
  return (
    <div className={`min-h-screen bg-cream-50 pb-24 text-brown-950 dark:bg-slate-900 dark:text-white sm:pb-8 ${className}`}>
      {children}
    </div>
  );
}

interface LearnerPageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  below?: ReactNode;
  iconClassName?: string;
  maxWidthClassName?: string;
  showThemeToggle?: boolean;
  sticky?: boolean;
}

export function LearnerPageHeader({
  title,
  subtitle,
  icon: Icon,
  backTo = '/',
  backLabel = 'Back to Today',
  onBack,
  trailing,
  below,
  iconClassName = 'bg-coral-100 text-coral-700 dark:bg-teal-900/50 dark:text-teal-300',
  maxWidthClassName = 'max-w-5xl',
  showThemeToggle = true,
  sticky = true,
}: LearnerPageHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={`${sticky ? 'sticky top-0 z-30' : 'relative z-20'} border-b border-cream-200/80 bg-cream-50/95 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95`}>
      <div className={`safe-area-top mx-auto px-4 py-3 ${maxWidthClassName}`}>
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label={backLabel} className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <Link to={backTo} replace aria-label={backLabel} className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}

          <span aria-hidden="true" className={`hidden ${iconClassName}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <h1 className="break-words text-lg font-bold leading-tight text-brown-950 dark:text-white">{title}</h1>
            {subtitle && <p className="break-words text-xs text-brown-500 dark:text-gray-400">{subtitle}</p>}
          </div>

          {trailing && <div className="col-span-3 row-start-3 flex min-w-0 flex-wrap justify-end gap-2">{trailing}</div>}
          {showThemeToggle && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="col-start-3 row-start-1 flex h-[44px] w-[44px] items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
            </button>
          )}
        </div>
        {below && <div className="mt-2">{below}</div>}
      </div>
    </header>
  );
}
