import type { ReactNode } from 'react';
import { ArrowLeft, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
}

export function LearnerPageHeader({
  title,
  subtitle,
  icon: Icon,
  backTo = '/',
  backLabel = 'Go back',
  onBack,
  trailing,
  below,
  iconClassName = 'bg-coral-100 text-coral-700 dark:bg-teal-900/50 dark:text-teal-300',
  maxWidthClassName = 'max-w-5xl',
  showThemeToggle = true,
}: LearnerPageHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(backTo);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-cream-200/80 bg-cream-50/95 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
      <div className={`safe-area-top mx-auto px-4 py-3 ${maxWidthClassName}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            aria-label={backLabel}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${iconClassName}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight text-brown-950 dark:text-white">{title}</h1>
            {subtitle && <p className="hidden truncate text-xs text-brown-500 dark:text-gray-400 sm:block">{subtitle}</p>}
          </div>

          {trailing && <div className="flex-none">{trailing}</div>}
          {showThemeToggle && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800"
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
