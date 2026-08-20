import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RotateCcw, Star, Trophy, type LucideIcon } from 'lucide-react';
import { LearnerPageHeader, LearnerPageShell } from '../LearnerPage';
import { TTSDisclaimer } from '../TTSDisclaimer';

interface GamePageProps {
  children: ReactNode;
}

export function GamePage({ children }: GamePageProps) {
  return <LearnerPageShell>{children}</LearnerPageShell>;
}

interface GamePageHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  hasSpeech?: boolean;
}

export function GamePageHeader({ title, subtitle, icon, hasSpeech = false }: GamePageHeaderProps) {
  const navigate = useNavigate();

  return (
    <LearnerPageHeader
      title={title}
      subtitle={subtitle}
      icon={icon}
      backTo="/games"
      backLabel="Back to games"
      onBack={() => navigate('/games')}
      maxWidthClassName="max-w-2xl"
      trailing={hasSpeech ? <TTSDisclaimer variant="tooltip" /> : undefined}
    />
  );
}

interface GameProgressProps {
  current: number;
  total: number;
  score: number;
  streak?: number;
}

export function GameProgress({ current, total, score, streak = 0 }: GameProgressProps) {
  const progress = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <section className="mb-6" aria-label={`Round ${current} of ${total}. Score ${score}.`}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-brown-700 dark:text-gray-200">Round {current} of {total}</span>
          {streak >= 2 && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
              {streak} in a row
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 font-bold text-brown-950 dark:text-white">
          <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" /> {score}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700">
        <div className="h-full rounded-full bg-coral-600 transition-[width] dark:bg-teal-500" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}

interface GameResultProps {
  score: number;
  stars: number;
  onReplay: () => void;
  heading?: string;
}

export function GameResult({ score, stars, onReplay, heading = 'Great work!' }: GameResultProps) {
  return (
    <section className="mx-auto max-w-md py-4 text-center" aria-labelledby="game-result-title">
      <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        <Trophy className="h-10 w-10" aria-hidden="true" />
      </span>
      <p className="mb-1 text-sm font-semibold text-coral-700 dark:text-teal-300">Game complete</p>
      <h2 id="game-result-title" className="text-2xl font-bold text-brown-950 dark:text-white">{heading}</h2>

      <div className="my-5 flex justify-center gap-1" aria-label={`${stars} out of 3 stars`}>
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            className={`h-9 w-9 ${star <= stars ? 'fill-amber-400 text-amber-400' : 'text-cream-300 dark:text-slate-600'}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-4xl font-bold text-coral-700 dark:text-teal-300">{score}</p>
        <p className="mt-1 text-sm text-brown-500 dark:text-gray-400">points</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onReplay}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 font-semibold text-brown-700 hover:bg-cream-100 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" /> Play again
        </button>
        <Link
          to="/games"
          className="flex min-h-12 items-center justify-center rounded-xl bg-coral-600 px-4 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          More games
        </Link>
      </div>
    </section>
  );
}
