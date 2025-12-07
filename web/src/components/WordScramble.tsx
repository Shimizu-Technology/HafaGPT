import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Timer, Lightbulb, Sun, Moon, Settings2, Play, Sparkles, BookOpen, Check, X, ArrowRight, Shuffle } from 'lucide-react';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';

interface GameSettings {
  category: string;
  mode: 'beginner' | 'challenge';
  wordsPerRound: number;
}

interface WordData {
  chamorro: string;
  english: string;
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

export function WordScramble() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const { data: categoriesData, isLoading: categoriesLoading } = useVocabularyCategories();
  
  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'complete'>('setup');
  const [settings, setSettings] = useState<GameSettings>({
    category: 'greetings',
    mode: 'beginner',
    wordsPerRound: 5,
  });
  
  // Playing state
  const [words, setWords] = useState<WordData[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<number[]>([]); // indices of selected letters
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  // Only fetch dictionary flashcards in challenge mode
  const { data: flashcardsData, isLoading: flashcardsLoading } = useDictionaryFlashcards(
    settings.category,
    20,
    true,
    settings.mode === 'challenge'
  );

  // Get curated flashcards for beginner mode
  const curatedFlashcards = useMemo(() => {
    if (settings.mode !== 'beginner') return null;
    const deck = DEFAULT_FLASHCARD_DECKS[settings.category];
    if (!deck) return null;
    return deck.cards.map(card => ({
      front: card.front,
      back: card.back,
    }));
  }, [settings.category, settings.mode]);

  // Available categories based on mode
  const availableCategories = useMemo(() => {
    if (settings.mode === 'beginner') {
      return CURATED_CATEGORIES;
    }
    return categoriesData?.categories.map(c => c.id) || [];
  }, [settings.mode, categoriesData]);

  // Check how many cards are available
  const availableCardCount = useMemo(() => {
    if (settings.mode === 'beginner') {
      return curatedFlashcards?.length || 0;
    }
    return flashcardsData?.cards?.length || 0;
  }, [settings.mode, curatedFlashcards, flashcardsData]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  // Scramble a word
  const scrambleWord = useCallback((word: string): string[] => {
    const letters = word.toUpperCase().split('');
    // Fisher-Yates shuffle
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    // Make sure it's actually scrambled (not the same as original)
    if (letters.join('') === word.toUpperCase() && letters.length > 1) {
      return scrambleWord(word);
    }
    return letters;
  }, []);

  // Set up current word
  useEffect(() => {
    if (gameState === 'playing' && words.length > 0 && currentWordIndex < words.length) {
      const currentWord = words[currentWordIndex];
      setScrambledLetters(scrambleWord(currentWord.chamorro));
      setSelectedLetters([]);
      setShowHint(false);
      setFeedback(null);
    }
  }, [gameState, words, currentWordIndex, scrambleWord]);

  // Calculate final score and stars
  const getFinalScore = useCallback(() => {
    const baseScore = correctAnswers * 100;
    const streakBonus = streak * 25;
    const speedBonus = Math.max(0, 300 - elapsedTime) * 2;
    return baseScore + streakBonus + speedBonus;
  }, [correctAnswers, streak, elapsedTime]);

  const getFinalStars = useCallback(() => {
    const percentage = (correctAnswers / settings.wordsPerRound) * 100;
    if (percentage >= 80) return 3;
    if (percentage >= 60) return 2;
    return 1;
  }, [correctAnswers, settings.wordsPerRound]);

  // Check for game completion
  useEffect(() => {
    if (gameState === 'playing' && currentWordIndex >= settings.wordsPerRound) {
      setGameState('complete');
      
      // Save result if signed in
      if (isSignedIn && !hasSavedRef.current) {
        hasSavedRef.current = true;
        
        const categoryTitle = settings.mode === 'beginner'
          ? DEFAULT_FLASHCARD_DECKS[settings.category]?.displayName
          : categoriesData?.categories.find(c => c.id === settings.category)?.title;
        
        saveGameResultMutation.mutate({
          game_type: 'word_scramble',
          mode: settings.mode,
          category_id: settings.category,
          category_title: categoryTitle || settings.category,
          difficulty: 'medium',
          score: getFinalScore(),
          moves: currentWordIndex,
          pairs: correctAnswers,
          time_seconds: elapsedTime,
          stars: getFinalStars(),
        });
      }
    }
  }, [currentWordIndex, settings, gameState, isSignedIn, correctAnswers, elapsedTime, getFinalScore, getFinalStars, saveGameResultMutation, categoriesData]);

  // Generate words for the game
  const generateWords = useCallback((): WordData[] => {
    const sourceCards = settings.mode === 'beginner' 
      ? curatedFlashcards 
      : flashcardsData?.cards;

    if (!sourceCards || sourceCards.length < settings.wordsPerRound) {
      console.error('Not enough words');
      return [];
    }

    // Shuffle and pick words
    const shuffled = [...sourceCards].sort(() => Math.random() - 0.5);
    
    // Filter out very short words (less than 3 chars) for better gameplay
    const filtered = shuffled.filter(card => card.front.length >= 3);
    
    return filtered.slice(0, settings.wordsPerRound).map(card => ({
      chamorro: card.front,
      english: card.back,
    }));
  }, [settings.mode, settings.wordsPerRound, curatedFlashcards, flashcardsData]);

  const startGame = useCallback(() => {
    const newWords = generateWords();
    if (newWords.length === 0) {
      alert('Not enough words in this category. Please try another.');
      return;
    }
    
    hasSavedRef.current = false;
    setWords(newWords);
    setCurrentWordIndex(0);
    setScore(0);
    setStreak(0);
    setCorrectAnswers(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameState('playing');
  }, [generateWords]);

  // Handle letter selection
  const handleLetterClick = (index: number) => {
    if (feedback) return; // Don't allow changes during feedback
    
    if (selectedLetters.includes(index)) {
      // Deselect letter
      setSelectedLetters(prev => prev.filter(i => i !== index));
    } else {
      // Select letter
      setSelectedLetters(prev => [...prev, index]);
    }
  };

  // Get the current answer from selected letters
  const currentAnswer = useMemo(() => {
    return selectedLetters.map(i => scrambledLetters[i]).join('');
  }, [selectedLetters, scrambledLetters]);

  // Check if answer is correct
  const checkAnswer = useCallback(() => {
    const currentWord = words[currentWordIndex];
    const isCorrect = currentAnswer.toUpperCase() === currentWord.chamorro.toUpperCase();
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      setScore(prev => prev + 100 + (streak * 25));
      setStreak(prev => prev + 1);
      setCorrectAnswers(prev => prev + 1);
    } else {
      setStreak(0);
    }
    
    // Move to next word after delay
    setTimeout(() => {
      setCurrentWordIndex(prev => prev + 1);
    }, 1500);
  }, [currentAnswer, words, currentWordIndex, streak]);

  // Skip current word
  const skipWord = () => {
    setStreak(0);
    setFeedback('incorrect');
    setTimeout(() => {
      setCurrentWordIndex(prev => prev + 1);
    }, 1000);
  };

  // Reshuffle current letters
  const reshuffleLetters = () => {
    if (feedback) return;
    const currentWord = words[currentWordIndex];
    setScrambledLetters(scrambleWord(currentWord.chamorro));
    setSelectedLetters([]);
  };

  const resetGame = () => {
    setGameState('setup');
    setWords([]);
    setCurrentWordIndex(0);
    setScore(0);
    setStreak(0);
    setCorrectAnswers(0);
    setStartTime(null);
    setElapsedTime(0);
  };

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if ready to start
  const isLoading = settings.mode === 'challenge' ? flashcardsLoading : false;
  const hasEnoughCards = availableCardCount >= settings.wordsPerRound;

  // Loading state
  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-coral-500 dark:border-ocean-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentWordIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              to="/games" 
              className="p-1.5 sm:p-2 -ml-1 rounded-xl hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              aria-label="Go back to games"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-brown-800 dark:text-white">
                Word Scramble
              </h1>
              <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">
                {settings.mode === 'beginner' ? '🌟 Beginner' : '📚 Challenge'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {gameState === 'playing' && (
              <button
                onClick={resetGame}
                className="p-1.5 sm:p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
                aria-label="Change settings"
              >
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-brown-600 dark:text-gray-300" />
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-brown-600" />
              ) : (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
            {/* Game Title */}
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 mb-1 sm:mb-2 shadow-lg">
                <span className="text-xl sm:text-3xl">🔤</span>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-brown-800 dark:text-white">
                Word Scramble
              </h2>
              <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400 mt-1">
                Unscramble the letters to spell Chamorro words!
              </p>
            </div>

            {/* Mode Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">
                Choose Mode
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSettings((s) => ({ 
                    ...s, 
                    mode: 'beginner',
                    category: CURATED_CATEGORIES.includes(s.category) ? s.category : 'greetings'
                  }))}
                  className={`
                    p-2 sm:p-3 rounded-xl text-center transition-all duration-200
                    ${settings.mode === 'beginner'
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg scale-[1.02]'
                      : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }
                  `}
                >
                  <div className="flex items-center justify-center mb-1">
                    <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${settings.mode === 'beginner' ? 'text-white' : 'text-amber-500'}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold block">Beginner</span>
                  <span className={`text-[9px] sm:text-[10px] ${settings.mode === 'beginner' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>
                    Common phrases
                  </span>
                </button>
                <button
                  onClick={() => setSettings((s) => ({ ...s, mode: 'challenge' }))}
                  className={`
                    p-2 sm:p-3 rounded-xl text-center transition-all duration-200
                    ${settings.mode === 'challenge'
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-[1.02]'
                      : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }
                  `}
                >
                  <div className="flex items-center justify-center mb-1">
                    <BookOpen className={`w-4 h-4 sm:w-5 sm:h-5 ${settings.mode === 'challenge' ? 'text-white' : 'text-purple-500'}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold block">Challenge</span>
                  <span className={`text-[9px] sm:text-[10px] ${settings.mode === 'challenge' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>
                    Full dictionary
                  </span>
                </button>
              </div>
            </div>

            {/* Category Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">
                Choose Category
              </h3>
              <div className="grid grid-cols-4 gap-1.5">
                {availableCategories.map((catId) => (
                  <button
                    key={catId}
                    onClick={() => setSettings((s) => ({ ...s, category: catId }))}
                    className={`
                      p-1.5 sm:p-2 rounded-xl text-center transition-all duration-200
                      ${settings.category === catId
                        ? 'bg-purple-500 dark:bg-purple-600 text-white shadow-lg scale-105'
                        : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                      }
                    `}
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-base sm:text-lg">
                        {categoryIcons[catId] || '📚'}
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-medium leading-tight block mt-0.5">
                      {categoryDisplayNames[catId] || catId}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Words Per Round */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">
                Words Per Round
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {[5, 10, 15].map((count) => {
                  const isDisabled = availableCardCount < count;
                  return (
                    <button
                      key={count}
                      onClick={() => !isDisabled && setSettings((s) => ({ ...s, wordsPerRound: count }))}
                      disabled={isDisabled}
                      className={`
                        p-2 rounded-xl text-center transition-all duration-200
                        ${isDisabled 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                          : settings.wordsPerRound === count
                            ? 'bg-purple-500 dark:bg-purple-600 text-white shadow-lg scale-105'
                            : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                        }
                      `}
                    >
                      <span className="text-lg sm:text-xl font-bold">{count}</span>
                      <span className={`text-[9px] sm:text-[10px] block ${
                        settings.wordsPerRound === count && !isDisabled ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'
                      }`}>
                        words
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              disabled={isLoading || !hasEnoughCards}
              className="w-full py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : !hasEnoughCards ? (
                'Not enough words in this category'
              ) : (
                <>
                  <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                  Start Game
                </>
              )}
            </button>
          </div>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && currentWord && (
          <div className="max-w-lg mx-auto space-y-3 sm:space-y-4">
            {/* Progress & Stats Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-2 sm:p-3 shadow-lg border border-cream-200 dark:border-slate-700">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                    {currentWordIndex + 1}/{settings.wordsPerRound}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Word</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
                    {score}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Score</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-brown-600 dark:text-gray-300">
                <Timer className="w-4 h-4" />
                <span className="font-bold text-sm">{formatTime(elapsedTime)}</span>
              </div>
            </div>

            {/* Streak indicator */}
            {streak > 1 && (
              <div className="text-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-bold">
                  🔥 {streak} streak!
                </span>
              </div>
            )}

            {/* Hint (English meaning) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-cream-200 dark:border-slate-700 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-brown-500 dark:text-gray-400 uppercase tracking-wide">
                  English Meaning
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">
                {currentWord.english}
              </p>
              {showHint && (
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
                  First letter: <span className="font-bold">{currentWord.chamorro[0].toUpperCase()}</span>
                </p>
              )}
            </div>

            {/* Scrambled Letters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-cream-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-brown-500 dark:text-gray-400 uppercase tracking-wide">
                  Tap letters to spell the word
                </span>
                <button
                  onClick={reshuffleLetters}
                  disabled={!!feedback}
                  className="p-1.5 rounded-lg hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  aria-label="Reshuffle letters"
                >
                  <Shuffle className="w-4 h-4 text-brown-500 dark:text-gray-400" />
                </button>
              </div>
              
              {/* Letter tiles */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {scrambledLetters.map((letter, index) => {
                  const isSelected = selectedLetters.includes(index);
                  const selectionOrder = selectedLetters.indexOf(index);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleLetterClick(index)}
                      disabled={!!feedback}
                      className={`
                        relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl font-bold text-xl sm:text-2xl
                        transition-all duration-200 transform
                        ${isSelected
                          ? 'bg-purple-500 text-white scale-95 shadow-inner'
                          : 'bg-gradient-to-br from-cream-100 to-cream-200 dark:from-slate-700 dark:to-slate-600 text-brown-800 dark:text-white shadow-md hover:scale-105 active:scale-95'
                        }
                        ${feedback === 'correct' && isSelected ? 'bg-green-500' : ''}
                        ${feedback === 'incorrect' && isSelected ? 'bg-red-500' : ''}
                        disabled:cursor-not-allowed
                      `}
                    >
                      {letter}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold flex items-center justify-center shadow-sm">
                          {selectionOrder + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Answer Display */}
            <div className={`
              bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border-2 transition-all duration-300
              ${feedback === 'correct' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
              ${feedback === 'incorrect' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
              ${!feedback ? 'border-cream-200 dark:border-slate-700' : ''}
            `}>
              <p className="text-xs font-medium text-brown-500 dark:text-gray-400 uppercase tracking-wide text-center mb-2">
                Your Answer
              </p>
              <div className="min-h-[48px] flex items-center justify-center">
                {currentAnswer ? (
                  <p className={`text-2xl sm:text-3xl font-bold tracking-wider ${
                    feedback === 'correct' ? 'text-green-600 dark:text-green-400' :
                    feedback === 'incorrect' ? 'text-red-600 dark:text-red-400' :
                    'text-brown-800 dark:text-white'
                  }`}>
                    {currentAnswer}
                  </p>
                ) : (
                  <p className="text-brown-400 dark:text-gray-500 text-lg">
                    Tap letters above...
                  </p>
                )}
              </div>
              
              {/* Feedback */}
              {feedback && (
                <div className={`mt-3 text-center ${
                  feedback === 'correct' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  <div className="flex items-center justify-center gap-2">
                    {feedback === 'correct' ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span className="font-bold">Correct! +{100 + (streak > 1 ? (streak - 1) * 25 : 0)} pts</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5" />
                        <span className="font-bold">The answer was: {currentWord.chamorro}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!showHint && !feedback && (
                <button
                  onClick={() => setShowHint(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                >
                  <Lightbulb className="w-4 h-4" />
                  Hint
                </button>
              )}
              
              {!feedback && currentAnswer.length === scrambledLetters.length && (
                <button
                  onClick={checkAnswer}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                >
                  <Check className="w-4 h-4" />
                  Check
                </button>
              )}
              
              {!feedback && (
                <button
                  onClick={skipWord}
                  className="py-2.5 px-4 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  Skip
                </button>
              )}
            </div>
          </div>
        )}

        {/* Complete Screen */}
        {gameState === 'complete' && (
          <div className="max-w-sm mx-auto text-center space-y-3 sm:space-y-4">
            {/* Celebration */}
            <div className="relative">
              <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-700 flex items-center justify-center shadow-xl animate-bounce">
                <span className="text-2xl sm:text-4xl">🎉</span>
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white mb-1">
                Great Job!
              </h2>
              <p className="text-xs sm:text-sm text-brown-600 dark:text-gray-400">
                You completed the word scramble!
              </p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-1">
              {[1, 2, 3].map((star) => (
                <span
                  key={star}
                  className={`text-xl sm:text-3xl ${
                    star <= getFinalStars() ? 'opacity-100' : 'opacity-30 grayscale'
                  }`}
                >
                  ⭐
                </span>
              ))}
            </div>

            {/* Stats Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-lg border border-cream-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-purple-500 dark:text-purple-400">
                    {correctAnswers}/{settings.wordsPerRound}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Correct</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-purple-500 dark:text-purple-400">
                    {formatTime(elapsedTime)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Time</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-purple-500 dark:text-purple-400">
                    {getFinalScore()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Score</p>
                </div>
              </div>
            </div>

            {/* Encouragement */}
            <p className="text-xs text-brown-600 dark:text-gray-400">
              {getFinalStars() === 3 
                ? "Perfect! You're a spelling master! 🌟" 
                : getFinalStars() === 2 
                  ? "Great work! Try again for 3 stars! 💪"
                  : "Good effort! Practice makes perfect! 🌱"
              }
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={startGame}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 text-xs sm:text-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Play Again
              </button>
              <button
                onClick={resetGame}
                className="flex-1 py-2 px-3 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-bold hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm"
              >
                <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Settings
              </button>
            </div>

            {/* Back to Games */}
            <Link
              to="/games"
              className="inline-block text-purple-500 dark:text-purple-400 hover:underline font-medium text-xs sm:text-sm"
            >
              ← Back to Games
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

