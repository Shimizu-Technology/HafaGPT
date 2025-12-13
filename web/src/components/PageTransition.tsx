import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that adds a smooth enter animation to pages.
 * Wrap your page content with this for consistent page transitions.
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <div className={`animate-page-enter ${className}`}>
      {children}
    </div>
  );
}
