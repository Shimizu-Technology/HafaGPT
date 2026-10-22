interface LearnerProgressProps { value: number; label: string; className?: string }

/** Immediate progress: no layout animation or delay before the next action. */
export function LearnerProgress({ value, label, className = '' }: LearnerProgressProps) {
  const progress = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
      className={`h-2 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700 ${className}`}>
      <div className="h-full origin-left rounded-full bg-action" style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}
