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
    'Easy': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Medium': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Hard': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'All Ages': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };

  if (comingSoon) {
    return (
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg border border-cream-200 dark:border-slate-700 opacity-60 cursor-not-allowed">
        {/* Coming Soon Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-cream-200 dark:bg-slate-700 text-brown-600 dark:text-gray-300 text-xs font-medium rounded-full">
          Coming Soon
        </div>
        
        {/* Icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cream-100 to-cream-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mb-4 text-coral-500 dark:text-ocean-400">
          {icon}
        </div>
        
        {/* Content */}
        <h3 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-brown-600 dark:text-gray-400 mb-4">{description}</p>
        
        {/* Difficulty Badge */}
        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${difficultyColors[difficulty] || difficultyColors['Easy']}`}>
          {difficulty}
        </span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg border border-cream-200 dark:border-slate-700 hover:shadow-xl hover:border-coral-300 dark:hover:border-ocean-500 transition-all duration-300 block"
    >
      {/* Icon */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-ocean-900/50 dark:to-ocean-800/50 flex items-center justify-center mb-4 text-coral-600 dark:text-ocean-400 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      
      {/* Content */}
      <h3 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white mb-2 group-hover:text-coral-600 dark:group-hover:text-ocean-400 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-brown-600 dark:text-gray-400 mb-4">{description}</p>
      
      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${difficultyColors[difficulty] || difficultyColors['Easy']}`}>
          {difficulty}
        </span>
        <ChevronRight className="w-5 h-5 text-coral-500 dark:text-ocean-400 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}


