import { ReactNode } from 'react';
import { usePromoStatus } from '../hooks/useSubscription';
import { Snowfall } from './Snowfall';

interface ChristmasThemeWrapperProps {
  children: ReactNode;
}

/**
 * Global wrapper that applies the Christmas theme (snowfall) to all pages.
 * 
 * This component checks the site theme from the API and conditionally
 * renders the snowfall effect when Christmas theme is active.
 */
export function ChristmasThemeWrapper({ children }: ChristmasThemeWrapperProps) {
  const { data: promo } = usePromoStatus();
  const isChristmasTheme = promo?.theme === 'christmas';
  
  return (
    <>
      {/* Global Snowfall Effect - renders above all content */}
      <Snowfall active={isChristmasTheme} count={25} />
      
      {/* Render children (the actual app) */}
      {children}
    </>
  );
}

export default ChristmasThemeWrapper;
