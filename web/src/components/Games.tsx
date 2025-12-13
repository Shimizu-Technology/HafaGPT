import { Link } from 'react-router-dom';
import { ArrowLeft, Gamepad2, Puzzle, Sword, Grid3X3 } from 'lucide-react';
import { GameCard } from './games/GameCard';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export function Games() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="p-2 -ml-2 rounded-xl hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Go back home"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600 flex items-center justify-center shadow-lg">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">
                  Chamorro Games
                </h1>
                <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400 hidden sm:block">
                  Learn while playing
                </p>
              </div>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-brown-600" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 animate-page-enter">
        {/* Welcome Section */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-ocean-900/50 dark:to-ocean-800/50 mb-4 shadow-lg">
            <span className="text-4xl sm:text-5xl">🎮</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-2">
            Play & Learn Chamorro
          </h2>
          <p className="text-brown-600 dark:text-gray-400 max-w-md mx-auto">
            Fun games for all ages to practice vocabulary and boost your Chamorro skills!
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {/* Foundation Games */}
          <GameCard
            to="/games/memory"
            title="Memory Match"
            description="Match Chamorro words with their English translations. Great for vocabulary practice!"
            icon={<Puzzle className="w-7 h-7 sm:w-8 sm:h-8" />}
            difficulty="All Ages"
          />
          
          <GameCard
            to="/games/scramble"
            title="Word Scramble"
            description="Unscramble the letters to form Chamorro words. Practice your spelling!"
            icon={<span className="text-2xl sm:text-3xl">🔤</span>}
            difficulty="Medium"
          />
          
          {/* Action Games */}
          <GameCard
            to="/games/falling"
            title="Falling Words"
            description="Words fall from the sky! Tap the correct translation before they hit bottom. Gets faster!"
            icon={<span className="text-2xl sm:text-3xl">⬇️</span>}
            difficulty="Easy → Hard"
          />
          
          <GameCard
            to="/games/catch"
            title="Word Catch"
            description="Catch correct word pairs as they fly by! Avoid the wrong ones for combo points."
            icon={<Sword className="w-7 h-7 sm:w-8 sm:h-8" />}
            difficulty="Medium"
          />
          
          <GameCard
            to="/games/wordle"
            title="Chamorro Wordle"
            description="Guess the Chamorro word in 6 tries! Daily challenge or practice mode."
            icon={<Grid3X3 className="w-7 h-7 sm:w-8 sm:h-8" />}
            difficulty="Hard"
          />
          
          <GameCard
            to="/games/hangman"
            title="Hangman"
            description="Classic word guessing! See the meaning, guess the Chamorro word letter by letter."
            icon={<span className="text-2xl sm:text-3xl">🎯</span>}
            difficulty="Medium"
          />
          
          <GameCard
            to="/games/trivia"
            title="Cultural Trivia"
            description="Test your knowledge of Guam history, Chamorro culture, language, and traditions!"
            icon={<span className="text-2xl sm:text-3xl">🏝️</span>}
            difficulty="All Levels"
          />
        </div>

        {/* Tips Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg border border-cream-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-brown-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span> Tips for Learning
          </h3>
          <ul className="space-y-2 text-sm text-brown-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
              <span>Start with <strong>Memory Match</strong> to build vocabulary recognition</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
              <span>Try <strong>Falling Words</strong> for quick reflex training</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
              <span>Play daily to reinforce what you've learned</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
              <span>Games work great on phones - play anywhere!</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}


