import { ReactNode } from 'react';
import { usePromoStatus } from '../hooks/useSubscription';
import { Snowfall } from './Snowfall';
import { Fireworks } from './Fireworks';

interface ChristmasThemeWrapperProps {
  children: ReactNode;
}

/**
 * Global wrapper that applies seasonal theme effects to all pages.
 * 
 * This component checks the site theme from the API and conditionally
 * renders the appropriate effect:
 * - Christmas: Snowfall (❄️)
 * - New Year: Fireworks (🎆)
 */
export function ChristmasThemeWrapper({ children }: ChristmasThemeWrapperProps) {
  const { data: promo } = usePromoStatus();
  const theme = promo?.theme;
  
  const isChristmasTheme = theme === 'christmas';
  const isNewYearTheme = theme === 'newyear';
  
  return (
    <>
      {/* Global Snowfall Effect - Christmas theme */}
      <Snowfall active={isChristmasTheme} count={25} />
      
      {/* Global Fireworks Effect - New Year theme */}
      <Fireworks active={isNewYearTheme} />
      
      {/* Render children (the actual app) */}
      {children}
    </>
  );
}

export default ChristmasThemeWrapper;
