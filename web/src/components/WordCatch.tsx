import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Settings2, Play, Sparkles, BookOpen, Pause, RotateCcw } from 'lucide-react';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { Sun, Moon } from 'lucide-react';

interface GameSettings {
  category: string;
  mode: 'beginner' | 'challenge';
}

interface FlyingPair {
  id: number;
  chamorro: string;
  english: string;
  isCorrect: boolean; // true = matching pair, false = wrong pair
  x: number; // current x position (percentage)
  y: number; // current y position (percentage)
  startX: number; // starting x
  startY: number; // starting y
  endX: number; // ending x
  endY: number; // ending y
  progress: number; // 0-1 animation progress
  speed: number; // how fast it moves
  caught: boolean; // has been tapped
  missed: boolean; // went off screen without being caught
}

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

const CURATED_CATEGORIES = Object.keys(DEFAULT_FLASHCARD_DECKS);

// Game constants
const GAME_DURATION = 60; // 60 seconds per game
const SPAWN_INTERVAL_START = 3000; // ms between spawns (starts slower)
const SPAWN_INTERVAL_MIN = 1500; // ms minimum spawn interval
const PAIR_SPEED_START = 0.003; // Starting speed (much slower for playability)
const PAIR_SPEED_INCREMENT = 0.0003; // Speed increase over time (gentler)
const CORRECT_PAIR_RATIO = 0.65; // 65% of pairs are correct (slightly easier)
const MAX_LIVES = 3;

export function WordCatch() {
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const { data: categoriesData, isLoading: categoriesLoading } = useVocabularyCategories();

  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'paused' | 'complete'>('setup');
  const [settings, setSettings] = useState<GameSettings>({
    category: 'greetings',
    mode: 'beginner',
  });

  // Active game data
  const [flyingPairs, setFlyingPairs] = useState<FlyingPair[]>([]);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentSpeed, setCurrentSpeed] = useState(PAIR_SPEED_START);
  const [spawnInterval, setSpawnInterval] = useState(SPAWN_INTERVAL_START);

  // Refs
  const animationRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pairIdRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Fetch flashcards data
  const { data: flashcardsData, isLoading: flashcardsLoading } = useDictionaryFlashcards(
    settings.category,
    50,
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

  // Word pool for the game
  const wordPool = useMemo(() => {
    const sourceCards = settings.mode === 'beginner'
      ? curatedFlashcards
      : flashcardsData?.cards;

    if (!sourceCards || sourceCards.length < 4) {
      return [];
    }

    return sourceCards.map(card => ({
      chamorro: card.front,
      english: card.back,
    }));
  }, [settings.mode, curatedFlashcards, flashcardsData]);

  // Generate a flying pair
  const spawnPair = useCallback(() => {
    if (wordPool.length < 2 || gameState !== 'playing') return;

    const isCorrect = Math.random() < CORRECT_PAIR_RATIO;
    const wordIndex = Math.floor(Math.random() * wordPool.length);
    const word = wordPool[wordIndex];

    let english = word.english;
    if (!isCorrect) {
      // Pick a different word's English for wrong pair
      let wrongIndex = wordIndex;
      while (wrongIndex === wordIndex) {
        wrongIndex = Math.floor(Math.random() * wordPool.length);
      }
      english = wordPool[wrongIndex].english;
    }

    // Random start position (from edges)
    const side = Math.floor(Math.random() * 4); // 0=left, 1=right, 2=top, 3=bottom
    let startX = 0, startY = 0, endX = 0, endY = 0;

    switch (side) {
      case 0: // From left
        startX = -15;
        startY = 20 + Math.random() * 60;
        endX = 115;
        endY = 20 + Math.random() * 60;
        break;
      case 1: // From right
        startX = 115;
        startY = 20 + Math.random() * 60;
        endX = -15;
        endY = 20 + Math.random() * 60;
        break;
      case 2: // From top
        startX = 20 + Math.random() * 60;
        startY = -15;
        endX = 20 + Math.random() * 60;
        endY = 115;
        break;
      case 3: // From bottom
        startX = 20 + Math.random() * 60;
        startY = 115;
        endX = 20 + Math.random() * 60;
        endY = -15;
        break;
    }

    pairIdRef.current += 1;
    const newPair: FlyingPair = {
      id: pairIdRef.current,
      chamorro: word.chamorro,
      english,
      isCorrect,
      x: startX,
      y: startY,
      startX,
      startY,
      endX,
      endY,
      progress: 0,
      speed: currentSpeed + (Math.random() * 0.001), // Slight speed variation
      caught: false,
      missed: false,
    };

    setFlyingPairs(prev => [...prev, newPair]);
  }, [wordPool, gameState, currentSpeed]);

  // Handle tapping a pair
  const handleCatch = useCallback((pairId: number) => {
    setFlyingPairs(prev => {
      const pair = prev.find(p => p.id === pairId);
      if (!pair || pair.caught || pair.missed) return prev;

      if (pair.isCorrect) {
        // Caught a correct pair!
        const comboBonus = combo * 10;
        setScore(s => s + 100 + comboBonus);
        setCombo(c => {
          const newCombo = c + 1;
          setMaxCombo(m => Math.max(m, newCombo));
          return newCombo;
        });
        setCaught(c => c + 1);
      } else {
        // Caught a wrong pair - lose life!
        setCombo(0);
        setLives(l => {
          const newLives = l - 1;
          if (newLives <= 0) {
            setGameState('complete');
          }
          return newLives;
        });
      }

      return prev.map(p => 
        p.id === pairId ? { ...p, caught: true } : p
      );
    });
  }, [combo]);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const animate = () => {
      setFlyingPairs(prev => {
        const updated = prev.map(pair => {
          if (pair.caught || pair.missed) return pair;

          const newProgress = pair.progress + pair.speed;
          const newX = pair.startX + (pair.endX - pair.startX) * newProgress;
          const newY = pair.startY + (pair.endY - pair.startY) * newProgress;

          // Check if went off screen
          if (newProgress >= 1) {
            if (pair.isCorrect && !pair.caught) {
              // Missed a correct pair - lose combo (but not life in this version)
              setCombo(0);
              setMissed(m => m + 1);
            }
            return { ...pair, x: newX, y: newY, progress: newProgress, missed: true };
          }

          return { ...pair, x: newX, y: newY, progress: newProgress };
        });

        // Remove pairs that are off screen and processed
        return updated.filter(p => !p.missed || p.progress < 1.1);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState]);

  // Spawn timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawn = () => {
      spawnPair();
      // Schedule next spawn
      spawnTimerRef.current = setTimeout(spawn, spawnInterval);
    };

    // Initial spawn
    spawnTimerRef.current = setTimeout(spawn, 500);

    return () => {
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    };
  }, [gameState, spawnInterval, spawnPair]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('complete');
          return 0;
        }
        return prev - 1;
      });

      // Gradually increase difficulty (very gentle)
      setCurrentSpeed(s => Math.min(s + 0.00005, PAIR_SPEED_START + 0.003));
      setSpawnInterval(i => Math.max(i - 15, SPAWN_INTERVAL_MIN));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Save game result when complete
  useEffect(() => {
    if (gameState === 'complete' && isSignedIn && !hasSavedRef.current && caught > 0) {
      hasSavedRef.current = true;
      const stars = caught >= 20 ? 3 : caught >= 10 ? 2 : 1;
      saveGameResultMutation.mutate({
        game_type: 'word_catch',
        mode: settings.mode,
        category_id: settings.category,
        score,
        moves: caught,
        pairs: maxCombo,
        time_seconds: GAME_DURATION - timeLeft,
        stars,
      });
    }
  }, [gameState, isSignedIn, caught, score, maxCombo, timeLeft, settings, saveGameResultMutation]);

  // Start game
  const startGame = useCallback(() => {
    if (wordPool.length < 4) {
      alert('Not enough words in this category. Please try another category.');
      return;
    }
    hasSavedRef.current = false;
    setLives(MAX_LIVES);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCaught(0);
    setMissed(0);
    setTimeLeft(GAME_DURATION);
    setCurrentSpeed(PAIR_SPEED_START);
    setSpawnInterval(SPAWN_INTERVAL_START);
    setFlyingPairs([]);
    setGameState('playing');
  }, [wordPool]);

  // Reset to setup
  const resetGame = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (spawnTimerRef.current) {
      clearTimeout(spawnTimerRef.current);
    }
    setGameState('setup');
    setFlyingPairs([]);
  };

  // Play again
  const playAgain = () => {
    startGame();
  };

  // Pause/Resume
  const togglePause = () => {
    if (gameState === 'playing') {
      setGameState('paused');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  };

  // Calculate stars
  const getStars = () => {
    if (caught >= 20) return 3;
    if (caught >= 10) return 2;
    return 1;
  };

  const isLoading = settings.mode === 'challenge' ? flashcardsLoading : false;
  const hasEnoughWords = wordPool.length >= 4;

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
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/games"
              onClick={(e) => {
                if (gameState === 'playing') {
                  e.preventDefault();
                  if (window.confirm('Leave game? Your progress will be lost.')) {
                    resetGame();
                    window.location.href = '/games';
                  }
                }
              }}
              className="p-1.5 sm:p-2 -ml-1 rounded-xl hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-brown-800 dark:text-white">
                Word Catch
              </h1>
              <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">
                {settings.mode === 'beginner' ? '🌟 Beginner' : '📚 Challenge'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {gameState === 'playing' && (
              <button
                onClick={togglePause}
                className="p-1.5 sm:p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
              >
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-brown-600 dark:text-gray-300" />
              </button>
            )}
            {(gameState === 'playing' || gameState === 'paused') && (
              <button
                onClick={() => {
                  if (window.confirm('Restart game? Your progress will be lost.')) {
                    resetGame();
                  }
                }}
                className="p-1.5 sm:p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
              >
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-brown-600 dark:text-gray-300" />
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
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

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
            {/* Game Title */}
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-ocean-900/50 dark:to-ocean-800/50 mb-2 sm:mb-3 shadow-xl animate-bounce">
                <span className="text-3xl sm:text-5xl">🗡️</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-brown-800 dark:text-white mb-1">
                Word Catch
              </h2>
              <p className="text-brown-600 dark:text-gray-400 text-sm">
                Catch matching word pairs! Avoid the wrong ones!
              </p>
            </div>

            {/* Mode Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">Choose Mode</h3>
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
                  <Sparkles className={`w-5 h-5 mx-auto mb-1 ${settings.mode === 'beginner' ? 'text-white' : 'text-amber-500'}`} />
                  <span className="text-xs sm:text-sm font-bold block">Beginner</span>
                  <span className={`text-[9px] sm:text-[10px] ${settings.mode === 'beginner' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>Common phrases</span>
                </button>
                <button
                  onClick={() => setSettings((s) => ({ ...s, mode: 'challenge' }))}
                  className={`
                    p-2 sm:p-3 rounded-xl text-center transition-all duration-200
                    ${settings.mode === 'challenge'
                      ? 'bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white shadow-lg scale-[1.02]'
                      : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }
                  `}
                >
                  <BookOpen className={`w-5 h-5 mx-auto mb-1 ${settings.mode === 'challenge' ? 'text-white' : 'text-coral-500 dark:text-ocean-400'}`} />
                  <span className="text-xs sm:text-sm font-bold block">Challenge</span>
                  <span className={`text-[9px] sm:text-[10px] ${settings.mode === 'challenge' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>Full dictionary</span>
                </button>
              </div>
            </div>

            {/* Category Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">Choose Category</h3>
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
                    <span className="text-base sm:text-lg block">{categoryIcons[catId] || '📚'}</span>
                    <span className="text-[8px] sm:text-[10px] font-medium capitalize leading-tight block mt-0.5">
                      {categoryDisplayNames[catId] || catId}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* How to Play */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">How to Play</h3>
              <ul className="space-y-1.5 text-xs text-brown-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span> Tap <strong className="text-green-600 dark:text-green-400">GREEN</strong> pairs (matching!)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">❌</span> Avoid <strong className="text-red-600 dark:text-red-400">RED</strong> pairs (wrong match!)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-500">⚡</span> Build combos for bonus points
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-coral-500 dark:text-ocean-400">⏱️</span> 60 seconds - catch as many as you can!
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              disabled={isLoading || !hasEnoughWords}
              className="w-full py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : !hasEnoughWords ? (
                'Not enough words'
              ) : (
                <>
                  <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                  Start Game
                </>
              )}
            </button>
          </div>
        )}

        {/* Playing Screen */}
        {(gameState === 'playing' || gameState === 'paused') && (
          <div className="relative">
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-cream-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {/* Lives */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: MAX_LIVES }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-5 h-5 sm:w-6 sm:h-6 ${
                        i < lives ? 'text-red-500 fill-red-500' : 'text-brown-200 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-coral-500 dark:text-ocean-400">{score}</p>
                  <p className="text-[10px] text-brown-500 dark:text-gray-400">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">{combo}🔥</p>
                  <p className="text-[10px] text-brown-500 dark:text-gray-400">Combo</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg sm:text-xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-brown-800 dark:text-white'}`}>
                    {timeLeft}s
                  </p>
                  <p className="text-[10px] text-brown-500 dark:text-gray-400">Time</p>
                </div>
              </div>
            </div>

            {/* Game Area */}
            <div 
              ref={gameAreaRef}
              className="relative bg-gradient-to-b from-cream-100 to-cream-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-cream-300 dark:border-slate-600 h-[55vh] sm:h-[60vh] overflow-hidden shadow-inner"
            >
              {/* Flying Pairs */}
              {flyingPairs.map(pair => (
                <button
                  key={pair.id}
                  onClick={() => handleCatch(pair.id)}
                  disabled={pair.caught || pair.missed}
                  className={`
                    absolute transform -translate-x-1/2 -translate-y-1/2
                    px-3 sm:px-4 py-2 sm:py-3 rounded-xl
                    font-bold text-xs sm:text-sm text-center
                    shadow-lg transition-all duration-150
                    ${pair.caught
                      ? pair.isCorrect
                        ? 'bg-green-500 text-white scale-125 opacity-0'
                        : 'bg-red-500 text-white scale-125 opacity-0'
                      : pair.isCorrect
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-2 border-green-400 dark:border-green-600 hover:scale-110 active:scale-95'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-2 border-red-400 dark:border-red-600 hover:scale-110 active:scale-95'
                    }
                  `}
                  style={{
                    left: `${pair.x}%`,
                    top: `${pair.y}%`,
                    transition: pair.caught ? 'all 0.3s ease-out' : 'transform 0.1s',
                  }}
                >
                  <div className="whitespace-nowrap">
                    <span className="block font-bold">{pair.chamorro}</span>
                    <span className="block text-[10px] sm:text-xs opacity-80">= {pair.english}</span>
                  </div>
                </button>
              ))}

              {/* Paused Overlay */}
              {gameState === 'paused' && (
                <div className="absolute inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-10">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-4">Paused</p>
                    <button
                      onClick={togglePause}
                      className="px-6 py-3 rounded-xl bg-coral-500 dark:bg-ocean-500 text-white font-bold hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors"
                    >
                      Resume
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions overlay (first few seconds) */}
              {timeLeft >= GAME_DURATION - 3 && gameState === 'playing' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 text-white px-6 py-4 rounded-2xl text-center animate-pulse">
                    <p className="text-lg font-bold">Tap the GREEN pairs! 💚</p>
                    <p className="text-sm opacity-80">Avoid the RED ones! ❌</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete Screen */}
        {gameState === 'complete' && (
          <div className="max-w-sm mx-auto text-center space-y-4 sm:space-y-6">
            {/* Game Over */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-br from-coral-100 to-coral-200 dark:from-ocean-900/50 dark:to-ocean-800/50 flex items-center justify-center shadow-xl">
                <span className="text-4xl sm:text-5xl">
                  {caught >= 20 ? '🏆' : caught >= 10 ? '⭐' : '👍'}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-1">
                {timeLeft === 0 ? "Time's Up!" : 'Game Over!'}
              </h2>
              <p className="text-brown-600 dark:text-gray-400">
                You caught {caught} correct pairs!
              </p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-3xl sm:text-4xl ${i < getStars() ? 'animate-bounce' : 'opacity-30'}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  ⭐
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-cream-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-coral-500 dark:text-ocean-400">{score}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Score</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">{caught}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Caught</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">{maxCombo}🔥</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Max Combo</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={playAgain}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                Play Again
              </button>
              <button
                onClick={resetGame}
                className="flex-1 py-3 px-4 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-bold hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Settings
              </button>
            </div>

            <Link
              to="/games"
              className="inline-block text-coral-500 dark:text-ocean-400 hover:text-coral-600 dark:hover:text-ocean-300 hover:underline font-medium text-sm"
            >
              ← Back to Games
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

