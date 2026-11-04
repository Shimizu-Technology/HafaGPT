import type { ReactNode } from 'react';
import { ArrowLeft, Moon, Sun, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { routeHasAppBar } from '../lib/routes';

interface LearnerPageShellProps {
  children: ReactNode;
  className?: string;
}

export function LearnerPageShell({ children, className = '' }: LearnerPageShellProps) {
  return (
    <div className={`min-h-screen bg-cream-50 pb-24 text-brown-950 dark:bg-brown-950 dark:text-cream-100 sm:pb-8 ${className}`}>
      {children}
    </div>
  );
}

interface LearnerPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Kept so existing pages still compile; the header no longer draws an icon tile beside the title. */
  icon?: LucideIcon;
  /** When the page renders its own `<h1>`, this label becomes a plain line of context. */
  titleAs?: 'h1' | 'p';
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  below?: ReactNode;
  /** @deprecated No icon tile is drawn any more. */
  iconClassName?: string;
  maxWidthClassName?: string;
  showThemeToggle?: boolean;
  sticky?: boolean;
}

export function LearnerPageHeader({
  title,
  subtitle,
  titleAs = 'h1',
  backTo = '/',
  backLabel = 'Back to Today',
  onBack,
  trailing,
  below,
  maxWidthClassName = 'max-w-5xl',
  showThemeToggle = true,
  sticky = true,
}: LearnerPageHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  // The shared app bar carries the theme toggle from the sm breakpoint up.
  const themeToggleClassName = routeHasAppBar(pathname) ? 'sm:hidden' : '';
  const Title = titleAs;

  return (
    <header className={`${sticky ? 'sticky top-0 z-30' : 'relative z-20'} border-b border-cream-200/80 bg-cream-50/95 backdrop-blur-xl dark:border-brown-700 dark:bg-brown-950/95`}>
      <div className={`safe-area-top mx-auto px-4 py-3 ${maxWidthClassName}`}>
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label={backLabel} className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-brown-100 dark:hover:bg-brown-900">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <Link to={backTo} replace aria-label={backLabel} className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-brown-100 dark:hover:bg-brown-900">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}

          <div className="col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <Title className={`break-words font-bold leading-tight text-brown-950 dark:text-cream-100 ${titleAs === 'h1' ? 'text-xl sm:text-2xl' : 'text-base'}`}>{title}</Title>
            {subtitle && <p className="break-words text-xs text-brown-500 dark:text-brown-300 sm:text-sm">{subtitle}</p>}
          </div>

          {trailing && <div className="col-span-3 row-start-3 flex min-w-0 flex-wrap justify-start gap-2">{trailing}</div>}
          {showThemeToggle && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`col-start-3 row-start-1 flex h-[44px] w-[44px] items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-brown-100 dark:hover:bg-brown-900 ${themeToggleClassName}`}
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
