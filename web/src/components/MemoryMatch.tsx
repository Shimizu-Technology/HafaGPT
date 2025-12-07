import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Timer, MousePointer2, Sun, Moon, Settings2, Play, Sparkles, BookOpen } from 'lucide-react';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { useTheme } from '../hooks/useTheme';
import { MemoryCard } from './games/MemoryCard';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';

interface Card {
  id: number;
  pairId: number;
  content: string;
  type: 'chamorro' | 'english';
}

interface GameSettings {
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  pairsCount: number;
  mode: 'beginner' | 'challenge';
}

const DIFFICULTY_CONFIG = {
  easy: { pairs: 4, label: 'Easy (4 pairs)' },
  medium: { pairs: 6, label: 'Medium (6 pairs)' },
  hard: { pairs: 8, label: 'Hard (8 pairs)' },
};

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

// Display names for categories (short versions for buttons)
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

export function MemoryMatch() {
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
    difficulty: 'easy',
    pairsCount: DIFFICULTY_CONFIG.easy.pairs,
    mode: 'beginner',
  });
  
  // Playing state
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Only fetch dictionary flashcards in challenge mode
  const { data: flashcardsData, isLoading: flashcardsLoading } = useDictionaryFlashcards(
    settings.category,
    20,
    true,
    settings.mode === 'challenge' // Only enable when in challenge mode
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

  // Check how many cards are available for current category
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

  // Calculate final score (same as calculateScore but for immediate use)
  const getFinalScore = useCallback(() => {
    const baseScore = settings.pairsCount * 100;
    const movesPenalty = Math.max(0, (moves - settings.pairsCount) * 10);
    const timePenalty = Math.max(0, Math.floor(elapsedTime / 10) * 5);
    return Math.max(0, baseScore - movesPenalty - timePenalty);
  }, [settings.pairsCount, moves, elapsedTime]);

  // Calculate stars (same as getStars but for immediate use)
  const getFinalStars = useCallback(() => {
    const efficiency = settings.pairsCount / moves;
    if (efficiency >= 0.8) return 3;
    if (efficiency >= 0.5) return 2;
    return 1;
  }, [settings.pairsCount, moves]);

  // Check for game completion and save result
  useEffect(() => {
    if (gameState === 'playing' && matchedPairs.length === settings.pairsCount) {
      setGameState('complete');
      
      // Save result if signed in and not already saved
      if (isSignedIn && !hasSavedRef.current) {
        hasSavedRef.current = true;
        
        const categoryTitle = settings.mode === 'beginner'
          ? DEFAULT_FLASHCARD_DECKS[settings.category]?.displayName
          : categoriesData?.categories.find(c => c.id === settings.category)?.title;
        
        saveGameResultMutation.mutate({
          game_type: 'memory_match',
          mode: settings.mode,
          category_id: settings.category,
          category_title: categoryTitle || settings.category,
          difficulty: settings.difficulty,
          score: getFinalScore(),
          moves: moves,
          pairs: settings.pairsCount,
          time_seconds: elapsedTime,
          stars: getFinalStars(),
        });
      }
    }
  }, [matchedPairs.length, settings, gameState, isSignedIn, moves, elapsedTime, getFinalScore, getFinalStars, saveGameResultMutation, categoriesData]);

  // Browser warning when leaving mid-game (like quizzes)
  const isGameInProgress = gameState === 'playing' && moves > 0;
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGameInProgress) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGameInProgress]);

  // Handle back navigation with confirmation
  const handleBackClick = (e: React.MouseEvent) => {
    if (isGameInProgress) {
      e.preventDefault();
      const confirmed = window.confirm('You have a game in progress. Are you sure you want to leave? Your progress will be lost.');
      if (confirmed) {
        navigate('/games');
      }
    }
  };

  // Generate cards from flashcards
  const generateCards = useCallback(() => {
    const sourceCards = settings.mode === 'beginner' 
      ? curatedFlashcards 
      : flashcardsData?.cards;

    if (!sourceCards || sourceCards.length < settings.pairsCount) {
      console.error('Not enough flashcards to generate cards');
      return [];
    }

    // For beginner mode, shuffle the curated cards
    // For challenge mode, they're already shuffled by the API
    const shuffledSource = settings.mode === 'beginner'
      ? [...sourceCards].sort(() => Math.random() - 0.5)
      : sourceCards;

    // Take the required number of cards
    const cardsToUse = shuffledSource.slice(0, settings.pairsCount);

    return createCardPairs(cardsToUse);
  }, [settings.mode, settings.pairsCount, curatedFlashcards, flashcardsData]);

  // Helper to create card pairs from flashcards
  const createCardPairs = (flashcards: { front: string; back: string }[]) => {
    const cardPairs: Card[] = [];
    
    flashcards.forEach((flashcard, index) => {
      // Chamorro card (front) - keep full text
      cardPairs.push({
        id: index * 2,
        pairId: index,
        content: flashcard.front,
        type: 'chamorro',
      });
      
      // English card (back) - keep full text
      cardPairs.push({
        id: index * 2 + 1,
        pairId: index,
        content: flashcard.back,
        type: 'english',
      });
    });

    // Shuffle all cards
    return cardPairs.sort(() => Math.random() - 0.5);
  };

  const startGame = useCallback(() => {
    const newCards = generateCards();
    if (newCards.length === 0) {
      alert('Not enough words in this category. Please try another category.');
      return;
    }
    
    // Reset save flag for new game
    hasSavedRef.current = false;
    
    setCards(newCards);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameState('playing');
  }, [generateCards]);

  const handleCardClick = useCallback((cardId: number) => {
    if (isChecking || flippedCards.length >= 2) return;
    if (flippedCards.includes(cardId)) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setIsChecking(true);
      setMoves((m) => m + 1);

      const [first, second] = newFlipped;
      const firstCard = cards.find((c) => c.id === first);
      const secondCard = cards.find((c) => c.id === second);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match found
        setTimeout(() => {
          setMatchedPairs((prev) => [...prev, firstCard.pairId]);
          setFlippedCards([]);
          setIsChecking(false);
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [flippedCards, cards, isChecking]);

  const resetGame = () => {
    setGameState('setup');
    setCards([]);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setStartTime(null);
    setElapsedTime(0);
  };

  const playAgain = () => {
    startGame();
  };

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate score
  const calculateScore = useMemo(() => {
    if (gameState !== 'complete') return 0;
    const baseScore = settings.pairsCount * 100;
    const movesPenalty = Math.max(0, (moves - settings.pairsCount) * 10);
    const timePenalty = Math.max(0, Math.floor(elapsedTime / 10) * 5);
    return Math.max(0, baseScore - movesPenalty - timePenalty);
  }, [gameState, settings.pairsCount, moves, elapsedTime]);

  // Star rating based on moves efficiency
  const getStars = useMemo(() => {
    const efficiency = settings.pairsCount / moves;
    if (efficiency >= 0.8) return 3;
    if (efficiency >= 0.5) return 2;
    return 1;
  }, [settings.pairsCount, moves]);

  // Check if ready to start
  const isLoading = settings.mode === 'challenge' ? flashcardsLoading : false;
  const hasEnoughCards = availableCardCount >= settings.pairsCount;

  // Loading state
  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-coral-500 dark:border-ocean-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              to="/games" 
              onClick={handleBackClick}
              className="p-1.5 sm:p-2 -ml-1 rounded-xl hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              aria-label="Go back to games"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-brown-800 dark:text-white">
                Memory Match
              </h1>
              <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">
                {settings.mode === 'beginner' ? '🌟 Beginner' : '📚 Challenge'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {gameState === 'playing' && (
              <button
                onClick={() => {
                  if (isGameInProgress) {
                    const confirmed = window.confirm('Are you sure you want to change settings? Your progress will be lost.');
                    if (confirmed) resetGame();
                  } else {
                    resetGame();
                  }
                }}
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
            {/* Game Title - Compact */}
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-ocean-900/50 dark:to-ocean-800/50 mb-1 sm:mb-2 shadow-lg">
                <span className="text-xl sm:text-3xl">🧩</span>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-brown-800 dark:text-white">
                Memory Match
              </h2>
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
                        ? 'bg-coral-500 dark:bg-ocean-500 text-white shadow-lg scale-105'
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

            {/* Difficulty Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">
                Choose Difficulty
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(DIFFICULTY_CONFIG) as [keyof typeof DIFFICULTY_CONFIG, typeof DIFFICULTY_CONFIG.easy][]).map(([key, config]) => {
                  const isDisabled = availableCardCount < config.pairs;
                  return (
                    <button
                      key={key}
                      onClick={() => !isDisabled && setSettings((s) => ({ 
                        ...s, 
                        difficulty: key as 'easy' | 'medium' | 'hard',
                        pairsCount: config.pairs,
                      }))}
                      disabled={isDisabled}
                      className={`
                        p-2 rounded-xl text-center transition-all duration-200
                        ${isDisabled 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                          : settings.difficulty === key
                            ? 'bg-coral-500 dark:bg-ocean-500 text-white shadow-lg scale-105'
                            : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-base sm:text-lg">
                          {key === 'easy' ? '🌱' : key === 'medium' ? '🌿' : '🌳'}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium capitalize">{key}</span>
                      <span className={`text-[9px] sm:text-[10px] block ${
                        settings.difficulty === key && !isDisabled ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'
                      }`}>
                        {config.pairs} pairs
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Show card count warning */}
              {availableCardCount > 0 && availableCardCount < 8 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 text-center">
                  This category has {availableCardCount} cards available
                </p>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              disabled={isLoading || !hasEnoughCards}
              className="w-full py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        {gameState === 'playing' && (
          <div className="space-y-2">
            {/* Stats Bar - Compact */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-2 shadow-lg border border-cream-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-brown-600 dark:text-gray-300">
                  <MousePointer2 className="w-3 h-3" />
                  <span className="font-bold text-xs">{moves}</span>
                </div>
                <div className="flex items-center gap-1 text-brown-600 dark:text-gray-300">
                  <Timer className="w-3 h-3" />
                  <span className="font-bold text-xs">{formatTime(elapsedTime)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-coral-500 dark:text-ocean-400">
                <Trophy className="w-3 h-3" />
                <span className="font-bold text-xs">{matchedPairs.length}/{settings.pairsCount}</span>
              </div>
            </div>

            {/* Game Grid - Square cards, compact for mobile, bigger on desktop */}
            <div className="grid grid-cols-4 gap-1 sm:gap-3 w-full max-w-[320px] sm:max-w-lg md:max-w-xl mx-auto">
              {cards.map((card) => (
                <MemoryCard
                  key={card.id}
                  id={card.id}
                  content={card.content}
                  type={card.type}
                  isFlipped={flippedCards.includes(card.id)}
                  isMatched={matchedPairs.includes(card.pairId)}
                  onClick={handleCardClick}
                  disabled={isChecking}
                />
              ))}
            </div>

            {/* Quick Actions - Compact */}
            <div className="flex justify-center pt-1">
              <button
                onClick={playAgain}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Restart
              </button>
            </div>
          </div>
        )}

        {/* Complete Screen */}
        {gameState === 'complete' && (
          <div className="max-w-sm mx-auto text-center space-y-3 sm:space-y-4">
            {/* Celebration */}
            <div className="relative">
              <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600 flex items-center justify-center shadow-xl animate-bounce">
                <span className="text-2xl sm:text-4xl">🎉</span>
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white mb-1">
                Håfa Adai!
              </h2>
              <p className="text-xs sm:text-sm text-brown-600 dark:text-gray-400">
                Great job completing the game!
              </p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-1">
              {[1, 2, 3].map((star) => (
                <span
                  key={star}
                  className={`text-xl sm:text-3xl ${
                    star <= getStars ? 'opacity-100' : 'opacity-30 grayscale'
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
                  <p className="text-lg sm:text-2xl font-bold text-coral-500 dark:text-ocean-400">{moves}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Moves</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-coral-500 dark:text-ocean-400">{formatTime(elapsedTime)}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Time</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-coral-500 dark:text-ocean-400">{calculateScore}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Score</p>
                </div>
              </div>
            </div>

            {/* Encouragement */}
            <p className="text-xs text-brown-600 dark:text-gray-400">
              {getStars === 3 
                ? "Perfect! You're a memory master! 🌟" 
                : getStars === 2 
                  ? "Great work! Try again for 3 stars! 💪"
                  : "Good effort! Practice makes perfect! 🌱"
              }
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={playAgain}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 text-xs sm:text-sm"
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
              className="inline-block text-coral-500 dark:text-ocean-400 hover:underline font-medium text-xs sm:text-sm"
            >
              ← Back to Games
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
