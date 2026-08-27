import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RotateCcw, Trophy, Timer, MousePointer2, Settings2, Play, Sparkles, BookOpen, Puzzle } from 'lucide-react';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { MemoryCard } from './games/MemoryCard';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { getCuratedConceptId } from '../data/conceptEvidence';
import { useSaveGameResult, type GameResultCreate } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { getLearningGameReturn, readLearningGameContext } from '../lib/lessonPractice';
import { GamePage, GamePageHeader } from './games/GamePage';
import { createClientAttemptId } from '../lib/clientAttemptId';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useUser();
  const { mutateAsync: saveGameResult } = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const submissionStartedRef = useRef(false);
  const playedConceptIdsRef = useRef<string[]>([]);
  const gameAttemptIdRef = useRef(createClientAttemptId());
  const { data: categoriesData, isLoading: categoriesLoading } = useVocabularyCategories();
  const { canUse, tryUse, getCount, getLimit } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const learningContext = useMemo(() => readLearningGameContext(location.search), [location.search]);
  const gameReturn = getLearningGameReturn(learningContext);
  
  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'complete'>('setup');
  const [settings, setSettings] = useState<GameSettings>({
    category: learningContext?.categoryId || 'greetings',
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
  const [pendingGameResult, setPendingGameResult] = useState<GameResultCreate | null>(null);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [resultSaveFailed, setResultSaveFailed] = useState(false);

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
    return deck.cards.map((card, cardIndex) => ({
      front: card.front,
      back: card.back,
      conceptId: getCuratedConceptId(settings.category, cardIndex),
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

  const persistGameResult = useCallback(async (payload: GameResultCreate) => {
    setPendingGameResult(payload);
    setIsSavingResult(true);
    setResultSaveFailed(false);
    try {
      await saveGameResult(payload);
      hasSavedRef.current = true;
      setPendingGameResult(null);
    } catch (error) {
      console.warn('Failed to save memory game result:', error);
      setResultSaveFailed(true);
    } finally {
      setIsSavingResult(false);
    }
  }, [saveGameResult]);

  // Check for game completion and save result
  useEffect(() => {
    if (gameState === 'playing' && matchedPairs.length === settings.pairsCount) {
      setGameState('complete');
      
      // Save result if signed in and not already saved
      if (isSignedIn && !hasSavedRef.current && !submissionStartedRef.current) {
        submissionStartedRef.current = true;
        const categoryTitle = settings.mode === 'beginner'
          ? DEFAULT_FLASHCARD_DECKS[settings.category]?.displayName
          : categoriesData?.categories.find(c => c.id === settings.category)?.title;
        
        void persistGameResult({
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
          concept_ids: playedConceptIdsRef.current,
          client_attempt_id: gameAttemptIdRef.current,
        });
      }
    }
  }, [matchedPairs.length, settings, gameState, isSignedIn, moves, elapsedTime, getFinalScore, getFinalStars, persistGameResult, categoriesData]);

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
  const handleBackClick = () => {
    if (isGameInProgress) {
      const confirmed = window.confirm('You have a game in progress. Are you sure you want to leave? Your progress will be lost.');
      if (confirmed) {
        navigate(gameReturn.to);
      }
      return;
    }
    navigate(gameReturn.to);
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
    playedConceptIdsRef.current = settings.mode === 'beginner'
      ? cardsToUse.flatMap((card) => 'conceptId' in card ? [card.conceptId] : [])
      : [];

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

  const startGame = useCallback(async () => {
    // Check usage limits before starting (only for signed-in users)
    if (isSignedIn) {
      if (!canUse('game')) {
        setShowUpgradePrompt(true);
        return;
      }
      const allowed = await tryUse('game');
      if (!allowed) {
        setShowUpgradePrompt(true);
        return;
      }
    }
    
    const newCards = generateCards();
    if (newCards.length === 0) {
      alert('Not enough words in this category. Please try another category.');
      return;
    }
    
    // Reset save flag for new game
    hasSavedRef.current = false;
    submissionStartedRef.current = false;
    gameAttemptIdRef.current = createClientAttemptId();
    setPendingGameResult(null);
    setResultSaveFailed(false);
    setIsSavingResult(false);
    
    setCards(newCards);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameState('playing');
  }, [generateCards, isSignedIn, canUse, tryUse]);

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
      <GamePage>
        <GamePageHeader title="Memory Match" subtitle="Pair Chamorro words with their meanings." icon={Puzzle} />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-coral-600 border-t-transparent dark:border-teal-500 dark:border-t-transparent" />
          <p className="text-brown-600 dark:text-gray-400">Loading games...</p>
        </div>
      </GamePage>
    );
  }

  return (
    <GamePage>
      <GamePageHeader
        title="Memory Match"
        subtitle="Pair Chamorro words with their meanings."
        icon={Puzzle}
        onBack={handleBackClick}
        trailing={gameState === 'playing' ? (
          <button
            type="button"
            onClick={() => {
              const confirmed = !isGameInProgress || window.confirm('Are you sure you want to change settings? Your progress will be lost.');
              if (confirmed) resetGame();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-700"
            aria-label="Change game settings"
          >
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : undefined}
      />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:py-8">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
            {learningContext && (
              <div className="flex items-center gap-3 rounded-xl border border-coral-200 bg-coral-50 p-3 text-left dark:border-teal-700/40 dark:bg-teal-950/20">
                <BookOpen className="h-5 w-5 flex-none text-coral-600 dark:text-teal-300" aria-hidden="true" />
                <p className="text-sm text-brown-700 dark:text-gray-200">
                  Practicing <span className="font-semibold">{learningContext.topicTitle}</span> from {learningContext.source === 'today' ? 'Today' : 'your lesson'}.
                </p>
              </div>
            )}

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
                  aria-pressed={settings.mode === 'beginner'}
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
                  aria-pressed={settings.mode === 'challenge'}
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
                Choose Topic
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose a topic">
                {availableCategories.map((catId) => (
                  <button
                    key={catId}
                    onClick={() => setSettings((s) => ({ ...s, category: catId }))}
                    aria-pressed={settings.category === catId}
                    className={`
                      min-w-20 flex-none p-2 rounded-xl text-center transition-all duration-200
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
                      aria-pressed={settings.difficulty === key}
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
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 font-bold text-white transition-colors hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
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
              <div className="flex items-center gap-1 text-coral-500 dark:text-teal-400">
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
              <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-coral-400 to-coral-600 dark:from-teal-400 dark:to-teal-600 flex items-center justify-center shadow-xl animate-bounce">
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
                  <p className="text-lg sm:text-2xl font-bold text-coral-500 dark:text-teal-400">{moves}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Moves</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-coral-500 dark:text-teal-400">{formatTime(elapsedTime)}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Time</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-coral-500 dark:text-teal-400">{calculateScore}</p>
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
            {pendingGameResult && (
              <div
                role="alert"
                className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
              >
                <p className="font-semibold">
                  {resultSaveFailed
                    ? 'Game result has not saved yet.'
                    : 'Saving your game result…'}
                </p>
                {resultSaveFailed && (
                  <button
                    type="button"
                    onClick={() => void persistGameResult(pendingGameResult)}
                    disabled={isSavingResult}
                    className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-700 px-3 py-2 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingResult ? 'Saving…' : 'Retry saving game result'}
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={playAgain}
                disabled={isSavingResult || Boolean(pendingGameResult)}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 text-xs sm:text-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Play Again
              </button>
              <button
                onClick={resetGame}
                disabled={isSavingResult || Boolean(pendingGameResult)}
                className="flex-1 py-2 px-3 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-bold hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm"
              >
                <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Settings
              </button>
            </div>

            {/* Back to Games */}
            <Link
              to={gameReturn.to}
              className="inline-block text-coral-500 dark:text-teal-400 hover:underline font-medium text-xs sm:text-sm"
            >
              {gameReturn.label}
            </Link>
          </div>
        )}
      </main>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature="game"
          onClose={() => setShowUpgradePrompt(false)}
          usageCount={getCount('game')}
          usageLimit={getLimit('game')}
        />
      )}
    </GamePage>
  );
}
