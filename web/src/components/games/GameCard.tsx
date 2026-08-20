import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface GameCardProps {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  difficulty: string;
  comingSoon?: boolean;
}

export function GameCard({ to, title, description, icon, difficulty, comingSoon }: GameCardProps) {
  const difficultyColors: Record<string, string> = {
    'No reading': 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    'Some reading': 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    'Fast paced': 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    'Challenge': 'bg-coral-50 text-coral-700 dark:bg-coral-900/50 dark:text-coral-200',
    'All ages': 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    'All levels': 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  };

  if (comingSoon) {
    return (
      <div className="relative cursor-not-allowed rounded-2xl border border-cream-200 bg-white p-5 opacity-60 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        {/* Coming Soon Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-cream-200 dark:bg-slate-700 text-brown-600 dark:text-gray-300 text-xs font-medium rounded-full">
          Coming Soon
        </div>
        
        {/* Icon */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100 text-coral-700 dark:bg-slate-700 dark:text-teal-300">
          {icon}
        </div>
        
        {/* Content */}
        <h3 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-brown-600 dark:text-gray-400 mb-4">{description}</p>
        
        {/* Difficulty Badge */}
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${difficultyColors[difficulty] || difficultyColors['All ages']}`}>
          {difficulty}
        </span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group flex min-h-56 flex-col rounded-2xl border border-cream-200 bg-white p-5 transition-colors hover:border-coral-300 hover:bg-coral-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-600 dark:hover:bg-slate-700 sm:p-6"
    >
      {/* Icon */}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-teal-900/50 dark:text-teal-300">
        {icon}
      </div>
      
      {/* Content */}
      <h3 className="mb-2 text-lg font-bold text-brown-800 transition-colors group-hover:text-coral-600 dark:text-white dark:group-hover:text-teal-300 sm:text-xl">
        {title}
      </h3>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-brown-600 dark:text-gray-400">{description}</p>
      
      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${difficultyColors[difficulty] || difficultyColors['All ages']}`}>
          {difficulty}
        </span>
        <ChevronRight className="h-5 w-5 text-coral-600 dark:text-teal-300" aria-hidden="true" />
      </div>
    </Link>
  );
}
