import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

interface PublicPageProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
  maxWidthClassName?: string;
  trailing?: ReactNode;
  stickyHeader?: boolean;
  showFooter?: boolean;
}

export function PublicPageFooter({ maxWidthClassName = 'max-w-4xl' }: { maxWidthClassName?: string }) {
  return (
    <footer className="border-t border-cream-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/60">
      <div className={`mx-auto flex flex-col gap-3 px-4 py-6 text-sm text-brown-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between ${maxWidthClassName}`}>
        <p>HåfaGPT · Chamorro learning for families and independent learners</p>
        <nav aria-label="Information" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link to="/about" className="font-medium hover:text-coral-700 hover:underline dark:hover:text-teal-300">About</Link>
          <Link to="/support" className="font-medium hover:text-coral-700 hover:underline dark:hover:text-teal-300">Support</Link>
          <Link to="/privacy" className="font-medium hover:text-coral-700 hover:underline dark:hover:text-teal-300">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}

export function PublicPage({
  title,
  subtitle,
  icon,
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
        icon={icon}
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
