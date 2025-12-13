import { useMemo } from 'react';

interface SnowflakeProps {
  style: React.CSSProperties;
  emoji: string;
}

function Snowflake({ style, emoji }: SnowflakeProps) {
  return (
    <div 
      className="snowflake pointer-events-none select-none"
      style={style}
    >
      {emoji}
    </div>
  );
}

interface SnowfallProps {
  /** Number of snowflakes to render */
  count?: number;
  /** Whether to show snowfall */
  active?: boolean;
}

/**
 * Snowfall effect component for Christmas theme.
 * 
 * Renders animated snowflakes falling across the screen.
 * Uses CSS animations for performance.
 */
export function Snowfall({ count = 30, active = true }: SnowfallProps) {
  // Generate snowflake configs once
  const snowflakes = useMemo(() => {
    if (!active) return [];
    
    const emojis = ['❄', '❅', '❆', '✻', '✼'];
    const flakes = [];
    
    for (let i = 0; i < count; i++) {
      // Random position, size, and animation timing
      const left = Math.random() * 100;
      const animationDuration = 10 + Math.random() * 15; // 10-25s
      const animationDelay = Math.random() * -20; // Staggered start
      const fontSize = 0.6 + Math.random() * 0.8; // 0.6-1.4rem
      const opacity = 0.3 + Math.random() * 0.4; // 0.3-0.7
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      
      flakes.push({
        id: i,
        emoji,
        style: {
          left: `${left}%`,
          animationDuration: `${animationDuration}s`,
          animationDelay: `${animationDelay}s`,
          fontSize: `${fontSize}rem`,
          opacity,
        } as React.CSSProperties,
      });
    }
    
    return flakes;
  }, [count, active]);
  
  if (!active) return null;
  
  return (
    <div className="snowfall-container" aria-hidden="true">
      {snowflakes.map((flake) => (
        <Snowflake key={flake.id} style={flake.style} emoji={flake.emoji} />
      ))}
    </div>
  );
}

export default Snowfall;
