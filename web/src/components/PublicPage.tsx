import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

interface PublicPageProps {
  title: string;
  subtitle: string;
  /** Kept so existing pages still compile; the header no longer draws an icon tile. */
  icon?: LucideIcon;
  /** Use `p` when the page body supplies its own `<h1>`, so the route has one. */
  titleAs?: 'h1' | 'p';
  children: ReactNode;
  maxWidthClassName?: string;
  trailing?: ReactNode;
  stickyHeader?: boolean;
  showFooter?: boolean;
}

export function PublicPageFooter({ maxWidthClassName = 'max-w-4xl' }: { maxWidthClassName?: string }) {
  return (
    <footer className="border-t border-cream-200 bg-white/60 dark:border-brown-700 dark:bg-brown-950/60">
      <div className={`mx-auto flex flex-col gap-3 px-4 py-6 text-base text-brown-600 dark:text-brown-100 sm:flex-row sm:items-center sm:justify-between ${maxWidthClassName}`}>
        <p>HåfaGPT · Chamorro learning for families and independent learners</p>
        <nav aria-label="Information" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link to="/about" className="inline-flex min-h-11 items-center font-medium [@media(hover:hover)_and_(pointer:fine)]:hover:text-coral-700 [@media(hover:hover)_and_(pointer:fine)]:hover:underline">About</Link>
          <Link to="/support" className="inline-flex min-h-11 items-center font-medium [@media(hover:hover)_and_(pointer:fine)]:hover:text-coral-700 [@media(hover:hover)_and_(pointer:fine)]:hover:underline">Support</Link>
          <Link to="/privacy" className="inline-flex min-h-11 items-center font-medium [@media(hover:hover)_and_(pointer:fine)]:hover:text-coral-700 [@media(hover:hover)_and_(pointer:fine)]:hover:underline">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}

export function PublicPage({
  title,
  subtitle,
  titleAs,
  children,
  maxWidthClassName = 'max-w-4xl',
  trailing,
  stickyHeader = true,
  showFooter = true,
}: PublicPageProps) {

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={title}
        subtitle={subtitle}
        titleAs={titleAs}
        backTo="/"
        backLabel="Back home"
        maxWidthClassName={maxWidthClassName}
        trailing={trailing}
        sticky={stickyHeader}
      />
      <main id="main-content" className={`mx-auto px-4 py-6 sm:py-9 ${maxWidthClassName}`}>
        {children}
      </main>
      {showFooter && <PublicPageFooter maxWidthClassName={maxWidthClassName} />}
    </LearnerPageShell>
  );
}
