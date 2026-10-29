const PETAL = 'M0 0 C -8.5 -2.5 -12.5 -10.5 -8.5 -15.5 C -6.5 -18 -3.5 -17 -2 -18.6 C -0.6 -20 1.8 -19.6 3.2 -18.2 C 5 -16.6 8.4 -17.4 9.6 -14.2 C 11.6 -9 7.6 -2.6 0 0 Z';

interface BrandMarkProps {
  className?: string;
  /** Seasonal themes swap the hibiscus for their festive emoji. */
  seasonal?: 'christmas' | 'newyear' | null;
}

/**
 * HåfaGPT's hibiscus: five overlapping petals and the long stamen column
 * that makes a hibiscus read as a hibiscus. Petal gaps take the page
 * surface colour so the mark sits cleanly on light and dark backgrounds.
 */
export function BrandMark({ className = 'h-10 w-10', seasonal = null }: BrandMarkProps) {
  if (seasonal) {
    return (
      <span className={`inline-flex items-center justify-center text-2xl leading-none ${className}`} aria-hidden="true">
        {seasonal === 'christmas' ? '🎄' : '🎆'}
      </span>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className={`flex-none ${className}`} aria-hidden="true" focusable="false">
      <g transform="translate(23 25)">
        <g className="fill-coral-700 dark:fill-coral-400" stroke="rgb(var(--surface))" strokeWidth="1.4" strokeLinejoin="round">
          {[0, 72, 144, 216, 288].map(angle => <path key={angle} d={PETAL} transform={`rotate(${angle})`} />)}
        </g>
        <circle r="3.6" className="fill-coral-900 dark:fill-coral-100" />
        <path d="M0 0 L 12.5 -15.5" stroke="rgb(var(--surface))" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M0 0 L 12.5 -15.5" stroke="#F5C443" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="13.8" cy="-17.4" r="2.3" fill="#F5C443" stroke="rgb(var(--surface))" strokeWidth="0.8" />
      </g>
    </svg>
  );
}
