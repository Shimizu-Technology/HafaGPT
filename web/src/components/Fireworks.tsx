import { useMemo, useEffect, useState, useCallback } from 'react';

interface SparkleProps {
  style: React.CSSProperties;
  emoji: string;
}

function Sparkle({ style, emoji }: SparkleProps) {
  return (
    <div 
      className="firework pointer-events-none select-none"
      style={style}
    >
      {emoji}
    </div>
  );
}

interface BurstParticle {
  id: number;
  angle: number;
  distance: number;
  delay: number;
}

interface FireworkBurst {
  id: number;
  x: number;
  y: number;
  particles: BurstParticle[];
}

function Burst({ burst, onComplete }: { burst: FireworkBurst; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="firework-burst"
      style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
    >
      {burst.particles.map((p) => (
        <div
          key={p.id}
          className="firework-particle"
          style={{
            '--angle': `${p.angle}rad`,
            '--distance': `${p.distance}px`,
            '--delay': `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

interface FireworksProps {
  /** Whether to show fireworks */
  active?: boolean;
  /** Number of sparkles to render */
  count?: number;
}

/**
 * Subtle sparkle effect component for New Year's theme.
 * 
 * Renders gentle floating sparkles with occasional small firework bursts.
 * Uses CSS animations for performance.
 */
export function Fireworks({ active = true, count = 20 }: FireworksProps) {
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);
  const [nextBurstId, setNextBurstId] = useState(0);

  // Pre-generate floating sparkles (must be before any conditional returns!)
  const sparkles = useMemo(() => {
    if (!active) return [];
    
    // Sparkle characters that look like firework bursts
    const items = ['✦', '✧', '✴', '✵', '❋', '❊', '✺', '✹'];
    const result = [];
    
    for (let i = 0; i < count; i++) {
      const twinkleDuration = 1.5 + Math.random() * 2; // 1.5-3.5s for twinkle
      result.push({
        id: i,
        emoji: items[Math.floor(Math.random() * items.length)],
        left: Math.random() * 100,
        animationDuration: 15 + Math.random() * 20, // Drift: 15-35s
        animationDelay: Math.random() * -30, // Staggered start
        twinkleDuration, // For the twinkle effect
        twinkleDelay: Math.random() * twinkleDuration, // Random twinkle phase
        fontSize: 0.7 + Math.random() * 0.5, // 0.7-1.2rem
      });
    }
    return result;
  }, [active, count]);

  // Create occasional firework bursts
  useEffect(() => {
    if (!active) return;

    const createBurst = () => {
      const x = 15 + Math.random() * 70; // 15-85% from left
      const y = 15 + Math.random() * 40; // 15-55% from top
      const particleCount = 6 + Math.floor(Math.random() * 4); // 6-9 particles
      
      const particles: BurstParticle[] = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          id: i,
          angle: (i / particleCount) * Math.PI * 2,
          distance: 20 + Math.random() * 15, // 20-35px
          delay: Math.random() * 0.05,
        });
      }

      setBursts(prev => [...prev, { id: nextBurstId, x, y, particles }]);
      setNextBurstId(prev => prev + 1);
    };

    // Create bursts every 5-10 seconds
    const interval = setInterval(() => {
      createBurst();
    }, 5000 + Math.random() * 5000);

    // Initial burst after 2 seconds
    const initialTimeout = setTimeout(createBurst, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [active, nextBurstId]);

  const removeBurst = useCallback((id: number) => {
    setBursts(prev => prev.filter(b => b.id !== id));
  }, []);

  // Early return AFTER all hooks
  if (!active) return null;

  return (
    <div className="fireworks-container" aria-hidden="true">
      {/* Animated sparkles with twinkle effect */}
      {sparkles.map((item) => (
        <Sparkle
          key={item.id}
          emoji={item.emoji}
          style={{
            left: `${item.left}%`,
            animationDuration: `${item.animationDuration}s, ${item.twinkleDuration}s`,
            animationDelay: `${item.animationDelay}s, ${item.twinkleDelay}s`,
            fontSize: `${item.fontSize}rem`,
          }}
        />
      ))}
      
      {/* Occasional subtle firework bursts */}
      {bursts.map((burst) => (
        <Burst
          key={burst.id}
          burst={burst}
          onComplete={() => removeBurst(burst.id)}
        />
      ))}
    </div>
  );
}

export default Fireworks;

