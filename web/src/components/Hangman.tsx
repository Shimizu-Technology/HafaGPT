import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Sun, Moon, Play, Sparkles, BookOpen, HelpCircle, Lightbulb, Loader2 } from 'lucide-react';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';

interface GameSettings {
  category: string;
  mode: 'beginner' | 'challenge';
}

// Icon mapping for categories
const categoryIcons: Record<string, string> = {
  greetings: '👋',
  family: '👨‍👩‍👧‍👦',
  numbers: '🔢',
  colors: '🎨',
  food: '🍽️',
  animals: '🐕',
  body: '💪',
  nature: '🌺',
  places: '🏝️',
  time: '⏰',
  verbs: '🏃',
  phrases: '💬',
  'common-phrases': '📚',
};

// Display names for categories
const categoryDisplayNames: Record<string, string> = {
  greetings: 'Greetings',
  family: 'Family',
  numbers: 'Numbers',
  colors: 'Colors',
  food: 'Food',
  animals: 'Animals',
  body: 'Body',
  nature: 'Nature',
  places: 'Places',
  time: 'Time',
  verbs: 'Verbs',
  phrases: 'Phrases',
  'common-phrases': 'Common',
};

// Categories available in curated flashcards
const CURATED_CATEGORIES = Object.keys(DEFAULT_FLASHCARD_DECKS);

// Pre-calculate word counts for beginner mode (single words only, 3-12 chars)
const BEGINNER_WORD_COUNTS: Record<string, number> = Object.fromEntries(
  CURATED_CATEGORIES.map(cat => {
    const deck = DEFAULT_FLASHCARD_DECKS[cat];
    const count = deck?.cards.filter(card => 
      card.front.length >= 3 && 
      card.front.length <= 12 && 
      !card.front.includes(' ')
    ).length || 0;
    return [cat, count];
  })
);

// Minimum words needed to play
const MIN_WORDS_TO_PLAY = 3;

// Chamorro alphabet (including special characters)
const CHAMORRO_ALPHABET = 'ABCDEFGHIJKLMNÑOPRSTUVWY\'Å'.split('');

// Maximum wrong guesses before game over
const MAX_WRONG_GUESSES = 6;

export function Hangman() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const { data: categoriesData, isLoading: categoriesLoading } = useVocabularyCategories();
  const { canUse, tryUse, getCount, getLimit } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost'>('setup');
  const [isStarting, setIsStarting] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    // Default to 'numbers' which has 10 single-word entries
    category: 'numbers',
    mode: 'beginner',
  });
  
  // Playing state
  const [currentWord, setCurrentWord] = useState('');
  const [currentHint, setCurrentHint] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [wordPool, setWordPool] = useState<Array<{ word: string; hint: string }>>([]);

  // Only fetch dictionary flashcards in challenge mode
  const { data: flashcardsData, isLoading: flashcardsLoading } = useDictionaryFlashcards(
    settings.mode === 'challenge' ? settings.category : ''
  );

  // Get available words based on mode
  const availableWords = useMemo(() => {
    if (settings.mode === 'beginner') {
      const deck = DEFAULT_FLASHCARD_DECKS[settings.category];
      if (!deck) return [];
      return deck.cards
        .filter(card => card.front.length >= 3 && card.front.length <= 12)
        .filter(card => !card.front.includes(' ')) // Single words only
        .map(card => ({
          word: card.front.toUpperCase(),
          hint: card.back,
        }));
    } else {
      if (!flashcardsData?.cards) return [];
      return flashcardsData.cards
        .filter(card => card.front.length >= 3 && card.front.length <= 12)
        .filter(card => !card.front.includes(' ')) // Single words only
        .map(card => ({
          word: card.front.toUpperCase(),
          hint: card.back,
        }));
    }
  }, [settings.mode, settings.category, flashcardsData]);

  // Get challenge mode categories
  const challengeCategories = useMemo(() => {
    if (!categoriesData?.categories) return [];
    return categoriesData.categories.map(cat => ({
      id: cat.id,
      name: cat.title,
      count: cat.word_count,
    }));
  }, [categoriesData]);

  // Pick a new word
  const pickNewWord = useCallback(() => {
    const unusedWords = wordPool.filter(w => !usedWords.includes(w.word));
    if (unusedWords.length === 0) {
      // All words used, end game
      setGameState('won');
      return false;
    }
    const randomWord = unusedWords[Math.floor(Math.random() * unusedWords.length)];
    setCurrentWord(randomWord.word);
    setCurrentHint(randomWord.hint);
    setUsedWords(prev => [...prev, randomWord.word]);
    setGuessedLetters([]);
    setWrongGuesses(0);
    return true;
  }, [wordPool, usedWords]);

  // Handle letter guess
  const handleGuess = useCallback((letter: string) => {
    if (guessedLetters.includes(letter) || gameState !== 'playing') return;
    
    setGuessedLetters(prev => [...prev, letter]);
    
    if (!currentWord.includes(letter)) {
      const newWrongGuesses = wrongGuesses + 1;
      setWrongGuesses(newWrongGuesses);
      
      if (newWrongGuesses >= MAX_WRONG_GUESSES) {
        setGameState('lost');
      }
    }
  }, [guessedLetters, currentWord, wrongGuesses, gameState]);

  // Check if word is complete
  const isWordComplete = useMemo(() => {
    if (!currentWord) return false;
    return currentWord.split('').every(letter => 
      guessedLetters.includes(letter) || letter === ' ' || letter === '-'
    );
  }, [currentWord, guessedLetters]);

  // Handle word completion
  useEffect(() => {
    if (isWordComplete && gameState === 'playing') {
      // Calculate score for this word
      const remainingGuesses = MAX_WRONG_GUESSES - wrongGuesses;
      const wordScore = (remainingGuesses + 1) * 100 - (hintsUsed * 25);
      setTotalScore(prev => prev + Math.max(wordScore, 50));
      setWordsCompleted(prev => prev + 1);
      
      // Short delay then pick new word
      setTimeout(() => {
        if (!pickNewWord()) {
          // No more words
          setGameState('won');
        }
      }, 1500);
    }
  }, [isWordComplete, gameState, wrongGuesses, hintsUsed, pickNewWord]);

  // Use hint (reveal a letter)
  const useHint = useCallback(() => {
    const unguessedLetters = currentWord.split('').filter(
      letter => !guessedLetters.includes(letter) && letter !== ' ' && letter !== '-'
    );
    if (unguessedLetters.length > 0) {
      const letterToReveal = unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)];
      setGuessedLetters(prev => [...prev, letterToReveal]);
      setHintsUsed(prev => prev + 1);
    }
  }, [currentWord, guessedLetters]);

  // Start game
  const startGame = useCallback(async () => {
    // Check daily limit
    if (!canUse('game')) {
      setShowUpgradePrompt(true);
      return;
    }
    
    setIsStarting(true);
    
    try {
      // Use a game slot
      const success = await tryUse('game');
      if (!success) {
        setShowUpgradePrompt(true);
        setIsStarting(false);
        return;
      }
      
      setWordPool(availableWords);
      setUsedWords([]);
      setWordsCompleted(0);
      setTotalScore(0);
      setHintsUsed(0);
      setGuessedLetters([]);
      setWrongGuesses(0);
      hasSavedRef.current = false;
      
      // Pick first word
      const unusedWords = availableWords;
      if (unusedWords.length === 0) return;
      
      const randomWord = unusedWords[Math.floor(Math.random() * unusedWords.length)];
      setCurrentWord(randomWord.word);
      setCurrentHint(randomWord.hint);
      setUsedWords([randomWord.word]);
      
      setGameState('playing');
    } finally {
      setIsStarting(false);
    }
  }, [availableWords, canUse, tryUse]);

  // Save game result
  useEffect(() => {
    if ((gameState === 'won' || gameState === 'lost') && !hasSavedRef.current && isSignedIn) {
      hasSavedRef.current = true;
      
      // Calculate stars
      let stars = 1;
      if (wordsCompleted >= 5) stars = 3;
      else if (wordsCompleted >= 3) stars = 2;
      
      saveGameResultMutation.mutate({
        game_type: 'hangman',
        mode: settings.mode,
        category_id: settings.category,
        category_title: categoryDisplayNames[settings.category] || settings.category,
        difficulty: 'medium',
        score: totalScore,
        pairs: wordsCompleted,
        stars,
      });
    }
  }, [gameState, wordsCompleted, totalScore, settings, isSignedIn, saveGameResultMutation]);

  // Get display word (with blanks for unguessed letters)
  const displayWord = useMemo(() => {
    if (!currentWord) return [];
    return currentWord.split('').map(letter => {
      if (letter === ' ' || letter === '-') return letter;
      return guessedLetters.includes(letter) ? letter : '_';
    });
  }, [currentWord, guessedLetters]);

  // Calculate stars for display
  const getStars = () => {
    if (wordsCompleted >= 5) return 3;
    if (wordsCompleted >= 3) return 2;
    return 1;
  };

  // Render hangman figure
  const renderHangman = () => {
    const parts = [
      // Head
      <circle key="head" cx="150" cy="70" r="20" stroke="currentColor" strokeWidth="3" fill="none" 
        className={wrongGuesses >= 1 ? 'opacity-100' : 'opacity-0'} />,
      // Body
      <line key="body" x1="150" y1="90" x2="150" y2="150" stroke="currentColor" strokeWidth="3" 
        className={wrongGuesses >= 2 ? 'opacity-100' : 'opacity-0'} />,
      // Left arm
      <line key="leftArm" x1="150" y1="110" x2="120" y2="140" stroke="currentColor" strokeWidth="3" 
        className={wrongGuesses >= 3 ? 'opacity-100' : 'opacity-0'} />,
      // Right arm
      <line key="rightArm" x1="150" y1="110" x2="180" y2="140" stroke="currentColor" strokeWidth="3" 
        className={wrongGuesses >= 4 ? 'opacity-100' : 'opacity-0'} />,
      // Left leg
      <line key="leftLeg" x1="150" y1="150" x2="120" y2="190" stroke="currentColor" strokeWidth="3" 
        className={wrongGuesses >= 5 ? 'opacity-100' : 'opacity-0'} />,
      // Right leg
      <line key="rightLeg" x1="150" y1="150" x2="180" y2="190" stroke="currentColor" strokeWidth="3" 
        className={wrongGuesses >= 6 ? 'opacity-100' : 'opacity-0'} />,
    ];

    return (
      <svg viewBox="0 0 300 220" className="w-full max-w-[200px] h-auto text-brown-700 dark:text-gray-300">
        {/* Gallows */}
        <line x1="60" y1="200" x2="240" y2="200" stroke="currentColor" strokeWidth="4" />
        <line x1="100" y1="200" x2="100" y2="20" stroke="currentColor" strokeWidth="4" />
        <line x1="100" y1="20" x2="150" y2="20" stroke="currentColor" strokeWidth="4" />
        <line x1="150" y1="20" x2="150" y2="50" stroke="currentColor" strokeWidth="3" />
        {/* Hangman parts */}
        {parts}
      </svg>
    );
  };

  // Setup screen
  if (gameState === 'setup') {
    const currentCategories = settings.mode === 'beginner' ? CURATED_CATEGORIES : challengeCategories.map(c => c.id);
    const isLoading = settings.mode === 'challenge' && categoriesLoading;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-slate-900 transition-colors duration-300">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-cream-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/games" className="flex items-center gap-2 text-brown-600 dark:text-gray-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Games</span>
            </Link>
            <h1 className="text-lg font-bold text-brown-800 dark:text-white">Hangman</h1>
            <button onClick={toggleTheme} className="p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-brown-600" />}
            </button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Game Description */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                🎯
              </div>
              <div>
                <h2 className="text-xl font-bold text-brown-800 dark:text-white">Hangman</h2>
                <p className="text-sm text-brown-500 dark:text-gray-400">Guess the Chamorro word</p>
              </div>
            </div>
            <p className="text-brown-600 dark:text-gray-400 text-sm">
              See the English meaning, then guess the Chamorro word one letter at a time. 
              Complete as many words as you can before running out of guesses!
            </p>
          </div>

          {/* Mode Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              Choose Mode
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettings(s => ({ ...s, mode: 'beginner', category: 'greetings' }))}
                className={`p-4 rounded-xl text-center transition-all duration-200 ${
                  settings.mode === 'beginner'
                    ? 'bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <Sparkles className={`w-6 h-6 ${settings.mode === 'beginner' ? 'text-white' : 'text-coral-500 dark:text-ocean-400'}`} />
                </div>
                <p className={`font-medium ${settings.mode === 'beginner' ? 'text-white' : 'text-brown-800 dark:text-white'}`}>Beginner</p>
                <p className={`text-xs ${settings.mode === 'beginner' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>Common words</p>
              </button>
              <button
                onClick={() => setSettings(s => ({ ...s, mode: 'challenge', category: challengeCategories[0]?.id || 'greetings' }))}
                className={`p-4 rounded-xl text-center transition-all duration-200 ${
                  settings.mode === 'challenge'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <Trophy className={`w-6 h-6 ${settings.mode === 'challenge' ? 'text-white' : 'text-purple-500'}`} />
                </div>
                <p className={`font-medium ${settings.mode === 'challenge' ? 'text-white' : 'text-brown-800 dark:text-white'}`}>Challenge</p>
                <p className={`text-xs ${settings.mode === 'challenge' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>Full dictionary</p>
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-brown-800 dark:text-white mb-4">Select Category</h3>
            {isLoading ? (
              <div className="text-center py-4 text-brown-500 dark:text-gray-400">Loading categories...</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {currentCategories.map(catId => {
                  const icon = categoryIcons[catId] || '📚';
                  const name = categoryDisplayNames[catId] || catId;
                  // Get word count for this category
                  const wordCount = settings.mode === 'beginner' 
                    ? BEGINNER_WORD_COUNTS[catId] || 0
                    : challengeCategories.find(c => c.id === catId)?.count || 0;
                  const isDisabled = wordCount < MIN_WORDS_TO_PLAY;
                  
                  return (
                    <button
                      key={catId}
                      onClick={() => !isDisabled && setSettings(s => ({ ...s, category: catId }))}
                      disabled={isDisabled}
                      className={`p-3 rounded-xl transition-all duration-200 text-center ${
                        isDisabled
                          ? 'bg-cream-50 dark:bg-slate-900 opacity-50 cursor-not-allowed'
                          : settings.category === catId
                            ? 'bg-coral-500 dark:bg-ocean-500 text-white shadow-lg scale-105'
                            : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-xl">{icon}</span>
                      </div>
                      <p className={`text-xs font-medium mt-1 ${settings.category === catId && !isDisabled ? 'text-white' : 'text-brown-700 dark:text-gray-300'}`}>{name}</p>
                      <p className={`text-[10px] mt-0.5 ${isDisabled ? 'text-red-400' : settings.category === catId ? 'text-white/80' : 'text-brown-400 dark:text-gray-500'}`}>
                        {wordCount} word{wordCount !== 1 ? 's' : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={startGame}
            disabled={availableWords.length < MIN_WORDS_TO_PLAY || isStarting}
            className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Start Game
              </>
            )}
          </button>
          
          {/* Daily limit indicator */}
          <p className="text-center text-xs text-brown-400 dark:text-gray-500">
            Games today: {getCount('game')} / {getLimit('game') === Infinity ? '∞' : getLimit('game')}
          </p>
        </main>
        
        {showUpgradePrompt && <UpgradePrompt feature="games" onClose={() => setShowUpgradePrompt(false)} />}
      </div>
    );
  }

  // Game complete (won or lost)
  if (gameState === 'won' || gameState === 'lost') {
    const stars = getStars();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-slate-900 transition-colors duration-300">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-cream-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/games" className="flex items-center gap-2 text-brown-600 dark:text-gray-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Games</span>
            </Link>
            <h1 className="text-lg font-bold text-brown-800 dark:text-white">Hangman</h1>
            <button onClick={toggleTheme} className="p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-brown-600" />}
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-cream-200 dark:border-slate-700 shadow-lg text-center">
            <div className="text-6xl mb-4">{gameState === 'won' ? '🎉' : '😢'}</div>
            <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">
              {gameState === 'won' ? 'Great Job!' : 'Game Over!'}
            </h2>
            
            {gameState === 'lost' && (
              <p className="text-brown-600 dark:text-gray-400 mb-4">
                The word was: <span className="font-bold text-coral-500 dark:text-ocean-400">{currentWord}</span>
              </p>
            )}
            
            {/* Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map(star => (
                <span key={star} className={`text-4xl ${star <= stars ? '' : 'opacity-20'}`}>⭐</span>
              ))}
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-cream-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-brown-800 dark:text-white">{wordsCompleted}</p>
                <p className="text-sm text-brown-500 dark:text-gray-400">Words</p>
              </div>
              <div className="bg-cream-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-brown-800 dark:text-white">{totalScore}</p>
                <p className="text-sm text-brown-500 dark:text-gray-400">Score</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  hasSavedRef.current = false;
                  startGame();
                }}
                className="w-full py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <button
                onClick={() => setGameState('setup')}
                className="w-full py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-xl font-medium hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
              >
                Change Settings
              </button>
              <Link
                to="/games"
                className="block w-full py-3 bg-cream-50 dark:bg-slate-800 text-brown-600 dark:text-gray-400 rounded-xl font-medium hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
              >
                Back to Games
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Playing state
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-cream-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
                setGameState('setup');
              }
            }}
            className="flex items-center gap-2 text-brown-600 dark:text-gray-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Quit</span>
          </button>
          <div className="text-center">
            <p className="text-xs text-brown-500 dark:text-gray-400">Score</p>
            <p className="font-bold text-brown-800 dark:text-white">{totalScore}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-brown-500 dark:text-gray-400">Words</p>
            <p className="font-bold text-brown-800 dark:text-white">{wordsCompleted}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Hangman Figure */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-cream-200 dark:border-slate-700 shadow-sm flex justify-center">
          {renderHangman()}
        </div>

        {/* Lives remaining */}
        <div className="flex justify-center gap-1">
          {Array.from({ length: MAX_WRONG_GUESSES }).map((_, i) => (
            <span key={i} className={`text-2xl ${i < MAX_WRONG_GUESSES - wrongGuesses ? '' : 'opacity-20'}`}>
              ❤️
            </span>
          ))}
        </div>

        {/* Word Display */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
          {/* Hint */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <HelpCircle className="w-4 h-4 text-coral-500 dark:text-ocean-400" />
            <p className="text-brown-600 dark:text-gray-400 text-center">{currentHint}</p>
          </div>
          
          {/* Word blanks */}
          <div className="flex justify-center gap-2 flex-wrap">
            {displayWord.map((letter, index) => (
              <div
                key={index}
                className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-lg ${
                  letter === '_'
                    ? 'bg-cream-100 dark:bg-slate-700 border-2 border-dashed border-cream-300 dark:border-slate-600'
                    : isWordComplete
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-coral-100 dark:bg-ocean-900/30 text-coral-600 dark:text-ocean-400'
                }`}
              >
                {letter === '_' ? '' : letter}
              </div>
            ))}
          </div>
          
          {/* Word complete message */}
          {isWordComplete && (
            <p className="text-center text-green-600 dark:text-green-400 font-bold mt-4 animate-pulse">
              ✓ Correct! Next word...
            </p>
          )}
        </div>

        {/* Hint Button */}
        <div className="flex justify-center">
          <button
            onClick={useHint}
            disabled={isWordComplete}
            className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl font-medium flex items-center gap-2 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
          >
            <Lightbulb className="w-4 h-4" />
            Hint ({hintsUsed} used)
          </button>
        </div>

        {/* Keyboard */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-cream-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
            {CHAMORRO_ALPHABET.map(letter => {
              const isGuessed = guessedLetters.includes(letter);
              const isCorrect = isGuessed && currentWord.includes(letter);
              const isWrong = isGuessed && !currentWord.includes(letter);
              
              return (
                <button
                  key={letter}
                  onClick={() => handleGuess(letter)}
                  disabled={isGuessed || isWordComplete}
                  className={`w-8 h-10 sm:w-10 sm:h-12 rounded-lg font-bold text-sm sm:text-base transition-all ${
                    isCorrect
                      ? 'bg-green-500 text-white'
                      : isWrong
                      ? 'bg-red-400 text-white opacity-50'
                      : isGuessed
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                      : 'bg-cream-100 dark:bg-slate-700 text-brown-800 dark:text-white hover:bg-coral-100 dark:hover:bg-ocean-900/30 hover:text-coral-600 dark:hover:text-ocean-400'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Hangman;
