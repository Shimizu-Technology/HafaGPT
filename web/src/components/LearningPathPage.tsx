import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Map as MapIcon, Trophy } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { LearningPathMap } from './LearningPathMap';
import { LearningProgressStats } from './LearningProgressStats';

export function LearningPathPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleBack = () => {
    // Go back to where user came from, or fallback to home
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full hover:bg-cream-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
          </button>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              <h1 className="text-lg font-bold text-brown-800 dark:text-white">
                Learning Path
              </h1>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full hover:bg-cream-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-brown-600" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {/* Hero Section - Compact on mobile */}
        <div className="bg-gradient-to-r from-coral-400 to-teal-500 dark:from-ocean-500 dark:to-teal-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold">Beginner Path</h2>
                <p className="text-white/80 text-xs sm:text-sm mt-1 hidden sm:block max-w-md">
                  Master the fundamentals of Chamorro through 7 carefully crafted topics.
                </p>
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm mt-2 sm:mt-4">
                  <span>⏱ ~35 min</span>
                  <span>📚 7 topics</span>
                </div>
              </div>
              <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white/30 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Mobile: Stats first, then path map */}
        <div className="md:hidden space-y-4 mb-4">
          <LearningProgressStats />
        </div>

        {/* Desktop: Two-column layout */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {/* Learning Path Map - takes 2/3 on desktop, full width on mobile */}
          <div className="md:col-span-2">
            <LearningPathMap />
          </div>

          {/* Desktop only: Progress Stats sidebar */}
          <div className="hidden md:block md:col-span-1">
            <LearningProgressStats />
            
            {/* Tips Section - Desktop only */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-cream-200 dark:border-gray-700">
              <h3 className="font-semibold text-brown-800 dark:text-white mb-3">
                💡 Learning Tips
              </h3>
              <ul className="space-y-2 text-sm text-brown-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
                  <span>Complete flashcards before taking the quiz</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
                  <span>Score 90%+ on quizzes to earn 3 stars</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
                  <span>Review completed topics to improve your score</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
                  <span>Practice daily to maintain your streak!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

